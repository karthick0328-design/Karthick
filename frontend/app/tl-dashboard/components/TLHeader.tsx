'use client';

import React from 'react';
import { Bell, Search, Menu, UserCircle, Video, CheckCheck, Clock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

export default function TLHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const processedMsgIds = useRef<Set<string>>(new Set());

    const parseMetadata = (metadata: any) => {
        if (!metadata) return {};
        if (typeof metadata === 'string') {
            try {
                return JSON.parse(metadata);
            } catch (e) {
                console.error('Failed to parse metadata string:', e);
                return {};
            }
        }
        return metadata;
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Fetch existing notifications
            const fetchNotifications = async () => {
                try {
                    const res = await fetch('http://localhost:5000/api/workflow/notifications?unreadOnly=true', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success && data.data) {
                        setUnreadMessages(data.unreadCount || 0);
                        const formattedNotifs = data.data.map((n: any) => ({
                            _id: n._id,
                            type: n.type,
                            title: n.title,
                            message: n.message,
                            time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            metadata: parseMetadata(n.metadata),
                            actionUrl: n.actionUrl
                        }));
                        setRecentNotifications(formattedNotifs);
                    }
                } catch (err) {
                    console.error('Error fetching notifications:', err);
                }
            };
            fetchNotifications();

            try {
                const socket = getSocket(token);
                const decoded: any = jwtDecode(token);
                const userId = decoded.id || decoded.userId;

                const handleNewMessage = (msg: any) => {
                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                    if (senderId !== userId) {
                        if (processedMsgIds.current.has(msg._id)) return;
                        processedMsgIds.current.add(msg._id);

                        setUnreadMessages(prev => prev + 1);
                        toast.success(`New message from ${msg.senderId?.name || 'someone'}`, {
                            icon: '💬',
                        });
                        setRecentNotifications(prev => [{
                            id: msg._id,
                            sender: msg.senderId?.name || 'Someone',
                            content: msg.content,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }, ...prev]);
                    }
                };

                socket.on('newMessage', handleNewMessage);

                const handleNewNotification = (data: any) => {
                    setUnreadMessages(prev => prev + 1);
                    setRecentNotifications(prev => [{
                        _id: Date.now().toString(),
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        metadata: parseMetadata(data.metadata),
                        actionUrl: data.actionUrl
                    }, ...prev]);

                    if (data.type === 'meeting_invite') {
                        toast.custom((t) => (
                            <div className={`bg-white shadow-2xl rounded-2xl p-4 max-w-sm border border-indigo-100 flex gap-4 items-start transition-all ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                                    <Video size={24} className="text-indigo-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 text-sm">{data.title}</p>
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{data.message}</p>
                                    {(() => {
                                        const meta = parseMetadata(data.metadata);
                                        const joinUrl = data.actionUrl || (meta.meetingCode ? `/meeting/${meta.meetingCode}` : null);
                                        if (!joinUrl) return null;
                                        return (
                                            <button
                                                onClick={() => {
                                                    console.log(`[Meeting] Joining: ${joinUrl}`);
                                                    router.push(joinUrl);
                                                    toast.dismiss(t.id);
                                                }}
                                                className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                Join Now <Video size={12} />
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        ), { duration: 10000 });
                    }
                };

                socket.on('newNotification', handleNewNotification);

                return () => {
                    socket.off('newMessage', handleNewMessage);
                    socket.off('newNotification', handleNewNotification);
                };
            } catch (e) {
                console.error('Socket error in TLHeader');
            }
        }
    }, [router]);

    // Get title from path
    const getPageTitle = () => {
        if (pathname?.includes('/attendance')) return 'Attendance Management';
        if (pathname?.includes('/chat')) return 'Communications';
        if (pathname?.includes('/meetings')) return 'Service Meetings';
        return 'Dashboard Overview';
    };

    const isChat = pathname?.includes('/chat');

    return (
        <header className={`py-4 px-8 sticky top-0 z-50 flex items-center justify-between transition-all duration-500 ${isChat
            ? 'bg-white backdrop-blur-xl border-b border-gray-100 shadow-sm'
            : 'bg-white backdrop-blur-md border-b border-gray-100'
            }`}>
            {/* Left: Title & Breadcrumbs */}
            <div>
                <h2 className={`text-xl font-black tracking-tight bg-clip-text text-transparent transition-all duration-500 ${isChat
                    ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 scale-105'
                    : 'bg-gradient-to-r from-gray-900 to-gray-600'
                    }`}>
                    {getPageTitle()}
                </h2>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 transition-colors duration-500 ${isChat ? 'text-indigo-400' : 'text-gray-400'
                    }`}>
                    Welcome back, Team Lead
                </p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-2 bg-gray-100/50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none w-64"
                    />
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2.5 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadMessages > 0 && (
                            <span className="absolute top-2 right-2.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                                {unreadMessages}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                                {unreadMessages > 0 && <span className="text-xs text-indigo-600 font-bold cursor-pointer" onClick={() => setUnreadMessages(0)}>Mark all read</span>}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {recentNotifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                                ) : (
                                    recentNotifications.map((notif, idx) => (
                                        <div key={idx} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {notif.type === 'meeting_invite' && <Video size={14} className="inline mr-2 text-indigo-600" />}
                                                    {notif.sender || notif.title}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{notif.time}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 line-clamp-2">{notif.message || notif.content}</p>
                                            {notif.type === 'meeting_invite' && (() => {
                                                const meta = parseMetadata(notif.metadata);
                                                const joinUrl = notif.actionUrl || (meta.meetingCode ? `/meeting/${meta.meetingCode}` : null);
                                                if (!joinUrl) return null;
                                                return (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log(`[Meeting] Joining: ${joinUrl}`);
                                                            router.push(joinUrl);
                                                            setNotificationsOpen(false);
                                                        }}
                                                        className="mt-2 text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:underline"
                                                    >
                                                        Join Room <CheckCheck size={10} />
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-800">Team Lead</p>
                        <p className="text-xs text-gray-500">Service Manager</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700">
                        <UserCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </header>
    );
}
