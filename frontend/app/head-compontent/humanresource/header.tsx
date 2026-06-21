'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, UserCircle, Video, CheckCheck, Clock, Settings, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

export default function HeadHeader({ department }: { department?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser(decoded);
                const socket = getSocket(token);

                const handleNewNotification = (data: any) => {
                    setUnreadMessages(prev => prev + 1);
                    setRecentNotifications(prev => [{
                        _id: Date.now().toString(),
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        metadata: data.metadata
                    }, ...prev]);

                    if (data.type === 'meeting_invite') {
                        toast.custom((t) => (
                            <div className={`bg-white shadow-2xl rounded-2xl p-4 max-w-sm border border-rose-100 flex gap-4 items-start transition-all ${t.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                                    <Video size={24} className="text-rose-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 text-sm">{data.title}</p>
                                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{data.message}</p>
                                    {data.metadata?.meetingCode && (
                                        <button
                                            onClick={() => {
                                                router.push(`/meeting/${data.metadata?.meetingCode}`);
                                                toast.dismiss(t.id);
                                            }}
                                            className="mt-3 w-full py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-200 hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
                                        >
                                            Join Now <Video size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ), { duration: 10000 });
                    }
                };

                socket.on('newNotification', handleNewNotification);
                return () => {
                    socket.off('newNotification', handleNewNotification);
                };
            } catch (e) {
                console.error('Socket error in HeadHeader');
            }
        }
    }, [router]);

    const getPageTitle = () => {
        if (pathname?.includes('/meetings')) return 'HR Strategic Meetings';
        if (pathname?.includes('/staff')) return 'Global Staff Records';
        if (pathname?.includes('/recruitment')) return 'Talent Acquisition';
        return 'Human Resources Portal';
    };

    return (
        <header className="py-4 px-8 sticky top-0 z-40 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all">
            <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {getPageTitle()}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        HR Secure Session • {user?.role || 'Head'} restricted
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative hidden lg:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search employee database..."
                        className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs focus:ring-2 focus:ring-rose-500/20 outline-none w-80 transition-all"
                    />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-3 rounded-2xl bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadMessages > 0 && (
                            <span className="absolute top-2 right-2.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-white">
                                {unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-900 lowercase leading-none">{user?.name || 'HR Head'}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-[2px]">
                        <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-rose-600">
                            <UserCircle className="w-7 h-7" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
