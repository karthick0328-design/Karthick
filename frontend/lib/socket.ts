import { io, Socket } from 'socket.io-client';

// Define the server URL - environment variable or default
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;
let connectErrorCount = 0;
const MAX_CONNECT_ERRORS = 5;

export const getSocket = (token: string): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: {
                token: token,
            },
            // Use polling first (more reliable), then upgrade to WebSocket.
            // Starting with 'websocket' directly causes errors if the server
            // or proxy doesn't support the WebSocket handshake.
            transports: ['polling', 'websocket'],
            upgrade: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            forceNew: false,
        });

        socket.on('connect', () => {
            connectErrorCount = 0;
            console.log('Socket connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            connectErrorCount++;
            // Only log as warning after first error to reduce noise
            if (connectErrorCount === 1) {
                console.warn('Socket connection error (retrying...):', err.message);
            }
            // If too many errors, destroy the socket so next call creates a fresh one
            if (connectErrorCount >= MAX_CONNECT_ERRORS) {
                console.error('Socket max connect errors reached. Resetting socket.');
                socket?.disconnect();
                socket = null;
                connectErrorCount = 0;
            }
        });
    } else if (socket.disconnected) {
        socket.auth = { token };
        socket.connect();
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        connectErrorCount = 0;
    }
};
