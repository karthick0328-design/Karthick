'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Video, PhoneOff, Loader2, Shield, Copy, CheckCheck, AlertCircle, Settings,
    MicOff, CameraOff, UserMinus, MessageSquare, ShieldAlert, X,
    Megaphone, Send, Lock, Unlock, Users, Search, Hand, Smile,
    Maximize, Minimize, Image as ImageIcon, Wind, Sparkles, Volume2, ArrowRight,
    ClipboardCheck, UserCheck, UserX, UserPlus
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    useLocalParticipant,
    useParticipants,
    useRoomContext,
    useChat,
    ParticipantContext,
    TrackReference,
    useTrackRefContext,
    useTracks
} from '@livekit/components-react';
import {
    LocalVideoTrack,
    LocalAudioTrack,
    Track,
    Participant,
    DataPacket_Kind,
    RoomEvent,
    ConnectionState
} from 'livekit-client';
import {
    ControlBar,
    TrackLoop,
    ParticipantTile,
    LayoutContextProvider,
    FocusLayout,
    GridLayout,
    TrackRefContext
} from '@livekit/components-react';
import '@livekit/components-styles';
import { subscribeToCameraStatus, requestCameraTakeover, CameraStatus, acquireCamera, releaseCamera } from '@/lib/camera';

// Optional: Background & noise processors (browser-side only)
let BackgroundBlur: any;
let VirtualBackground: any;
let KrispNoiseFilter: any;
let krispProcessorInstance: any = null;

if (typeof window !== 'undefined') {
    import('@livekit/track-processors').then(module => {
        BackgroundBlur = module.BackgroundBlur;
        VirtualBackground = module.VirtualBackground;
    });
    import('@livekit/krisp-noise-filter').then(module => {
        KrispNoiseFilter = module.KrispNoiseFilter;
    });
}

interface AttendanceMember {
    user: {
        _id: string;
        name: string;
        uniqueId: string;
        role: string;
        email?: string;
    };
    status: 'present' | 'absent' | 'pending';
    markedAt?: string;
    markedBy?: string;
}

interface MeetingData {
    _id: string;
    title: string;
    description: string;
    startTime: string;
    endTime?: string;
    meetingCode: string;
    meetingLink: string;
    status: string;
    service?: string;
    department?: string;
    managerId: string | { _id: string; name?: string; email?: string };
    participants?: (string | { _id: string; name?: string; email?: string })[];
    attendance?: AttendanceMember[];
    isRecording?: boolean;
}

const REACTIONS = ['👍', '👏', '❤️', '🔥', '😮', '🎉'];

