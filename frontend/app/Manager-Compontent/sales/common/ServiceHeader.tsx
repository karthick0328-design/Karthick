'use client';

import React from 'react';
import {
    Bell,
    Search,
    Menu,
    X,
    User,
    ChevronRight,
    Globe
} from 'lucide-react';
import { usePathname } from 'next/navigation';
// import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

interface HeaderProps {
    scrolled: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    user: any;
}

export default function ServiceHeader({ scrolled, isSidebarOpen, setIsSidebarOpen, user }: HeaderProps) {
    const pathname = usePathname();
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const processedMsgIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
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
                return () => {
                    socket.off('newMessage', handleNewMessage);
                };
            } catch (e) {
                console.error('Socket error in ServiceHeader');
            }
        }
    }, []);

    // Context label based on pathname
    const getContextLabel = () => {
        if (pathname.includes('/biochemistry')) return 'Biochemistry';
        if (pathname.includes('/ngs')) return 'NGS';
        if (pathname.includes('/software-development')) return 'Software Development';
        if (pathname.includes('/microbiology')) return 'Microbiology';
        if (pathname.includes('/drug-discovery')) return 'Drug Discovery';
        if (pathname.includes('/molecular-biology')) return 'Molecular Biology';
        return 'Service Unit';
    };

    const currentContext = getContextLabel();

    return (
        <header
            className={`sticky top-0 z-10 h-24 transition-all duration-500 flex items-center px-10 justify-between ${scrolled
                ? 'bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm'
                : 'bg-white border-b border-slate-50'
                }`}
        >
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    suppressHydrationWarning
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-500 hover:text-slate-900"
                >
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                        {currentContext}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Globe size={10} />
                        <span>Sales Dept</span>
                        <ChevronRight size={10} />
                        <span className="text-slate-900">Manager Dashboard</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden lg:flex relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${currentContext}...`}
                        suppressHydrationWarning
                        className="w-80 pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all outline-none placeholder:text-slate-400"
                    />
                </div>

                <div className="flex items-center gap-4">
                    {/* Leave Request Widget Container */}
                    {/* <div className="hidden sm:block">
                        <LeaveRequestWidget onSuccess={() => {
                            window.dispatchEvent(new CustomEvent('refreshDashboard'));
                        }} />
                    </div> */}

                    <div className="relative">
                        <button
                            onClick={() => setNotificationsOpen(!notificationsOpen)}
                            suppressHydrationWarning
                            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md transition-all relative"
                        >
                            <Bell size={20} />
                            {(unreadMessages > 0) && (
                                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
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
                                                    <span className="font-bold text-gray-900 text-sm">{notif.sender}</span>
                                                    <span className="text-[10px] text-gray-400">{notif.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2">{notif.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pl-6 border-l border-slate-100 flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-black text-slate-900 leading-none">{user?.name || 'Manager'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Unit Lead</p>
                        </div>
                        <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                            <User size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
