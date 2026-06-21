'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, User, MessageSquare, Phone, Briefcase, Building2,
    Hash, Loader2, ArrowLeft, Send, X, Bell
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { getSocket } from '@/lib/socket';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';

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
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

    const socketRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedMsgIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            const uid = decoded.id || decoded.userId;
            setCurrentUser({
                id: uid,
                name: decoded.name,
                role: decoded.role
            });

            const socket = getSocket(token);
            socketRef.current = socket;

            fetchMembers(token, uid);
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
            // Find sender correctly from fully populated or plain string representation
            const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
            const isRecieved = senderId !== currentUser?.id;

            if (isRecieved) {
                if (processedMsgIds.current.has(msg._id)) return;
                processedMsgIds.current.add(msg._id);

                const isCurrentActive = activeConversation && msg.conversationId === activeConversation._id;

                if (!isChatOpen || !isCurrentActive) {
                    setUnreadMessages(prev => prev + 1);
                    setRecentNotifications(prev => [{
                        id: msg._id,
                        sender: msg.senderId?.name || 'Someone',
                        content: msg.content,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }, ...prev]);

                    toast.success(`New message: ${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}`, {
                        icon: 'ðŸ’¬',
                        duration: 4000
                    });
                }
            }

            if (activeConversation && msg.conversationId === activeConversation._id) {
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
    }, [activeConversation, isChatOpen, currentUser]);

    useEffect(() => {
        const results = members.filter(member =>
            (member.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.uniqueId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (member.service?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
        setFilteredMembers(results);
    }, [searchTerm, members]);

    useEffect(() => {
        if (isChatOpen) scrollToBottom();
    }, [messages, isChatOpen]);

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
                setIsChatOpen(true);
                fetchMessages(data.data._id);
                // Ensure the socket joins the real-time room to receive messages
                if (socketRef.current) {
                    socketRef.current.emit('joinConversation', data.data._id);
                }
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
                setTimeout(scrollToBottom, 200);
            }
        } catch (error) {
            console.error('Error fetching messages');
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || !activeConversation || isSending) return;

        const token = localStorage.getItem('token');
        setIsSending(true);
        const tempText = inputText;
        setInputText('');

        try {
            const response = await fetch(`${API_BASE}/chat/conversations/${activeConversation._id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: tempText })
            });
            const data = await response.json();

            if (data.success) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev;
                    return [...prev, data.data];
                });
                setTimeout(scrollToBottom, 100);
            }
        } catch (error) {
            toast.error('Failed to send message');
            setInputText(tempText);
        } finally {
            setIsSending(false);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'manager': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'tl': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'employee': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative flex flex-col min-h-[calc(100vh-8rem)] w-full">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-6 py-5 sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Member Directory</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Secure Chat Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-80">
                            <input
                                type="text"
                                placeholder="Search members..."
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-400 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all relative"
                            >
                                <Bell size={20} />
                                {unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                        {unreadMessages}
                                    </span>
                                )}
                            </button>

                            {notificationsOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Alerts</h3>
                                        {unreadMessages > 0 && <button className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest hover:text-indigo-800" onClick={() => setUnreadMessages(0)}>Clear</button>}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {recentNotifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Alerts</div>
                                        ) : (
                                            recentNotifications.map((notif, idx) => (
                                                <div key={idx} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-slate-900 text-sm">{notif.sender}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{notif.time}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{notif.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Directory...</p>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-200 max-w-md mx-auto mt-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="text-slate-300" size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">No Matches Found</h3>
                        <p className="text-sm font-medium text-slate-500">Try adjusting your search criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMembers.map((member) => (
                            <div
                                key={member._id}
                                className="bg-white rounded-[1.5rem] border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-600 font-black text-lg group-hover:scale-110 transition-transform duration-300 shrink-0">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 min-w-max ${getRoleColor(member.role)}`}>
                                        {member.role || 'User'}
                                    </span>
                                </div>

                                <div className="mb-5">
                                    <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight" title={member.name}>{member.name}</h3>
                                    <div className="flex items-center gap-1.5 text-indigo-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                                        <Hash size={10} />
                                        {member.uniqueId}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-5">
                                    <div className="flex items-center gap-2.5 text-slate-600">
                                        <Building2 size={14} className="text-slate-400 shrink-0" />
                                        <p className="text-xs font-semibold truncate" title={member.department}>{member.department || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-slate-600">
                                        <Briefcase size={14} className="text-slate-400 shrink-0" />
                                        <p className="text-xs font-semibold truncate" title={member.service}>{member.service || 'N/A'}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => startChat(member)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    <MessageSquare size={14} />
                                    Secure Message
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Drawer Overlay */}
            {isChatOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
                    onClick={() => setIsChatOpen(false)}
                />
            )}

            {/* Chat Drawer */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-slate-200 flex flex-col ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {activeConversation && (
                    <>
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black">
                                    {activeConversation.otherUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-900 text-sm truncate">{activeConversation.otherUser.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest shrink-0">Active</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl transition-colors shrink-0">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages Content */}
                        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 custom-scrollbar space-y-4">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                                    <MessageSquare size={32} className="text-slate-400 mb-3" />
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No messages yet</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                                    const isMe = senderId === currentUser?.id;
                                    const ShowContent = () => (
                                        <div className={`max-w-[85%] px-4 py-3 ${isMe ? 'bg-indigo-600 text-white rounded-[1.5rem] rounded-tr-sm shadow-md shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-800 rounded-[1.5rem] rounded-tl-sm shadow-sm'}`}>
                                            <p className="text-sm font-medium leading-relaxed break-words">{msg.content}</p>
                                            <p className={`text-[9px] mt-1.5 font-bold ${isMe ? 'text-indigo-200 text-right' : 'text-slate-400 text-left'}`}>
                                                {(() => {
                                                    const d = new Date(msg.timestamp || msg.createdAt || Date.now());
                                                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                            </p>
                                        </div>
                                    );
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <ShowContent />
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Drawer Input */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-1.5 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-300 transition-all">
                                <textarea
                                    rows={1}
                                    placeholder="Type your secure message..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 font-medium resize-none min-h-[40px] max-h-32 text-slate-800 placeholder:text-slate-400 custom-scrollbar"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    // Handle shift+enter correctly
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    disabled={!inputText.trim() || isSending}
                                    onClick={handleSendMessage}
                                    className={`p-2.5 rounded-xl transition-all shrink-0 ${inputText.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
