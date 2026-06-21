'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    MoreVertical,
    Phone,
    Video,
    Paperclip,
    Smile,
    Mic,
    ArrowLeft,
    Send,
    Check,
    CheckCheck,
    X,
    Bell,
    Image as ImageIcon,
    FileText,
    StopCircle,
    Trash2,
    Play,
    Pause,
    Volume2,
    Download,
    TrendingUp
} from 'lucide-react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { getSocket } from '@/lib/socket';
import { validateURL } from '@/lib/validation';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Dashboard Layout components
import TLSidebar from '../tl-dashboard/components/TLSidebar';
import TLHeader from '../tl-dashboard/components/TLHeader';
import EmployeeSidebar from '../employee-dashboard/components/EmployeeSidebar';
import EmployeeHeader from '../employee-dashboard/components/EmployeeHeader';
import Header from '../Manager-Compontent/sales/salesheader/Header';
import SidebarManager from '../Manager-Compontent/sales/salesheader/Sidebar';
import ServiceSidebar from '../Manager-Compontent/services/sidebar';
import ServiceHeader from '../Manager-Compontent/services/header';
import SalesServiceSidebar from '../Manager-Compontent/sales/common/ServiceSidebar';
import SalesServiceHeader from '../Manager-Compontent/sales/common/ServiceHeader';
import HRServiceSidebar from '../Manager-Compontent/human-resource/common/HRServiceSidebar';
import HRServiceHeader from '../Manager-Compontent/human-resource/common/HRServiceHeader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Member {
    _id: string;
    uniqueId: string;
    name: string;
    email: string;
    role: string;
    service: string;
    department: string;
    phone: string;
}

interface UserSession {
    id: string;
    name: string;
    role: string;
    service?: string;
    department?: string;
    uniqueId?: string;
    email?: string;
}

interface Message {
    _id: string;
    conversationId: string;
    senderId: any;
    content: string;
    attachments: any[];
    createdAt: string;
}

