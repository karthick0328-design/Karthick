'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bell, Search, Menu, User, Settings, LogOut, Video, CheckCheck, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { io as socketIo, Socket } from 'socket.io-client';
import axios from 'axios';

interface HeaderProps {
    onMenuToggle?: () => void;
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
    user?: { name: string; role: string };
    isSidebarOpen?: boolean;
}

interface NotificationItem {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    metadata?: {
        meetingCode?: string;
        meetingLink?: string;
        startTime?: string;
        service?: string;
    };
    actionUrl?: string;
}

export default function NewHeader({ onMenuToggle, sidebarOpen, setSidebarOpen }: HeaderProps) {
    const [user, setUser] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const router = useRouter();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
            // notifications not critical
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
            fetchNotifications(token);

            const socket = socketIo(backendUrl, {
                auth: { token },
                transports: ['websocket'],
                reconnectionAttempts: 3,
            });
            socketRef.current = socket;

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
                    toast.custom((t) => (
                        <div className={`bg-white shadow-xl rounded-2xl p-4 max-w-sm border border-indigo-100 flex gap-3 items-start transition-all ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                <Video size={20} className="text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm">{data.title}</p>
                                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{data.message}</p>
                                {data.metadata?.meetingCode && (
                                    <button
                                        onClick={() => {
                                            router.push(`/meeting/${data.metadata?.meetingCode}`);
                                            toast.dismiss(t.id);
                                        }}
                                        className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Join Meeting →
                                    </button>
                                )}
                            </div>
                        </div>
                    ), { duration: 8000 });
                }
            });

            return () => { socket.disconnect(); };
        } catch (error) {
            router.push('/Login/Signin');
        }
    }, [router]);

    const markAsRead = async (notifId: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${backendUrl}/api/workflow/notifications/${notifId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { }
    };

    const markAllRead = async () => {
        const token = localStorage.getItem('token');
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n =>
            axios.put(`${backendUrl}/api/workflow/notifications/${n._id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => { })
        ));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        socketRef.current?.disconnect();
        toast.success('Logged out successfully');
        router.push('/Login/Signin');
    };

    const handleMenuToggle = () => {
        if (onMenuToggle) onMenuToggle();
        if (setSidebarOpen) setSidebarOpen(!sidebarOpen);
    };

    const userInitial = user?.name?.charAt(0).toUpperCase() || 'A';

    return (
        <header className="sticky top-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 lg:px-6 transition-all duration-300 w-full shadow-sm">
            {/* Left: Toggle + Badge */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleMenuToggle}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} className="text-slate-600" />
                </button>

            </div>


            {/* Center: Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users, projects, reports..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-2 lg:gap-4">
                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className="p-2 hover:bg-slate-100 rounded-lg relative transition-colors"
                    >
                        <Bell size={20} className="text-slate-600" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-white text-[9px] font-black flex items-center justify-center border-2 border-white px-0.5">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1">
                                        <CheckCheck size={12} /> Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Bell className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            className={`p-4 flex gap-3 items-start hover:bg-slate-50 transition-colors cursor-pointer ${!notif.read ? 'bg-indigo-50/50' : ''}`}
                                            onClick={() => !notif.read && markAsRead(notif._id)}
                                        >
                                            <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'meeting_invite' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                                                {notif.type === 'meeting_invite'
                                                    ? <Video size={16} className="text-indigo-600" />
                                                    : <Bell size={16} className="text-slate-500" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-sm font-bold truncate ${!notif.read ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.read && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0"></div>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                        <Clock size={10} />
                                                        {new Date(notif.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                    {notif.type === 'meeting_invite' && notif.metadata?.meetingCode && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsNotificationsOpen(false);
                                                                router.push(`/meeting/${notif.metadata?.meetingCode}`);
                                                            }}
                                                            className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                                        >
                                                            <Video size={10} /> Join
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200 mx-1"></div>

                {/* User Profile */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 hover:bg-slate-50 rounded-full transition-all group"
                    >
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-indigo-700 transition-colors">
                                {user?.name || 'Admin'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium capitalize">{user?.role || 'Administrator'}</p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20 ring-2 ring-white group-hover:ring-indigo-100 transition-all">
                            {userInitial}
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                            <div className="p-4 bg-slate-50 border-b border-slate-100">
                                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => router.push('/admin-dashboard/profile')}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                                >
                                    <User size={16} /> <span>View Profile</span>
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                                >
                                    <Settings size={16} /> <span>Settings</span>
                                </button>
                            </div>
                            <div className="p-2 border-t border-slate-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50/50 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} /> <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
