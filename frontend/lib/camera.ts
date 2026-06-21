/**
 * Global Shared Camera Manager
 *
 * Problem: Windows only allows ONE exclusive getUserMedia() lock per camera.
 * When the meeting page grabs the camera, the attendance page fails with
 * NotReadableError, and vice-versa.
 *
 * Solution: A singleton that calls getUserMedia() exactly ONCE and hands out
 * the same MediaStream to every caller. Multiple <video> elements can all
 * display the same MediaStream simultaneously with no hardware conflicts.
 */

export type CameraStatus = 'IDLE' | 'OPENING' | 'ACTIVE' | 'BUSY_EXTERNAL' | 'PERMISSION_DENIED' | 'NOT_FOUND';
export type CameraConsumer = 'meeting' | 'attendance' | string;

interface CameraManagerState {
    stream: MediaStream | null;
    promise: Promise<MediaStream> | null;
    consumers: Set<CameraConsumer>;
    statusListeners: Array<(status: CameraStatus, message?: string) => void>;
    lastRequestTime: number;
    isOpeningLocally: boolean;
    remoteTabState: 'IDLE' | 'OPENING' | 'IN_USE';
    remoteTabName: string;
    availableDevices: MediaDeviceInfo[];
    currentDeviceIndex: number;
    currentStatus: CameraStatus;
}

const state: CameraManagerState = {
    stream: null,
    promise: null,
    consumers: new Set(),
    statusListeners: [],
    lastRequestTime: 0,
    isOpeningLocally: false,
    remoteTabState: 'IDLE',
    remoteTabName: '',
    availableDevices: [],
    currentDeviceIndex: 0,
    currentStatus: 'IDLE',
};

const bus = typeof window !== 'undefined' ? new BroadcastChannel('camera_manager_bus') : null;

if (bus) {
    bus.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'QUERY_USE') {
            if (state.stream && state.stream.active) {
                bus.postMessage({ type: 'IN_USE', payload: { consumer: Array.from(state.consumers)[0] || 'active' } });
            } else if (state.isOpeningLocally) {
                bus.postMessage({ type: 'OPENING', payload: { consumer: Array.from(state.consumers)[0] || 'opening' } });
            }
        } else if (type === 'IN_USE') {
            state.remoteTabState = 'IN_USE';
            state.remoteTabName = payload.consumer;
        } else if (type === 'OPENING') {
            state.remoteTabState = 'OPENING';
            state.remoteTabName = payload.consumer;
        } else if (type === 'RELEASING') {
            state.remoteTabState = 'IDLE';
            state.remoteTabName = '';
            // If we were waiting for others to release, notify listeners
            if (state.currentStatus === 'BUSY_EXTERNAL') {
                setStatus('IDLE');
            }
        } else if (type === 'FORCE_STOP_CMD') {
            console.log('[CameraManager] ⚠️  Remote tab requested camera takeover. Releasing hardware.');
            forceStopCameraInternally();
        } else if (type === 'FORCE_RESET_CMD') {
            forceStopCameraInternally();
        }
    };
}

const queryOtherTabs = () => {
    if (bus) {
        state.remoteTabState = 'IDLE';
        bus.postMessage({ type: 'QUERY_USE' });
    }
};

function setStatus(status: CameraStatus, msg?: string) {
    state.currentStatus = status;
    state.statusListeners.forEach(l => l(status, msg));
}

export function subscribeToCameraStatus(callback: (status: CameraStatus, msg?: string) => void) {
    state.statusListeners.push(callback);
    callback(state.currentStatus); // Initial call
    return () => {
        state.statusListeners = state.statusListeners.filter(l => l !== callback);
    };
}

async function refreshDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        state.availableDevices = devices.filter(d => d.kind === 'videoinput');
    } catch (e) {
        console.warn('[CameraManager] Failed to list devices:', e);
    }
}

function forceStopCameraInternally(): void {
    state.stream?.getTracks().forEach(t => t.stop());
    state.stream = null;
    state.promise = null;
    state.isOpeningLocally = false;
    state.consumers.clear();
    setStatus('IDLE');
    console.log('[CameraManager] 🛑 Force stopped internally');
}

/**
 * Acquire the shared camera stream.
 */