export default function MemberChatPage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

    // Chat state
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Feature states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [messageSearchTerm, setMessageSearchTerm] = useState('');
    const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);

    // Refs
    const socketRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedMsgIds = useRef<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // UI state
    const [showSidebar, setShowSidebar] = useState(true);
    const [managerSidebarOpen, setManagerSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            setCurrentUser({
                id: decoded.id || decoded.userId,
                name: decoded.name,
                role: decoded.role,
                service: decoded.service,
                department: decoded.department,
                uniqueId: decoded.uniqueId,
                email: decoded.email
            });

            const socket = getSocket(token);
            socketRef.current = socket;

            fetchMembers(token, decoded.id || decoded.userId);
        } catch (error) {
            console.error('Auth error:', error);
            router.push('/Login/Signin');
        }

        return () => {
            if (activeConversation) {
                socketRef.current?.emit('leaveConversation', activeConversation._id);
            }
        };
    }, [router]);

    // Handle real-time messages
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleNewMessage = (msg: any) => {
            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            const isRecieved = senderId !== currentUser?.id;

            if (isRecieved) {
                if (processedMsgIds.current.has(msg._id)) return;
                processedMsgIds.current.add(msg._id);

                const isCurrentActive = activeConversation && msg.conversationId === activeConversation._id;

                if (!isCurrentActive) {
                    toast.custom((t) => (
                        <div
                            className={`${t.visible ? 'animate-in slide-in-from-right-full' : 'animate-out fade-out slide-out-to-right-full'
                                } max-w-md w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] pointer-events-auto flex ring-1 ring-black/5 p-4 items-center gap-4 border border-slate-100/50 backdrop-blur-xl`}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg shadow-indigo-100">
                                {msg.senderId?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                                    Incoming Logic: {msg.senderId?.name || 'Observer'}
                                </p>
                                <p className="text-xs font-medium text-slate-500 truncate mt-0.5 bubble-text">
                                    {msg.content || 'Transmitted an attachment'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    startChat(msg.senderId?._id ? { _id: msg.senderId._id, name: msg.senderId.name } as any : msg.senderId);
                                }}
                                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    ), { duration: 4000, position: 'bottom-right' });
                }
            }

            if (activeConversation && (msg.conversationId === activeConversation._id)) {
                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                setTimeout(scrollToBottom, 100);
            }
        };

        socket.on('newMessage', handleNewMessage);
        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, [activeConversation, currentUser]);

    // Filter members
    useEffect(() => {
        const results = members.filter(member =>
            (member.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.uniqueId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.service?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        setFilteredMembers(results);
    }, [searchTerm, members]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMembers = async (token: string, userId: string) => {
        try {
            const response = await fetch(`${API_BASE}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                const otherMembers = data.data.filter((m: Member) => m._id !== userId);
                setMembers(otherMembers);
                setFilteredMembers(otherMembers);
            }
        } catch (error) {
            toast.error('Failed to load members');
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const startChat = async (member: Member) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/members/start-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: member._id })
            });
            const data = await response.json();
            if (data.success) {
                setActiveConversation({
                    ...data.data,
                    otherUser: member
                });
                fetchMessages(data.data._id);
                socketRef.current?.emit('joinConversation', data.data._id);
                setShowSidebar(false);
                setIsMessageSearchOpen(false);
                setMessageSearchTerm('');
            }
        } catch (error) {
            toast.error('Error starting chat');
        }
    };

    const fetchMessages = async (conversationId: string) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMessages(data.data.reverse());
            }
        } catch (error) {
            console.error('Error fetching messages');
        }
    };

    const handleSendMessage = async (attachment?: any) => {
        const textToSend = inputText.trim();
        if ((!textToSend && !attachment) || !activeConversation || isSending) return;

        const token = localStorage.getItem('token');
        setIsSending(true);
        setInputText('');
        setShowEmojiPicker(false);

        try {
            const body: any = { content: textToSend };
            if (attachment) {
                body.attachments = [attachment];
            }

            const response = await fetch(`${API_BASE}/chat/conversations/${activeConversation._id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (data.success) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev;
                    return [...prev, data.data];
                });
            }
        } catch (error) {
            toast.error('Failed to send message');
            if (textToSend) setInputText(textToSend); // Restore text
        } finally {
            setIsSending(false);
        }
    };

    // --- File Upload ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (50MB limit to match backend)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            toast.error('File too large. Maximum size is 50MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg',
            'video/mp4', 'video/webm',
            'application/pdf'
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Unsupported file type. Allowed: images, audio, video (MP4/WebM), and PDF');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Authentication required');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading(`Uploading ${file.name}...`);

        try {
            const response = await fetch(`${API_BASE}/chat/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(errorData.message || `Upload failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                toast.success('File uploaded successfully!', { id: toastId });
                // Send immediately as a message
                await handleSendMessage({
                    url: data.data.url,
                    mimeType: data.data.mimetype,
                    filename: data.data.originalName,
                    size: data.data.size
                });
            } else {
                toast.error(data.message || 'Upload failed', { id: toastId });
            }
        } catch (error: any) {
            console.error('File upload error:', error);
            toast.error(error.message || 'Error uploading file', { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Voice Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);

            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                // Stop all tracks immediately
                stream.getTracks().forEach(track => track.stop());

                if (chunks.length === 0) {
                    toast.error('No audio recorded');
                    return;
                }

                const blob = new Blob(chunks, { type: 'audio/webm' });

                // Check if blob has content
                if (blob.size === 0) {
                    toast.error('Recording failed - no audio data');
                    return;
                }

                const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });

                // Upload immediately
                const token = localStorage.getItem('token');
                if (!token) {
                    toast.error('Authentication required');
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                const toastId = toast.loading('Sending voice message...');
                try {
                    const response = await fetch(`${API_BASE}/chat/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });

                    if (!response.ok) {
                        let errorMessage = `Upload failed: ${response.status}`;
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.message || errorData.errors?.[0]?.message || errorMessage;
                            console.error('Upload error details:', errorData);
                        } catch (parseError) {
                            const textError = await response.text();
                            console.error('Upload error (text):', textError);
                            if (textError) errorMessage = textError;
                        }
                        throw new Error(errorMessage);
                    }

                    const data = await response.json();
                    if (data.success) {
                        toast.success('Voice message sent!', { id: toastId });
                        await handleSendMessage({
                            url: data.data.url,
                            mimeType: 'audio/webm',
                            filename: 'voice-message.webm',
                            size: data.data.size || 0
                        });
                    } else {
                        console.error('Upload failed:', data);
                        toast.error(data.message || 'Upload failed', { id: toastId });
                    }
                } catch (err: any) {
                    console.error('Voice upload error:', err);
                    toast.error(err.message || 'Failed to send voice message', { id: toastId });
                }
            };

            recorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                toast.error('Recording error occurred');
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Microphone access error:', err);
            toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            // Stream will be stopped in the onstop handler
            setIsRecording(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder && isRecording) {
            // Remove the onstop handler to prevent upload
            mediaRecorder.onstop = null;

            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }

            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setMediaRecorder(null);
            setRecordingTime(0);

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }

            toast.success('Recording cancelled');
        }
    };


    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Helpers ---
    const onEmojiClick = (emojiData: EmojiClickData) => {
        setInputText(prev => prev + emojiData.emoji);
    };

    const getFilteredMessages = () => {
        if (!messageSearchTerm.trim()) return messages;
        return messages.filter(m => m.content?.toLowerCase().includes(messageSearchTerm.toLowerCase()));
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    const getSeparatorDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleBackToMembers = () => {
        setShowSidebar(true);
        setActiveConversation(null);
    };

    const VoicePlayer = ({ url, isMe }: { url: string; isMe: boolean }) => {
        const [isPlaying, setIsPlaying] = useState(false);
        const [progress, setProgress] = useState(0);
        const [duration, setDuration] = useState(0);
        const audioRef = useRef<HTMLAudioElement>(null);

        const togglePlay = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
            }
        };

        const handleTimeUpdate = () => {
            if (audioRef.current) {
                const current = audioRef.current.currentTime;
                const dur = audioRef.current.duration;
                if (dur) {
                    setProgress((current / dur) * 100);
                }
            }
        };

        const handleLoadedMetadata = () => {
            if (audioRef.current) {
                setDuration(audioRef.current.duration);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        const formatAudioTime = (time: number) => {
            if (isNaN(time)) return '0:00';
            const mins = Math.floor(time / 60);
            const secs = Math.floor(time % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const bars = [8, 12, 16, 14, 20, 15, 12, 18, 24, 20, 16, 14, 18, 22, 20, 16, 12, 14, 18, 16, 12, 14, 20, 18, 14, 16, 22, 18, 14, 12];

        return (
            <div className={`flex items-center gap-3 py-2 bg-transparent min-w-[280px]`}>
                <button
                    onClick={togglePlay}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all flex-shrink-0 shadow-lg ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600/20'}`}
                >
                    {isPlaying ? (
                        <Pause size={22} fill="currentColor" stroke="none" />
                    ) : (
                        <Play size={22} fill="currentColor" stroke="none" className="ml-1" />
                    )}
                </button>

                <div className="flex-1 flex flex-col gap-1.5 justify-center min-w-0">
                    <div className="flex items-end gap-[3px] h-10 px-1">
                        {bars.map((height, i) => {
                            const isFilled = progress > (i / bars.length) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 rounded-full transition-all duration-300"
                                    style={{
                                        height: `${height}px`,
                                        backgroundColor: isMe
                                            ? (isFilled ? '#ffffff' : 'rgba(255,255,255,0.3)')
                                            : (isFilled ? '#4f46e5' : 'rgba(79, 70, 229, 0.15)')
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div className={`flex justify-between items-center text-[10px] font-bold tracking-wider px-1 uppercase ${isMe ? 'text-white/70' : 'text-slate-500'}`}>
                        <span>{isPlaying ? formatAudioTime(audioRef.current?.currentTime || 0) : formatAudioTime(duration)}</span>
                        <div className="flex items-center gap-2">
                            <Mic size={12} className={isMe ? 'text-white/80' : 'text-indigo-600'} />
                            <span className="opacity-60">Voice Note</span>
                        </div>
                    </div>
                </div>

                <audio ref={audioRef} src={validateURL(url)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} className="hidden" />
            </div>
        );
    };

    // --- Renderers ---
    const renderAttachment = (attachment: any, isMe: boolean) => {
        const fileSrc = attachment.url.startsWith('http') ? attachment.url : `${SOCKET_URL}${attachment.url}`;
        const mime = attachment.mimeType || attachment.mimetype || '';
        const name = attachment.filename || attachment.originalName || '';
        const size = attachment.size || 0;
        const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

        const rawUrl = fileSrc;
        const safeUrl = (rawUrl && /^(https?:\/\/|blob:|\/)/i.test(rawUrl)) ? rawUrl : '#';

        if (isImage) {
            return (
                <div className="mb-2 max-w-sm rounded-2xl overflow-hidden cursor-pointer shadow-xl hover:scale-[1.02] transition-transform duration-300 border-4 border-white/20">
                    <img src={safeUrl} alt="attachment" className="w-full h-auto object-cover" onClick={() => window.open(safeUrl, '_blank', 'noopener,noreferrer')} />
                </div>
            );
        } else if (mime.startsWith('audio/') || /\.(webm|mp3|wav|ogg|m4a)$/i.test(name)) {
            return <VoicePlayer url={safeUrl} isMe={isMe} />;
        } else {
            return (
                <div
                    className={`flex items-center gap-4 p-4 rounded-2xl mb-2 cursor-pointer transition-all border ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-100/50 border-slate-200 hover:bg-slate-100'}`}
                    onClick={() => window.open(safeUrl, '_blank', 'noopener,noreferrer')}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-indigo-50'}`}>
                        <FileText className={isMe ? 'text-white' : 'text-indigo-500'} size={28} />
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'text-slate-700'}`}>{name || 'Document'}</p>
                        <p className={`text-xs opacity-70 ${isMe ? 'text-white' : 'text-slate-500'}`}>
                            {size > 0 ? `${Math.round(size / 1024)} KB` : 'Unknown Size'} • Click to Open
                        </p>
                    </div>
                    <div className={isMe ? 'text-white/50' : 'text-slate-300'}>
                        <Download size={20} />
                    </div>
                </div>
            );
        }
    };

    const ChatContent = (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,audio/*,video/mp4,video/webm,application/pdf" onChange={handleFileUpload} />
            <Toaster position="top-center" />

            <div className="w-full h-full flex overflow-hidden">
                {/* Left Sidebar - Glassmorphic */}
                <div className={`w-full md:w-[320px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col transition-all duration-500 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                    {/* Sidebar Header */}
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <span className="text-white font-bold text-xl">{currentUser?.name?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h2 className="text-slate-900 font-bold tracking-tight">Messages</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar - Modern */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-slate-600 placeholder:text-slate-400 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sycing Members</span>
                            </div>
                        ) : filteredMembers.map((member) => (
                            <div
                                key={member._id}
                                onClick={() => startChat(member)}
                                className={`flex items-center p-4 rounded-3xl cursor-pointer transition-all duration-500 group relative overflow-hidden ${activeConversation?.otherUser?._id === member._id
                                    ? 'bg-white shadow-[0_10px_30px_rgba(79,70,229,0.12)] border border-indigo-100/50'
                                    : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                {activeConversation?.otherUser?._id === member._id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]"></div>
                                )}
                                <div className="relative mr-5 shrink-0">
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl font-black shadow-sm transition-all duration-500 group-hover:scale-110 ${activeConversation?.otherUser?._id === member._id
                                        ? 'bg-indigo-600 text-white shadow-indigo-200'
                                        : 'bg-white border border-slate-100 text-slate-400 group-hover:border-indigo-200'
                                        }`}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-lg border-2 border-slate-50">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className={`font-black text-[15px] truncate tracking-tight transition-colors ${activeConversation?.otherUser?._id === member._id ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {member.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest whitespace-nowrap">Active Now</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                        <span className="text-[10px] font-black text-slate-300 truncate uppercase tracking-widest">ID: {member.uniqueId || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area - Advanced Hybrid Design */}
                <div className="flex-1 flex flex-col relative bg-white transition-all duration-500">
                    {activeConversation ? (
                        <>
                            {/* Chat Header - Glassmorphic Pod */}
                            <div className="h-[80px] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-30">
                                <div className="flex items-center gap-4 cursor-pointer">
                                    <button className="md:hidden text-slate-600" onClick={handleBackToMembers}><ArrowLeft size={24} /></button>
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100">
                                            {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-slate-900 text-xl font-black tracking-tighter uppercase">{activeConversation.otherUser.name}</h2>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Node: {activeConversation.otherUser.uniqueId || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container - Premium Clean Abstract Background */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-white relative overflow-x-hidden">
                                <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: "linear-gradient(#4f46e5 1.5px, transparent 1.5px), linear-gradient(90deg, #4f46e5 1.5px, transparent 1.5px)", backgroundSize: "60px 60px" }}></div>
                                {getFilteredMessages().map((msg, idx) => {
                                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                                    const isMe = senderId === currentUser?.id;
                                    const isFirstInSequence = idx === 0 || (messages[idx - 1].senderId._id || messages[idx - 1].senderId) !== senderId;
                                    const currentDate = getSeparatorDate(msg.createdAt);
                                    const prevDate = idx > 0 ? getSeparatorDate(messages[idx - 1].createdAt) : null;
                                    const showDateSeparator = idx === 0 || currentDate !== prevDate;

                                    return (
                                        <div key={msg._id || idx} className="flex flex-col">
                                            {showDateSeparator && (
                                                <div className="flex items-center gap-4 my-8">
                                                    <div className="flex-1 h-px bg-slate-100"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 bg-white px-4 py-1.5 rounded-full border border-slate-100">{currentDate}</span>
                                                    <div className="flex-1 h-px bg-slate-100"></div>
                                                </div>
                                            )}
                                            <div className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isFirstInSequence ? 'mt-4' : 'mt-1'}`}>
                                                {!isMe && isFirstInSequence && (
                                                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                                                        {activeConversation.otherUser.name.charAt(0)}
                                                    </div>
                                                )}
                                                {!isFirstInSequence && <div className="w-8 flex-shrink-0"></div>}

                                                <div className={`relative group max-w-[80%] lg:max-w-[70%] px-7 py-5 transition-all duration-500 hover:scale-[1.01] ${isMe
                                                    ? 'bg-slate-900 text-white rounded-[2.5rem] rounded-br-none shadow-2xl shadow-slate-200'
                                                    : 'bg-white border border-slate-100/80 text-slate-800 rounded-[2.5rem] rounded-bl-none shadow-[0_10px_40px_rgba(0,0,0,0.03)]'
                                                    }`}>
                                                    <div className="flex flex-col gap-3">
                                                        {msg.attachments?.map((att, i) => (
                                                            <div key={i} className="mb-2">{renderAttachment(att, isMe)}</div>
                                                        ))}
                                                        {msg.content && <p className="text-[15px] leading-relaxed font-bold tracking-tight whitespace-pre-wrap">{msg.content}</p>}
                                                        <div className={`flex items-center gap-3 mt-1 ${isMe ? 'text-white/40' : 'text-slate-300'}`}>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{formatTime(msg.createdAt)}</span>
                                                            {isMe && <CheckCheck size={14} className="text-indigo-400" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} className="h-5" />
                            </div>

                            {/* Input Pod - Advanced Floating Design */}
                            <div className="px-8 pb-8 pt-4 bg-transparent absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
                                <div className="max-w-4xl mx-auto flex items-end gap-4 pointer-events-auto">
                                    <div className="flex-1 bg-white/90 backdrop-blur-2xl rounded-[32px] p-2 flex items-end gap-2 shadow-2xl border border-white/40 ring-1 ring-slate-900/5">
                                        <div className="flex items-center p-1">
                                            {showEmojiPicker && (
                                                <div className="absolute bottom-28 left-4 z-50 animate-in fade-in zoom-in duration-300">
                                                    <div className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl overflow-hidden border border-slate-100">
                                                        <EmojiPicker onEmojiClick={onEmojiClick} previewConfig={{ showPreview: false }} />
                                                    </div>
                                                </div>
                                            )}
                                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all"><Smile size={24} /></button>
                                            <button onClick={() => fileInputRef.current?.click()} className="p-3 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all"><Paperclip size={22} /></button>
                                        </div>

                                        <textarea
                                            placeholder="Synchronize with node..."
                                            rows={1}
                                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-300 font-bold text-sm py-4 px-4 max-h-32 resize-none custom-scrollbar"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            disabled={isRecording}
                                        />

                                        {!inputText.trim() && !isRecording && (
                                            <button onClick={startRecording} className="p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl m-1 transition-all"><Mic size={22} /></button>
                                        )}

                                        {isRecording && (
                                            <div className="flex items-center gap-2 p-1 bg-red-50 rounded-2xl m-1">
                                                <div className="flex items-center gap-3 px-3">
                                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                                                    <span className="text-xs font-black text-red-600 font-mono tracking-widest">{formatDuration(recordingTime)}</span>
                                                </div>
                                                <button onClick={cancelRecording} className="p-3 text-red-500 hover:bg-white rounded-xl transition-all"><Trash2 size={20} /></button>
                                                <button onClick={stopRecording} className="p-3 bg-red-600 text-white hover:bg-red-700 rounded-2xl shadow-lg shadow-red-100"><StopCircle size={22} /></button>
                                            </div>
                                        )}
                                    </div>

                                    {inputText.trim() && (
                                        <button
                                            onClick={() => handleSendMessage()}
                                            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Send size={24} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #4f46e5 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>
                            <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-8">
                                <div className="w-36 h-36 bg-white rounded-[3.5rem] flex items-center justify-center shadow-[0_30px_60px_rgba(0,0,0,0.08)] mb-12 transform hover:scale-110 transition-transform duration-700 group">
                                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                        <TrendingUp size={48} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                </div>
                                <h1 className="text-3xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">Neural <span className="text-indigo-600">Sync</span></h1>
                                <p className="text-slate-400 text-[13px] font-bold leading-relaxed mb-10 uppercase tracking-widest">Select a research node to initiate high-fidelity synchronization.</p>
                                <div className="flex gap-3">
                                    <div className="h-1.5 w-12 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                                    <div className="h-1.5 w-3 bg-slate-200 rounded-full"></div>
                                    <div className="h-1.5 w-3 bg-slate-200 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px !important; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent !important; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.1) !important; border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2) !important; }
            `}</style>
        </div>
    );

    if (currentUser?.role === 'tl') {
        return (
            <div className="flex h-screen bg-white overflow-hidden">
                <TLSidebar overrideService={currentUser.service} />
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-0">
                    <TLHeader />
                    <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                        <div className="w-full max-w-[1400px] h-full">
                            {ChatContent}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (currentUser?.role === 'employee') {
        return (
            <div className="flex h-screen bg-white overflow-hidden">
                <EmployeeSidebar />
                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    <EmployeeHeader />
                    <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                        <div className="w-full max-w-[1400px] h-full">
                            {ChatContent}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (currentUser?.role === 'manager') {
        const isSaleDepartment = (currentUser?.department || '').toLowerCase().includes('sale');
        const isHRDepartment = (currentUser?.department || '').toLowerCase().includes('hr') ||
            (currentUser?.department || '').toLowerCase().includes('human resource');
        const isServiceManager = !!currentUser.service && currentUser.service !== 'Management' && currentUser.service !== 'HR';

        if (isHRDepartment) {
            return (
                <div className="h-screen bg-white flex overflow-hidden">
                    <HRServiceSidebar
                        isSidebarOpen={managerSidebarOpen}
                        handleLogout={() => {
                            localStorage.removeItem('token');
                            router.push('/Login/Signin');
                        }}
                    />
                    <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                        <HRServiceHeader
                            scrolled={false}
                            isSidebarOpen={managerSidebarOpen}
                            setIsSidebarOpen={setManagerSidebarOpen}
                            user={currentUser as any}
                        />
                        <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                            <div className="w-full max-w-[1400px] h-full">
                                {ChatContent}
                            </div>
                        </main>
                    </div>
                </div>
            );
        }

        if (isServiceManager && isSaleDepartment) {
            return (
                <div className="h-screen bg-white flex overflow-hidden">
                    <SalesServiceSidebar
                        isSidebarOpen={managerSidebarOpen}
                        overrideService={currentUser.service}
                        handleLogout={() => {
                            localStorage.removeItem('token');
                            router.push('/Login/Signin');
                        }}
                    />
                    <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                        <SalesServiceHeader
                            scrolled={false}
                            isSidebarOpen={managerSidebarOpen}
                            setIsSidebarOpen={setManagerSidebarOpen}
                            user={currentUser as any}
                        />
                        <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                            <div className="w-full max-w-[1400px] h-full">
                                {ChatContent}
                            </div>
                        </main>
                    </div>
                </div>
            );
        }

        if (isServiceManager) {
            return (
                <div className="h-screen bg-white flex overflow-hidden">
                    <ServiceSidebar
                        isOpen={managerSidebarOpen}
                        setIsOpen={setManagerSidebarOpen}
                        serviceName={currentUser.service}
                    />
                    <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                        <ServiceHeader
                            onMenuToggle={() => setManagerSidebarOpen(!managerSidebarOpen)}
                            serviceName={currentUser.service}
                            isSidebarOpen={managerSidebarOpen}
                        />
                        <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                            <div className="w-full max-w-[1400px] h-full">
                                {ChatContent}
                            </div>
                        </main>
                    </div>
                </div>
            );
        }

        // Default to Department Header/Sidebar
        return (
            <div className="h-screen bg-white flex overflow-hidden">
                <SidebarManager
                    isSidebarOpen={managerSidebarOpen}
                    pathname="/member-chat"
                    services={[]}
                    handleLogout={() => {
                        localStorage.removeItem('token');
                        router.push('/Login/Signin');
                    }}
                />
                <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                    <Header
                        scrolled={false}
                        isSidebarOpen={managerSidebarOpen}
                        setIsSidebarOpen={setManagerSidebarOpen}
                        user={currentUser as any}
                        pathname="/member-chat"
                        services={[]}
                    />
                    <main className="flex-1 overflow-hidden relative bg-white p-6 lg:p-12 flex flex-col items-center">
                        <div className="w-full max-w-[1400px] h-full">
                            {ChatContent}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-center" />
            {ChatContent}
        </>
    );
}