export default function MeetingRoom() {
    const params = useParams();
    const router = useRouter();
    const code = params?.code as string;

    const [meeting, setMeeting] = useState<MeetingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string>('');
    const [serverUrl, setServerUrl] = useState<string>('');
    const [error, setError] = useState('');
    const [joined, setJoined] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [showSetupGuide, setShowSetupGuide] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('IDLE');
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const isJoiningRef = useRef(false);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchMeeting = async () => {
        try {
            const authToken = localStorage.getItem('token');
            const res = await axios.get(`${backendUrl}/api/meetings/${code}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.data.success) {
                setMeeting(res.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Meeting not found');
        } finally {
            setLoading(false);
        }
    };

    const fetchTokenAndJoin = async () => {
        if (isJoiningRef.current) return;
        isJoiningRef.current = true;
        setIsJoining(true);

        try {
            const authToken = localStorage.getItem('token');
            const res = await axios.get(`${backendUrl}/api/meetings/token/${code}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (res.data.isDemo && !res.data.token) {
                setShowSetupGuide(true);
                setIsJoining(false);
                isJoiningRef.current = false;
                return;
            }

            if (res.data.success) {
                acquireCamera('meeting', { video: true, audio: true })
                    .then(stream => {
                        const videoTrack = stream.getVideoTracks()[0];
                        const audioTrack = stream.getAudioTracks()[0];
                        if (videoTrack) setLocalVideoTrack(videoTrack);
                        if (audioTrack) setLocalAudioTrack(audioTrack);
                    })
                    .catch(() => { });

                setToken(res.data.token);
                setServerUrl(res.data.serverUrl);
                setJoined(true);
                setShowSetupGuide(false);
                setConnectionError(null);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to get meeting token';
            toast.error(msg);
            setError(msg);
        } finally {
            setIsJoining(false);
            isJoiningRef.current = false;
        }
    };

    const handleRoomError = (err: Error) => {
        if (err.name === 'NotReadableError' || err.message.includes('video source')) {
            toast.error('Camera is already in use.');
            setCameraStatus('BUSY_EXTERNAL');
            return;
        }
        if (err.message.includes('connect') || err.message.includes('fetch') || err.message.includes('auth')) {
            setConnectionError(err.message);
            setShowSetupGuide(true);
        } else {
            toast.error(`Meeting warning: ${err.message}`);
        }
    };

    const handleTakeover = async () => {
        requestCameraTakeover();
        toast.loading('Requesting camera takeover...', { duration: 1500 });
        // Give other tabs time to stop and release the Bus
        setTimeout(() => {
            setCameraStatus('IDLE');
            fetchTokenAndJoin();
        }, 1500);
    };

    const copyCode = () => {
        if (meeting?.meetingCode) {
            navigator.clipboard.writeText(meeting.meetingCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    useEffect(() => {
        if (code) fetchMeeting();
        const unsubscribe = subscribeToCameraStatus((status) => setCameraStatus(status));
        return () => unsubscribe();
    }, [code]);

    if (loading) return <div className="h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="text-indigo-500 animate-spin" size={48} /></div>;
    if (error) return <div className="h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6 text-center"><Shield size={64} className="text-rose-500 mb-4" /> <h2 className="text-2xl font-bold">{error}</h2><button onClick={() => router.back()} className="mt-8 px-8 py-3 bg-white text-black rounded-2xl font-bold">Go Back</button></div>;

    if (showSetupGuide) {
        return (
            <div className="h-screen bg-gray-950 flex items-center justify-center p-8 overflow-y-auto">
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 max-w-2xl w-full space-y-8 shadow-2xl my-8 text-white">
                    <div className="flex items-center gap-4">
                        <Settings className="text-amber-500" size={32} />
                        <h1 className="text-2xl font-black">LiveKit Setup Required</h1>
                    </div>
                    <p className="text-gray-400">{connectionError || 'No running video server detected. Verify your LIVEKIT configuration.'}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setShowSetupGuide(false)} className="py-4 border border-white/10 rounded-2xl">Back</button>
                        <button onClick={() => fetchTokenAndJoin()} className="py-4 bg-white text-black rounded-2xl font-black">Try Again</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!joined) {
        return (
            <div className="h-screen bg-gray-950 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent)] text-white">
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-12 max-w-md w-full text-center space-y-10 shadow-2xl relative">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto"><Video size={40} /></div>
                    <div>
                        <h1 className="text-3xl font-black">{meeting?.title}</h1>
                        <p className="text-gray-400">{meeting?.description}</p>
                    </div>
                    <div className="bg-black/60 rounded-2xl p-5 flex items-center justify-between border border-white/10">
                        <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Passcode</span>
                            <span className="text-white font-mono font-bold text-xl">{meeting?.meetingCode}</span>
                        </div>
                        <button onClick={copyCode} className="p-3 bg-white/5 rounded-2xl">
                            {codeCopied ? <CheckCheck className="text-emerald-400" size={20} /> : <Copy className="text-indigo-400" size={20} />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => router.back()} className="py-4 font-bold text-gray-400">Back</button>
                        <button onClick={fetchTokenAndJoin} disabled={isJoining} className="py-4 rounded-2xl font-black bg-indigo-600 flex items-center justify-center gap-2">
                            {isJoining ? <Loader2 className="animate-spin" size={20} /> : <>Join Now <ArrowRight size={18} /></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black overflow-hidden flex flex-col relative font-sans text-slate-200">
            <LiveKitRoom
                video={false}
                audio={false}
                token={token}
                serverUrl={serverUrl}
                onDisconnected={() => {
                    setJoined(false);
                    releaseCamera('meeting');
                    setLocalVideoTrack(null);
                    setLocalAudioTrack(null);
                }}
                onError={handleRoomError}
                data-lk-theme="default"
                className="flex-1 flex flex-col"
            >
                <LayoutContextProvider>
                    <CameraPublisher videoTrack={localVideoTrack} audioTrack={localAudioTrack} />
                    <MeetingUI meetingData={meeting} onLeave={() => setJoined(false)} />
                </LayoutContextProvider>
            </LiveKitRoom>

            {cameraStatus === 'BUSY_EXTERNAL' && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-[100] backdrop-blur-sm text-white">
                    <AlertCircle className="text-amber-500 mb-6" size={48} />
                    <h3 className="text-2xl font-black mb-3">Camera Occupied</h3>
                    <button onClick={handleTakeover} className="px-8 py-3 bg-white text-black font-black rounded-2xl">Try Takeover</button>
                </div>
            )}
        </div>
    );
}

function MeetingUI({ meetingData, onLeave }: { meetingData: MeetingData | null, onLeave: () => void }) {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const [sidebarTab, setSidebarTab] = useState<'participants' | 'chat' | 'effects' | 'attendance' | null>(null);
    const [isEnding, setIsEnding] = useState(false);
    const [chatDisabled, setChatDisabled] = useState(false);
    const [privateTarget, setPrivateTarget] = useState<Participant | null>(null);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [reactions, setReactions] = useState<{ id: number, emoji: string, from: string }[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeEffects, setActiveEffects] = useState({ blur: false, virtualBg: null as string | null, noiseCancellation: false });
    const [isRecording, setIsRecording] = useState(false);
    const [recordingLoading, setRecordingLoading] = useState(false);
    const [uploadingRecording, setUploadingRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        if (!meetingData) return;
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const currentUserId = payload.id || payload._id;
                const managerIdStr = typeof meetingData.managerId === 'string'
                    ? meetingData.managerId
                    : meetingData.managerId?._id;

                setIsHost(managerIdStr === currentUserId || localParticipant.permissions?.canUpdateMetadata || false);
            } catch (e) {
                setIsHost(localParticipant.permissions?.canUpdateMetadata || false);
            }
        } else {
            setIsHost(localParticipant.permissions?.canUpdateMetadata || false);
        }
    }, [meetingData, localParticipant.permissions]);

    useEffect(() => {
        const handleData = (payload: Uint8Array) => {
            try {
                const data = JSON.parse(new TextDecoder().decode(payload));
                if (data.type === 'reaction') {
                    const id = Date.now();
                    setReactions(prev => [...prev.slice(-10), { id, emoji: data.emoji, from: data.from }]);
                    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 4000);
                }
                if (data.type === 'mute_request' && data.target === localParticipant.identity) {
                    toast(`Host requested you to ${data.track === 'camera' ? 'stop video' : 'mute'}`);
                }
                if (data.type === 'chat_status' && !isHost) {
                    setChatDisabled(data.disabled);
                    toast.error(data.disabled ? 'Chat disabled by host' : 'Chat enabled by host');
                }
                if (data.type === 'announcement') {
                    toast.success(`📢 ANNOUNCEMENT: ${data.message}`, { duration: 6000 });
                }
                if (data.type === 'recording_status') {
                    setIsRecording(data.isRecording);
                    toast.success(data.isRecording ? 'Meeting recording started' : 'Meeting recording stopped');
                }
                if (data.type === 'unmute_request' && data.target === localParticipant.identity) {
                    toast((t: any) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-bold">Host requested you to speak. Unmute?</span>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    // Use track publications to unmute
                                    localParticipant.audioTrackPublications.forEach(p => {
                                        if (p.track) (p.track as any).setEnabled(true);
                                    });
                                    toast.dismiss(t.id);
                                }} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs">Unmute</button>
                                <button onClick={() => toast.dismiss(t.id)} className="bg-slate-700 text-white px-3 py-1 rounded-lg text-xs">Ignore</button>
                            </div>
                        </div>
                    ), { duration: 10000 });
                }
            } catch (e) {
                console.warn('[Meeting] Failed to handle incoming data:', e);
            }
        };
        room.on('dataReceived', handleData);
        return () => { room.off('dataReceived', handleData); };
    }, [room, localParticipant.identity, isHost]);

    // Handle Metadata Changes (Raise Hand)
    useEffect(() => {
        const handleParticipantUpdate = (metadata: string | undefined, participant: Participant) => {
            try {
                const parsedMetadata = metadata ? JSON.parse(metadata) : {};
                if (participant.identity === localParticipant.identity) {
                    setIsHandRaised(!!parsedMetadata.raisedHand);
                }
            } catch (e) { }
        };
        room.on(RoomEvent.ParticipantMetadataChanged, handleParticipantUpdate);
        return () => { room.off(RoomEvent.ParticipantMetadataChanged, handleParticipantUpdate); };
    }, [room, localParticipant.identity]);

    const toggleHand = async () => {
        try {
            const newState = !isHandRaised;
            await localParticipant.setMetadata(JSON.stringify({ raisedHand: newState }));
            setIsHandRaised(newState);
            if (newState) toast.success('Hand raised ✋');
        } catch (err: any) {
            console.error('Failed to update metadata:', err);
            toast.error(err.message || 'Failed to update status');
        }
    };

    const sendReaction = (emoji: string) => {
        const packet = JSON.stringify({ type: 'reaction', emoji, from: localParticipant.name || 'User' });
        room.localParticipant.publishData(new TextEncoder().encode(packet), { reliable: true });
        // Also show locally
        const id = Date.now();
        setReactions(prev => [...prev.slice(-10), { id, emoji, from: 'You' }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 4000);
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const [currentMeetingData, setCurrentMeetingData] = useState<MeetingData | null>(meetingData);

    useEffect(() => {
        setCurrentMeetingData(meetingData);
    }, [meetingData]);

    const refreshMeetingData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingData?.meetingCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setCurrentMeetingData(res.data.data);
            }
        } catch (e) {
            console.error('Failed to refresh meeting data');
        }
    };

    const handleEndMeeting = async () => {
        if (!confirm('End meeting for everyone?')) return;
        setIsEnding(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/end/${meetingData?.meetingCode}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onLeave();
        } catch {
            toast.error('Failed to end meeting');
        } finally {
            setIsEnding(false);
        }
    };

    const toggleChatLock = () => {
        const newState = !chatDisabled;
        setChatDisabled(newState);
        room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'chat_status', disabled: newState })), { reliable: true });
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            // ── STOP RECORDING ─────────────────────────────────────────────
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop(); // triggers onstop
            }
        } else {
            // ── START RECORDING ────────────────────────────────────────────
            setRecordingLoading(true);
            try {
                // Ask user to pick a screen / browser tab to capture
                const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
                    video: { mediaSource: 'screen', cursor: 'always' },
                    audio: { echoCancellation: true, noiseSuppression: true }
                });

                // Also try to mix in the local mic audio
                let combinedStream = displayStream;
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioContext = new AudioContext();
                    const dest = audioContext.createMediaStreamDestination();
                    audioContext.createMediaStreamSource(displayStream).connect(dest);
                    audioContext.createMediaStreamSource(micStream).connect(dest);
                    combinedStream = new MediaStream([
                        ...displayStream.getVideoTracks(),
                        ...dest.stream.getAudioTracks()
                    ]);
                } catch {
                    // mic unavailable, record screen audio only
                }

                recordingChunksRef.current = [];
                recordingStartTimeRef.current = Date.now();

                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                    ? 'video/webm;codecs=vp9,opus'
                    : MediaRecorder.isTypeSupported('video/webm')
                        ? 'video/webm'
                        : 'video/mp4';

                const recorder = new MediaRecorder(combinedStream, { mimeType });
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
                };

                recorder.onstop = async () => {
                    // Stop all tracks
                    combinedStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
                    displayStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

                    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
                    const durationMs = Date.now() - recordingStartTimeRef.current;

                    // Instant browser download
                    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                    const fileName = `meeting-${meetingData?.meetingCode}-${Date.now()}.${ext}`;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    toast.success('Recording downloaded! Uploading to server…');

                    // Upload to backend
                    setUploadingRecording(true);
                    try {
                        const authToken = localStorage.getItem('token');
                        const res = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/recording/upload/${meetingData?.meetingCode}?durationMs=${durationMs}`,
                            {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${authToken}`,
                                    'Content-Type': mimeType,
                                },
                                body: blob,
                            }
                        );
                        const data = await res.json();
                        if (data.success) {
                            toast.success('Recording saved to server ✅');
                        } else {
                            toast.error(`Upload failed: ${data.message}`);
                        }
                    } catch (uploadErr) {
                        console.error('Upload failed:', uploadErr);
                        toast.error('Could not upload recording to server — file was still downloaded.');
                    } finally {
                        setUploadingRecording(false);
                    }

                    setIsRecording(false);
                    // Notify other participants
                    room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'recording_status', isRecording: false })), { reliable: true });
                };

                // Stop recording when the user stops sharing the screen
                displayStream.getVideoTracks()[0].onended = () => {
                    if (mediaRecorderRef.current?.state !== 'inactive') {
                        mediaRecorderRef.current?.stop();
                    }
                };

                recorder.start(1000); // collect chunks every 1s
                setIsRecording(true);
                room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'recording_status', isRecording: true })), { reliable: true });
                toast.success('🔴 Recording started — capturing your screen');
            } catch (err: any) {
                if (err.name === 'NotAllowedError') {
                    toast.error('Screen share permission denied. Recording cancelled.');
                } else {
                    toast.error('Could not start recording: ' + err.message);
                }
            } finally {
                setRecordingLoading(false);
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
            <header className="h-16 px-6 bg-slate-900 border-b border-white/5 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                        <Video size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="font-black text-sm text-white truncate max-w-[200px]">{meetingData?.title}</h2>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Live • {room.name}</span>
                    </div>
                </div>

                {/* Floating Reactions Display */}
                <div className="absolute top-20 right-8 space-y-2 pointer-events-none z-50">
                    {reactions.map(r => (
                        <div key={r.id} className="animate-bounce flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-lg shadow-2xl">
                            {r.emoji} <span className="text-[10px] font-black text-slate-400">{r.from}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 rounded-xl p-1 mr-2">
                        {REACTIONS.map(emoji => (
                            <button key={emoji} onClick={() => sendReaction(emoji)} className="p-1 px-2 hover:bg-white/10 rounded-lg text-lg transition-transform hover:scale-125 active:scale-95">{emoji}</button>
                        ))}
                    </div>
                    <button onClick={toggleHand} className={`p-2.5 rounded-xl transition-all ${isHandRaised ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Raise Hand">
                        <Hand size={20} className={isHandRaised ? 'animate-pulse' : ''} />
                    </button>
                    <button onClick={() => setSidebarTab(sidebarTab === 'effects' ? null : 'effects')} className={`p-2.5 rounded-xl transition-all ${sidebarTab === 'effects' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Filters & Effects">
                        <Sparkles size={20} />
                    </button>
                    <button onClick={() => setSidebarTab(sidebarTab === 'attendance' ? null : 'attendance')} className={`p-2.5 rounded-xl transition-all ${sidebarTab === 'attendance' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`} title="Attendance"><ClipboardCheck size={20} /></button>
                    <button onClick={() => setSidebarTab(sidebarTab === 'participants' ? null : 'participants')} className={`p-2.5 rounded-xl transition-all ${sidebarTab === 'participants' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><Users size={20} /></button>
                    <button onClick={() => setSidebarTab(sidebarTab === 'chat' ? null : 'chat')} className={`p-2.5 rounded-xl transition-all ${sidebarTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><MessageSquare size={20} /></button>
                    <button onClick={handleFullscreen} className="p-2.5 bg-white/5 text-slate-400 hover:text-white rounded-xl">
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                    {isHost && (
                        <button
                            onClick={handleToggleRecording}
                            disabled={recordingLoading || uploadingRecording}
                            title={isRecording ? 'Stop recording and save file' : 'Start browser-based screen recording'}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${uploadingRecording ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' :
                                isRecording ? 'bg-rose-600/20 text-rose-500 border border-rose-500/30 shadow-lg shadow-rose-500/10' :
                                    'bg-white/5 text-slate-400 hover:text-white'
                                }`}
                        >
                            {recordingLoading || uploadingRecording
                                ? <Loader2 className="animate-spin" size={16} />
                                : <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
                            }
                            {uploadingRecording ? 'UPLOADING…' : isRecording ? 'STOP REC' : 'RECORD'}
                        </button>
                    )}
                    {isHost && (
                        <button onClick={handleEndMeeting} disabled={isEnding} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all">
                            {isEnding ? 'ENDING...' : 'END FOR ALL'}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 bg-black relative shadow-inner overflow-hidden flex flex-col">
                    <div className="flex-1 relative">
                        <GridLayout tracks={tracks}>
                            <ParticipantTile />
                        </GridLayout>
                    </div>
                    <div className="h-20 bg-slate-900/50 backdrop-blur-md border-t border-white/5 flex items-center justify-center gap-4 px-6">
                        <ControlBar variation="minimal" controls={{ leave: false, chat: false, screenShare: true, settings: true }} />
                        <div className="w-px h-8 bg-white/10 mx-2" />
                        <AudioVisualizer participant={localParticipant} />
                    </div>
                    <RoomAudioRenderer />
                </main>
                {sidebarTab && (
                    <div className="w-[380px] bg-slate-900 border-l border-white/10 flex flex-col z-30 animate-in slide-in-from-right duration-300">
                        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-black text-xs uppercase tracking-widest text-white">{sidebarTab} Mode</h3>
                            <button onClick={() => setSidebarTab(null)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {sidebarTab === 'participants' ? (
                                <ParticipantList isHost={isHost} onPrivateMessage={(p) => { setPrivateTarget(p); setSidebarTab('chat'); }} />
                            ) : sidebarTab === 'effects' ? (
                                <EffectsPanel activeEffects={activeEffects} setActiveEffects={setActiveEffects} />
                            ) : sidebarTab === 'attendance' ? (
                                <AttendanceList
                                    attendance={currentMeetingData?.attendance || []}
                                    isHost={isHost}
                                    meetingCode={meetingData?.meetingCode || ''}
                                    onRefresh={refreshMeetingData}
                                />
                            ) : (
                                <ChatPanel isHost={isHost} chatDisabled={chatDisabled} onToggleLock={toggleChatLock} privateTarget={privateTarget} onClearPrivate={() => setPrivateTarget(null)} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AudioVisualizer({ participant }: { participant: Participant }) {
    const [audioLevel, setAudioLevel] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setAudioLevel(participant.audioLevel * 100);
        }, 100);
        return () => clearInterval(interval);
    }, [participant]);

    return (
        <div className="flex items-end gap-[2px] h-6 w-12 bg-black/40 backdrop-blur-sm rounded-lg p-1.5 border border-white/5 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                    key={i}
                    className="flex-1 bg-emerald-500 rounded-[1px] transition-all duration-75"
                    style={{ height: `${Math.max(15, Math.min(100, audioLevel * (i * 0.3)))}%` }}
                />
            ))}
        </div>
    );
}

function EffectsPanel({ activeEffects, setActiveEffects }: { activeEffects: any, setActiveEffects: (e: any) => void }) {
    const { localParticipant } = useLocalParticipant();
    const videoTrack = Array.from((localParticipant as any).videoTrackPublications?.values() || [])
        .map((p: any) => p.track)
        .find(t => t && t.source === Track.Source.Camera) as LocalVideoTrack;

    const toggleBlur = async () => {
        if (!BackgroundBlur) return toast.error('Blur processor loading...');
        const newState = !activeEffects.blur;
        try {
            if (newState) {
                const processor = BackgroundBlur(10);
                await videoTrack.setProcessor(processor);
            } else {
                await videoTrack.stopProcessor();
            }
            setActiveEffects({ ...activeEffects, blur: newState, virtualBg: null });
        } catch (e) { toast.error('Failed to apply blur'); }
    };

    const setVirtualBg = async (imgUrl: string | null) => {
        if (!VirtualBackground) return toast.error('Background processor loading...');
        try {
            if (imgUrl) {
                const processor = VirtualBackground(imgUrl);
                await videoTrack.setProcessor(processor);
            } else {
                await videoTrack.stopProcessor();
            }
            setActiveEffects({ ...activeEffects, virtualBg: imgUrl, blur: false });
        } catch (e) { toast.error('Failed to apply background'); }
    };

    const toggleNoise = async () => {
        if (!KrispNoiseFilter) return toast.error('Noise filter still loading...');
        const audioTrack = Array.from((localParticipant as any).audioTrackPublications?.values() || [])
            .map((p: any) => p.track)
            .find((t: any) => t && t.source === Track.Source.Microphone);

        if (!audioTrack) return toast.error('Microphone not active');
        const newState = !activeEffects.noiseCancellation;
        try {
            if (newState) {
                if (!krispProcessorInstance) {
                    krispProcessorInstance = KrispNoiseFilter();
                    await audioTrack.setProcessor(krispProcessorInstance);
                } else {
                    await krispProcessorInstance.setEnabled(true);
                }
                toast.success('Noise cancellation enabled');
            } else {
                if (krispProcessorInstance) {
                    await krispProcessorInstance.setEnabled(false);
                }
                toast('Noise cancellation disabled');
            }
            setActiveEffects({ ...activeEffects, noiseCancellation: newState });
        } catch (e) {
            toast.error('Failed to toggle noise cancellation');
        }
    };

    return (
        <div className="p-6 space-y-8 h-full overflow-y-auto custom-scrollbar">
            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Video Effects</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={toggleBlur} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${activeEffects.blur ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                        <Sparkles size={24} className="mb-2" />
                        <span className="text-[10px] font-bold">BLUR BG</span>
                    </button>
                    <button onClick={() => setVirtualBg(null)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${!activeEffects.blur && !activeEffects.virtualBg ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                        <ImageIcon size={24} className="mb-2" />
                        <span className="text-[10px] font-bold">NONE</span>
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Virtual Backgrounds</h4>
                <div className="grid grid-cols-2 gap-3">
                    {['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400'].map((bg, i) => (
                        <button key={i} onClick={() => setVirtualBg(bg)} className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all ${activeEffects.virtualBg === bg ? 'border-indigo-500' : 'border-transparent'}`}>
                            <img src={bg} className="w-full h-full object-cover" />
                            {activeEffects.virtualBg === bg && <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center"><CheckCheck size={20} className="text-white" /></div>}
                        </button>
                    ))}
                    <label className="h-20 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-all">
                        <ImageIcon size={20} className="mb-1" />
                        <span className="text-[9px] font-bold">UPLOAD</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setVirtualBg(URL.createObjectURL(file));
                        }} />
                    </label>
                </div>
            </section>

            <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Audio Enhancements</h4>
                <button onClick={toggleNoise} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${activeEffects.noiseCancellation ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                    <Wind size={20} />
                    <div className="text-left flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Noise Cancellation</p>
                        <p className="text-[9px] text-slate-500 font-medium">Krisp AI — remove fans, traffic &amp; static</p>
                    </div>
                    {activeEffects.noiseCancellation
                        ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        : <div className="w-2 h-2 rounded-full bg-slate-700" />}
                </button>
            </section>
        </div>
    );
}

function ParticipantList({ isHost, onPrivateMessage }: { isHost: boolean, onPrivateMessage: (p: Participant) => void }) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const [search, setSearch] = useState('');

    const handleAction = async (participant: Participant, type: 'kick' | 'mute' | 'camera' | 'unmute') => {
        const code = room.name;
        const identity = participant.identity;

        try {
            if (type === 'kick') {
                if (confirm(`Remove ${participant.name}?`)) {
                    await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/kick/${code}`, { identity }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    toast.success('Participant removed');
                }
            } else if (type === 'unmute') {
                const packet = JSON.stringify({
                    type: 'unmute_request',
                    target: identity
                });
                await room.localParticipant.publishData(new TextEncoder().encode(packet), {
                    reliable: true,
                    destinationIdentities: [identity]
                });
                toast.success('Unmute request sent');
            } else {
                const isMute = type === 'mute';
                const publication = participant.getTrackPublication(isMute ? Track.Source.Microphone : Track.Source.Camera);
                if (publication) {
                    await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/update-track/${code}`, { identity, trackSid: publication.trackSid, muted: true }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    toast.success(`${isMute ? 'Muted' : 'Camera off'} via server`);
                } else {
                    toast.error('Device not active');
                }
            }
        } catch {
            toast.error('Action failed');
        }
    };

    const filtered = participants.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.identity.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="p-4 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filtered.map((p: Participant) => {
                    let metadata: any = {};
                    try { metadata = p.metadata ? JSON.parse(p.metadata) : {}; } catch (e) { }
                    const handRaised = !!metadata.raisedHand;
                    return (
                        <div key={p.sid} className={`p-4 rounded-[1.25rem] border flex items-center justify-between group transition-all ${handRaised ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white shadow-lg relative">
                                    {p.name?.charAt(0).toUpperCase()}
                                    {handRaised && <div className="absolute -top-1 -right-1 p-1 bg-amber-500 rounded-lg shadow-lg border-2 border-slate-900"><Hand size={10} className="text-white" /></div>}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        {p.name}
                                        {p.identity === localParticipant.identity && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-lg text-slate-400">YOU</span>}
                                        {p.permissions?.canUpdateMetadata && <Shield size={12} className="text-amber-400" />}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.identity.split('_')[0]}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                {isHost && p.identity !== localParticipant.identity && (
                                    <>
                                        <button onClick={() => handleAction(p, 'mute')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all shadow-sm" title="Server Mute"><MicOff size={14} /></button>
                                        <button onClick={() => {
                                            const publication = p.getTrackPublication(Track.Source.Microphone);
                                            if (publication) {
                                                handleAction(p, 'unmute');
                                            } else {
                                                toast.error('Microphone not active');
                                            }
                                        }} className="p-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-lg transition-all" title="Request to Speak"><Volume2 size={14} /></button>
                                        <button onClick={() => handleAction(p, 'kick')} className="p-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg transition-all" title="Remove User"><UserMinus size={14} /></button>
                                    </>
                                )}
                                {p.identity !== localParticipant.identity && (
                                    <button onClick={() => onPrivateMessage(p)} className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-all" title="Secret msg"><MessageSquare size={14} /></button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ChatPanel({ isHost, chatDisabled, onToggleLock, privateTarget, onClearPrivate }: { isHost: boolean, chatDisabled: boolean, onToggleLock: () => void, privateTarget: Participant | null, onClearPrivate: () => void }) {
    const { chatMessages, send } = useChat();
    const room = useRoomContext();
    const [msg, setMsg] = useState('');
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [chatMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msg.trim() || (chatDisabled && !isHost)) return;

        if (isAnnouncement && isHost) {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'announcement', message: msg })), { reliable: true });
            setIsAnnouncement(false);
        } else if (privateTarget) {
            room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'private_chat', message: msg })), {
                reliable: true,
                destinationIdentities: [privateTarget.identity]
            });
            toast.success(`Secret sent to ${privateTarget.name}`);
        } else {
            send?.(msg);
        }
        setMsg('');
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                {chatMessages.map((m: any, i: number) => (
                    <div key={i} className={`flex flex-col ${m.from?.isLocal ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.from?.name}</span>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${m.from?.isLocal ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-300 rounded-tl-none border border-white/5'}`}>
                            {m.message}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 space-y-4 bg-slate-900/80 backdrop-blur-md">
                {privateTarget && (
                    <div className="flex items-center justify-between bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-black text-indigo-400">DM TO: {privateTarget.name}</span>
                        <button onClick={onClearPrivate} className="text-slate-500 hover:text-white"><X size={12} /></button>
                    </div>
                )}
                {isHost && (
                    <div className="flex gap-2">
                        <button onClick={onToggleLock} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black tracking-widest border transition-all ${chatDisabled ? 'bg-rose-600/10 border-rose-600/30 text-rose-500' : 'bg-emerald-600/10 border-emerald-600/30 text-emerald-500'}`}>
                            {chatDisabled ? <Lock size={12} /> : <Unlock size={12} />} {chatDisabled ? 'CHAT LOCKED' : 'CHAT OPEN'}
                        </button>
                        <button onClick={() => setIsAnnouncement(!isAnnouncement)} className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest border transition-all ${isAnnouncement ? 'bg-amber-600 text-white border-amber-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            <Megaphone size={14} />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSend} className="relative">
                    <input value={msg} onChange={e => setMsg(e.target.value)} disabled={chatDisabled && !isHost} placeholder={isAnnouncement ? "Send Announcement..." : "Message team..."} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pr-14 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all font-medium text-sm placeholder:text-slate-600" />
                    <button type="submit" disabled={!msg.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"><Send size={18} /></button>
                </form>
            </div>
        </div>
    );
}

function AttendanceList({ attendance, isHost, meetingCode, onRefresh }: { attendance: AttendanceMember[], isHost: boolean, meetingCode: string, onRefresh: () => void }) {
    const [search, setSearch] = useState('');
    const [marking, setMarking] = useState<string | null>(null);

    const handleMark = async (userId: string, status: 'present' | 'absent' | 'pending') => {
        setMarking(userId);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/attendance/mark/${meetingCode}`, {
                userId,
                status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Marked as ${status}`);
            onRefresh();
        } catch (error) {
            toast.error('Failed to mark attendance');
        } finally {
            setMarking(null);
        }
    };

    const filtered = attendance.filter(a =>
        a.user.name.toLowerCase().includes(search.toLowerCase()) ||
        a.user.uniqueId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="p-4 border-b border-white/5">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <p className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">Invited Members: {attendance.length}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filtered.map((a: AttendanceMember) => (
                    <div key={a.user._id} className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-400 shadow-inner">
                                    {a.user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-white truncate">{a.user.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{a.user.uniqueId} • {a.user.role}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${a.status === 'present' ? 'bg-emerald-500 shadow-emerald-500/20' : a.status === 'absent' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-slate-700'} shadow-lg`} />
                            </div>

                            {isHost && (
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => handleMark(a.user._id, 'present')}
                                        disabled={marking === a.user._id}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${a.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20 border border-emerald-500/10'}`}
                                    >
                                        <UserCheck size={12} /> Present
                                    </button>
                                    <button
                                        onClick={() => handleMark(a.user._id, 'absent')}
                                        disabled={marking === a.user._id}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${a.status === 'absent' ? 'bg-rose-600 text-white' : 'bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 border border-rose-500/10'}`}
                                    >
                                        <UserX size={12} /> Absent
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto text-slate-700 mb-4 opacity-20" size={48} />
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No members found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function CameraPublisher({ videoTrack, audioTrack }: { videoTrack: MediaStreamTrack | null, audioTrack: MediaStreamTrack | null }) {
    const { localParticipant } = useLocalParticipant();
    const publishedVideoRef = useRef<any>(null);
    const publishedAudioRef = useRef<any>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (!localParticipant || isProcessingRef.current) return;
        const syncTracks = async () => {
            isProcessingRef.current = true;
            try {
                if (videoTrack && !publishedVideoRef.current) {
                    const lkVideoTrack = new LocalVideoTrack(videoTrack);
                    await localParticipant.publishTrack(lkVideoTrack, { source: Track.Source.Camera });
                    publishedVideoRef.current = lkVideoTrack;
                }
                if (audioTrack && !publishedAudioRef.current) {
                    const lkAudioTrack = new LocalAudioTrack(audioTrack);
                    await localParticipant.publishTrack(lkAudioTrack, { source: Track.Source.Microphone });
                    publishedAudioRef.current = lkAudioTrack;
                }
            } catch (err) {
                console.error('[Meeting] Track publish failed:', err);
            } finally {
                isProcessingRef.current = false;
            }
        };
        syncTracks();
    }, [localParticipant, videoTrack, audioTrack]);

    useEffect(() => {
        return () => {
            if (localParticipant) {
                if (publishedVideoRef.current) localParticipant.unpublishTrack(publishedVideoRef.current);
                if (publishedAudioRef.current) localParticipant.unpublishTrack(publishedAudioRef.current);
            }
        };
    }, [localParticipant]);

    return null;
}
