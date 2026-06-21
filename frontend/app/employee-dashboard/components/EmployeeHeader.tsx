'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bell, Search, Menu, UserCircle, Settings, MessageSquare, Video, Clock, CheckCheck } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface NotificationItem {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    metadata?: any;
    actionUrl?: string;
}

export default function EmployeeHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [user, setUser] = useState<any>(null);
    const processedMsgIds = useRef<Set<string>>(new Set());

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

    const fetchNotifications = async (token: string) => {
        try {
            const res = await axios.get(`${backendUrl}/api/workflow/notifications?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.data) {
                setNotifications(res.data.data);
                setUnreadCount(res.data.data.filter((n: NotificationItem) => !n.read).length);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const socket = getSocket(token);
                const decoded: any = jwtDecode(token);
                setUser(decoded);
                const userId = decoded.id || decoded.userId;

                // Sync with DB
                fetchNotifications(token);

                // Socket: New General Notification
                socket.on('newNotification', (data: NotificationItem) => {
                    setNotifications(prev => [
                        {
                            _id: Date.now().toString(),
                            type: data.type,
                            title: data.title,
                            message: data.message,
                            read: false,
                            createdAt: new Date().toISOString(),
                            metadata: data.metadata,
                            actionUrl: data.actionUrl
                        },
                        ...prev
                    ]);
                    setUnreadCount(prev => prev + 1);

                    if (data.type === 'meeting_invite') {
                        const meta = parseMetadata(data.metadata);
                        const joinUrl = data.actionUrl || (meta.meetingCode ? `/meeting/${meta.meetingCode}` : null);

                        toast.custom((t) => (
                            <div className={`bg-white shadow-2xl rounded-2xl p-4 max-w-sm border-l-4 border-indigo-600 flex gap-3 items-start transition-all ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                                    <Video size={20} className="text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-900 text-sm">{data.title}</p>
                                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{data.message}</p>
                                    {joinUrl && (
                                        <button
                                            onClick={() => {
                                                console.log(`[Meeting] Joining via toast: ${joinUrl}`);
                                                router.push(joinUrl);
                                                toast.dismiss(t.id);
                                            }}
                                            className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800"
                                        >
                                            JOIN MEETING NOW →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ), { duration: 10000 });
                    }
                });

                // Socket: New Message
                const handleNewMessage = (msg: any) => {
                    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                    if (senderId !== userId) {
                        if (processedMsgIds.current.has(msg._id)) return;
                        processedMsgIds.current.add(msg._id);

                        toast.success(`Message: ${msg.senderId?.name || 'New Message'}`, { icon: '💬' });
                        fetchNotifications(token); // Refresh list
                    }
                };

                socket.on('newMessage', handleNewMessage);
                return () => {
                    socket.off('newMessage', handleNewMessage);
                    socket.off('newNotification');
                };
            } catch (e) {
                console.error('Socket error in EmployeeHeader', e);
            }
        }
    }, [router]);

    const markAsRead = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${backendUrl}/api/workflow/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const unread = notifications.filter(n => !n.read);
            await Promise.all(unread.map(n =>
                axios.put(`${backendUrl}/api/workflow/notifications/${n._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ));
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const getPageTitle = () => {
        if (pathname?.includes('/chat')) return 'Communications';
        if (pathname?.includes('/projects')) return 'Project Dashboard';
        if (pathname?.includes('/meeting')) return 'Service Meetings';

        const match = pathname?.match(/\/service\/([^/]+)/);
        const serviceName = match ? match[1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : '';
        return serviceName ? `${serviceName} Dashboard` : 'Employee Overview';
    };

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-8 sticky top-0 z-10 flex items-center justify-between">
            <div>
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-blue-900 via-indigo-700 to-indigo-500 bg-clip-text text-transparent">
                    {getPageTitle()}
                </h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                    {user?.name || 'Employee'} • {user?.service || 'Professional'}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search workspace..."
                        className="pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none w-64 font-medium"
                    />
                </div>

                <button
                    onClick={() => router.push('/chat')}
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all relative group"
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                </button>

                <div className="relative">
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2.5 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 text-sm italic">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-[10px] text-blue-600 font-black uppercase tracking-tighter hover:underline flex items-center gap-1">
                                        <CheckCheck size={12} />
                                        Mark All Read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[450px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                                {notifications.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                        <p className="text-gray-400 text-xs font-medium italic">Your inbox is clear</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif._id}
                                            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 items-start ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                            onClick={() => !notif.read && markAsRead(notif._id)}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'meeting_invite' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {notif.type === 'meeting_invite' ? <Video size={16} /> : <Bell size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className={`text-sm truncate ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                        {notif.title}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold shrink-0">
                                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.message}</p>

                                                {notif.type === 'meeting_invite' && (() => {
                                                    const meta = parseMetadata(notif.metadata);
                                                    const joinUrl = notif.actionUrl || (meta.meetingCode ? `/meeting/${meta.meetingCode}` : null);
                                                    if (!joinUrl) return null;

                                                    return (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log(`[Meeting] Joining via list: ${joinUrl}`);
                                                                setNotificationsOpen(false);
                                                                router.push(joinUrl);
                                                            }}
                                                            className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Video size={12} />
                                                            JOIN MEETING
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-800 leading-none">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{user?.role || 'Member'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'E'}
                    </div>
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </header>
    );
}
