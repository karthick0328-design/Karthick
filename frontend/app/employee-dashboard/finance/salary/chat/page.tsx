'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Send,
    Paperclip,
    ArrowLeft,
    MoreVertical,
    Search,
    User,
    Check,
    CheckCheck,
    Loader2,
    Image as ImageIcon,
    FileText,
    Download,
    X,
    MessageCircle,
    UserCircle,
    Phone,
    Video,
    Smile,
    Plus,
    Mic,
    Play,
    Pause,
    Clock,
    Shield,
    Calendar,
    Filter,
    Volume2,
    VolumeX
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { validateURL } from '@/lib/validation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Message {
    _id: string;
    sender: {
        _id: string;
        name: string;
        role: string;
    };
    content: string;
    attachments: any[];
    createdAt: string;
    timestamp?: string;
    readBy: string[];
}

interface Chat {
    _id: string;
    members: any[];
    participants?: any[];
    lastMessage: Message;
    updatedAt: string;
}

const VoicePlayer = ({ url, isMe }: { url: string; isMe: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
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
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${isMe ? 'bg-white/10' : 'bg-slate-100'} min-w-[200px]`}>
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <div className="flex-1">
                <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-green-500'}`}
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
                <div className={`flex justify-between mt-1.5 text-[10px] font-bold ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            <audio ref={audioRef} src={validateURL(url)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} className="hidden" />
        </div>
    );
};

const SalaryChat = () => {
    const router = useRouter();
    const params = useParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSidebar, setShowSidebar] = useState(true);
    const socket = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getParticipant = (chat: Chat) => {
        const members = chat.members || chat.participants || [];
        if (!Array.isArray(members)) return null;
        return members.find(m => {
            const pId = m.userId?._id || m.userId || m._id;
            const currentUserId = currentUser?.id || currentUser?._id;
            return pId && pId !== currentUserId;
        });
    };

    // Filtered chats based on search
    const filteredChats = useMemo(() => {
        return (chats || []).filter(chat => {
            const participant = getParticipant(chat);
            const pName = participant?.userId?.name || participant?.name || 'Unknown User';
            return pName.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [chats, searchTerm, currentUser]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            setCurrentUser(decoded);
            loadChats(token);

            socket.current = io(SOCKET_URL, {
                auth: { token },
                transports: ['polling', 'websocket']
            });

            socket.current.on('newMessage', (message: Message) => {
                setMessages(prev => [...prev, message]);
                loadChats(token); // Update chat list/previews
            });

            return () => {
                socket.current?.disconnect();
            };
        } catch (error) {
            router.push('/Login/Signin');
        }
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChats = async (token: string) => {
        try {
            const res = await axios.get(`${API_BASE}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setChats(res.data.data);
                setLoading(false);
            }
        } catch (error) {
            toast.error('Failed to load conversations');
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/chat/conversations/${chatId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data.data);
            const chat = chats.find(c => c._id === chatId);
            setActiveChat(chat || null);
            if (window.innerWidth < 768) setShowSidebar(false);
        } catch (error) {
            toast.error('Failed to load messages');
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !activeChat || sending) return;

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE}/chat/conversations/${activeChat._id}/messages`, {
                content: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setNewMessage('');
            }
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChat) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            toast.loading('Uploading attachment...', { id: 'upload' });
            const res = await axios.post(`${API_BASE}/chat/conversations/${activeChat._id}/messages/attach`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                toast.success('File sent successfully', { id: 'upload' });
            }
        } catch (error) {
            toast.error('Failed to upload file', { id: 'upload' });
        }
    };

    const renderAttachment = (attachment: any, isMe: boolean) => {
        const fileSrc = attachment.url.startsWith('http') ? attachment.url : `${API_BASE.replace('/api', '')}${attachment.url}`;
        const mime = attachment.mimeType || attachment.mimetype || '';
        const name = attachment.filename || attachment.originalName || '';
        const size = attachment.size || 0;
        const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

        // Sanitize URL for all usages
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
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-green-50'}`}>
                        <FileText className={isMe ? 'text-white' : 'text-green-500'} size={28} />
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Initializing Secure Chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#f8fafc] relative font-sans">
            <Toaster position="top-right" />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,audio/*,video/mp4,video/webm,application/pdf" onChange={handleFileUpload} />

            <div className="w-full h-full flex overflow-hidden">
                {/* Left Sidebar */}
                <div className={`w-full md:w-[320px] lg:w-[380px] bg-white border-r border-slate-200 flex flex-col transition-all duration-500 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2">
                                    <ArrowLeft size={20} className="text-slate-600" />
                                </button>
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-200">
                                    <span className="text-white font-bold text-xl">{currentUser?.name?.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h2 className="text-slate-900 font-bold tracking-tight">Salary Chat</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Financial Team</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-green-500 transition-colors" size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-green-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-slate-600 placeholder:text-slate-400 transition-all font-sans"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 mt-6">
                        {filteredChats.map(chat => {
                            const isActive = activeChat?._id === chat._id;

                            return (
                                <div
                                    key={chat._id}
                                    onClick={() => loadMessages(chat._id)}
                                    className={`p-4 rounded-[1.5rem] mb-3 cursor-pointer transition-all duration-300 flex items-center gap-4 ${isActive ? 'bg-green-500 shadow-xl shadow-green-100' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {(() => {
                                            const p = getParticipant(chat);
                                            return (p?.userId?.name || p?.name || '?').charAt(0).toUpperCase();
                                        })()}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-bold truncate tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                {(() => {
                                                    const p = getParticipant(chat);
                                                    return p?.userId?.name || p?.name || 'Unknown';
                                                })()}
                                            </h3>
                                            <p className={`text-[9px] mt-1 opacity-50 ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const d = new Date(chat.updatedAt);
                                                    const now = new Date();
                                                    const isToday = d.toDateString() === now.toDateString();
                                                    const yesterday = new Date();
                                                    yesterday.setDate(yesterday.getDate() - 1);
                                                    const isYesterday = d.toDateString() === yesterday.toDateString();
                                                    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    if (isToday) return `Today, ${time}`;
                                                    if (isYesterday) return `Yesterday, ${time}`;
                                                    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
                                                })()}
                                            </p>
                                        </div>
                                        <p className={`text-xs truncate font-medium ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                            {chat.lastMessage?.content || 'Started a conversation'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Chat Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-24 px-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                                <div className="flex items-center gap-5">
                                    <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-600">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 font-bold text-xl shadow-inner">
                                            {(() => {
                                                const p = getParticipant(activeChat);
                                                return (p?.userId?.name || p?.name || '?').charAt(0).toUpperCase();
                                            })()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-4 border-white"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-900 font-bold tracking-tight text-lg">
                                            {(() => {
                                                const p = getParticipant(activeChat);
                                                return p?.userId?.name || p?.name || 'Unknown';
                                            })()}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Now</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-3.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-2xl transition-all"><Video size={20} /></button>
                                    <button className="p-3.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-2xl transition-all"><Phone size={20} /></button>
                                    <div className="w-px h-8 bg-slate-100 mx-2"></div>
                                    <button className="p-3.5 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-slate-100 transition-all"><MoreVertical size={20} /></button>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-gradient-to-b from-white to-slate-50/30">
                                {messages.map((msg, index) => {
                                    const senderId = msg.sender?._id || msg.sender;
                                    const currentUserId = currentUser?.id || currentUser?._id;
                                    const isMe = senderId === currentUserId;
                                    return (
                                        <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full animate-in slide-in-from-bottom-2 duration-300`}>
                                            <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`group relative p-4 rounded-3xl shadow-sm ${isMe ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'}`}>
                                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                                    {msg.attachments?.length > 0 && (
                                                        <div className="mt-4 space-y-2">
                                                            {msg.attachments.map((att) => (
                                                                <div key={att._id}>{renderAttachment(att, isMe)}</div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className={`flex items-center gap-1.5 mt-2 opacity-60 text-[9px] font-bold uppercase tracking-wider ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <span>
                                                            {(() => {
                                                                const d = new Date(msg.timestamp || msg.createdAt || Date.now());
                                                                const now = new Date();
                                                                const isToday = d.toDateString() === now.toDateString();
                                                                const yesterday = new Date();
                                                                yesterday.setDate(yesterday.getDate() - 1);
                                                                const isYesterday = d.toDateString() === yesterday.toDateString();
                                                                const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                if (isToday) return `Today, ${time}`;
                                                                if (isYesterday) return `Yesterday, ${time}`;
                                                                return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
                                                            })()}
                                                        </span>
                                                        {isMe && (msg.readBy?.length > 1 ? <CheckCheck size={12} /> : <Check size={12} />)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>

                            {/* Message Input Area */}
                            <div className="px-10 py-8 bg-white/80 backdrop-blur-xl border-t border-slate-100 sticky bottom-0">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-200/50 shadow-inner group transition-all focus-within:bg-white focus-within:ring-4 focus-within:ring-green-100/50 focus-within:border-green-200">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-4 text-slate-400 hover:text-green-500 hover:bg-white rounded-[1.5rem] transition-all shadow-sm group"
                                    >
                                        <Plus className="group-hover:rotate-90 transition-transform" size={24} />
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Type your message here..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 placeholder:text-slate-400 py-4"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <div className="flex items-center gap-1.5 px-2">
                                        <button type="button" className="p-3.5 text-slate-400 hover:text-orange-500 transition-colors"><Smile size={22} /></button>
                                        <button type="button" className="p-3.5 text-slate-400 hover:text-green-500 transition-colors"><Mic size={22} /></button>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className="p-4 bg-green-600 text-white rounded-[1.5rem] hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="ml-0.5" />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-48 h-48 bg-green-50 rounded-[3rem] flex items-center justify-center mb-10 relative">
                                <div className="absolute inset-0 bg-green-200/20 blur-3xl rounded-full"></div>
                                <MessageCircle size={80} className="text-green-500 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Select a Discussion</h2>
                            <p className="text-slate-500 max-w-sm font-medium leading-relaxed">Choose a participant from the side panel to start negotiating salary details or verifying payouts with the finance team.</p>
                            <div className="mt-12 flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Shield size={20} className="text-green-600" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encrypted</span>
                                </div>
                                <div className="w-px h-4 bg-slate-200"></div>
                                <div className="flex items-center gap-3">
                                    <Calendar size={20} className="text-green-600" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Archived Registry</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryChat;