export async function acquireCamera(
    consumerId: CameraConsumer,
    options: { video?: boolean; audio?: boolean } = { video: true, audio: true }
): Promise<MediaStream> {
    state.consumers.add(consumerId);

    // 1. Check local reuse first
    if (state.stream && state.stream.active) {
        console.log(`[CameraManager] ♻️  Reusing existing stream for "${consumerId}"`);
        setStatus('ACTIVE');
        return state.stream;
    }
    if (state.promise) {
        console.log(`[CameraManager] ⏳ Joining in-flight getUserMedia for "${consumerId}"`);
        return state.promise;
    }

    // 2. Query other tabs to prevent hardware clashes
    queryOtherTabs();
    await new Promise(r => setTimeout(r, 250)); // Wait for bus heartbeat

    if (state.remoteTabState === 'IN_USE' || state.remoteTabState === 'OPENING') {
        const msg = `Camera is busy in another tab (${state.remoteTabName}).`;
        setStatus('BUSY_EXTERNAL', msg);
        const error = new Error(msg) as any;
        error.name = 'TabConflictError';
        throw error;
    }

    // 3. Negotiate with hardware
    console.log(`[CameraManager] 🎥 Opening camera for "${consumerId}" (audio:${!!options.audio})...`);
    state.isOpeningLocally = true;
    setStatus('OPENING');
    bus?.postMessage({ type: 'OPENING', payload: { consumer: consumerId } });

    state.promise = (async () => {
        await refreshDevices();

        let lastErr: any;
        const maxGlobalAttempts = 5; // Reduced from 30 to prevent long hangs

        for (let globalAttempt = 0; globalAttempt < maxGlobalAttempts; globalAttempt++) {
            // Check cross-tab conflict again in the loop
            if (state.remoteTabState === 'IN_USE') {
                console.log(`[CameraManager] 🚩 Tab collision detected with "${state.remoteTabName}". Waiting for reuse.`);
                setStatus('BUSY_EXTERNAL', `Locked by ${state.remoteTabName}`);
                await new Promise(r => setTimeout(r, 1000));
                if (state.stream && state.stream.active) return state.stream;
                continue;
            }

            const constraintSets: MediaStreamConstraints[] = [];

            // Fast fallback strategy
            if (options.audio) {
                constraintSets.push({ video: { facingMode: 'user' }, audio: true });
            }
            constraintSets.push({ video: { facingMode: 'user' }, audio: false });
            constraintSets.push({ video: true, audio: false });

            for (let i = 0; i < constraintSets.length; i++) {
                const constraints = constraintSets[i];
                try {
                    // Prevent rapid-fire getUserMedia calls that Windows locks on
                    const now = Date.now();
                    const wait = Math.max(0, 800 - (now - state.lastRequestTime));
                    if (wait > 0) await new Promise(r => setTimeout(r, wait));
                    state.lastRequestTime = Date.now();

                    // Timeout getUserMedia call itself in case of hardware hang
                    const stream = await Promise.race([
                        navigator.mediaDevices.getUserMedia(constraints),
                        new Promise((_, j) => setTimeout(() => j(new Error('GUM_TIMEOUT')), 5000))
                    ]) as MediaStream;

                    state.stream = stream;
                    state.promise = null;
                    state.isOpeningLocally = false;

                    setStatus('ACTIVE');
                    bus?.postMessage({ type: 'IN_USE', payload: { consumer: consumerId } });
                    return stream;
                } catch (err: any) {
                    lastErr = err;
                    if (err.message === 'GUM_TIMEOUT') {
                        console.warn('[CameraManager] ⌛ Hardware timed out. Trying fallback constraints...');
                        continue;
                    }
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setStatus('PERMISSION_DENIED');
                        throw err;
                    }
                }
            }

            if (lastErr?.name === 'NotReadableError') {
                setStatus('BUSY_EXTERNAL', 'Hardware busy. Retrying in 2s...');
            }

            await new Promise(r => setTimeout(r, 2000));
            await refreshDevices();
        }

        state.promise = null;
        state.stream = null;
        state.isOpeningLocally = false;
        throw lastErr;
    })();

    return state.promise;
}

/**
 * Release this consumer's claim on the camera.
 */
export function releaseCamera(consumerId: CameraConsumer): void {
    state.consumers.delete(consumerId);
    if (state.consumers.size === 0) {
        state.stream?.getTracks().forEach(t => t.stop());
        state.stream = null;
        state.promise = null;
        setStatus('IDLE');
        bus?.postMessage({ type: 'RELEASING' });
    }
}

/**
 * Emergency cleanup.
 */
export function forceStopCamera(): void {
    state.stream?.getTracks().forEach(t => t.stop());
    state.stream = null;
    state.promise = null;
    state.consumers.clear();
    setStatus('IDLE');
    bus?.postMessage({ type: 'RELEASING' });
}

/**
 * Sends a command to other tabs to stop their camera usage.
 */
export function requestCameraTakeover(): void {
    console.log('[CameraManager] 📢 Broadcasting takeover request...');
    bus?.postMessage({ type: 'FORCE_STOP_CMD' });
    // Aggressively reset local state to allow new attempts
    state.remoteTabState = 'IDLE';
    state.remoteTabName = '';
    setStatus('IDLE');
}

export function getCurrentStream(): MediaStream | null {
    return state.stream && state.stream.active ? state.stream : null;
}
