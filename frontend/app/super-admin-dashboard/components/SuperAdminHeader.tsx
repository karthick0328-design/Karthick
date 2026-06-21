'use client';

import React from 'react';
import {
    Bell,
    Search,
    Menu,
    X,
    User,
    ChevronRight,
    Globe,
    ShieldCheck,
    Cpu
} from 'lucide-react';
import { usePathname } from 'next/navigation';
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

export default function SuperAdminHeader({ scrolled, isSidebarOpen, setIsSidebarOpen, user }: HeaderProps) {
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
                        toast.success(`Broadcasting from ${msg.senderId?.name || 'Authorized Admin'}`, {
                            icon: '📢',
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
                console.error('Socket error in SuperAdminHeader');
            }
        }
    }, []);

    const getContextLabel = () => {
        if (pathname.includes('/finance')) return 'Financial Command';
        if (pathname.includes('/projects')) return 'Project Intelligence';
        if (pathname.includes('/members')) return 'Personnel Overview';
        if (pathname.includes('/clients')) return 'Stakeholder Management';
        if (pathname.includes('/complaints')) return 'Conflict Resolution';
        return 'System Master Overview';
    };

    const currentContext = getContextLabel();

    return (
        <header
            className={`fixed top-0 right-0 z-50 h-24 transition-all duration-500 flex items-center px-6 justify-between ${scrolled
                ? 'bg-white/95 backdrop-blur-xl border-b border-indigo-100 shadow-lg'
                : 'bg-white border-b border-slate-100'
                } ${isSidebarOpen ? 'left-72' : 'left-24'}`}
        >
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    suppressHydrationWarning
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all text-indigo-500 hover:text-indigo-900"
                >
                    {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                        {currentContext}
                        <Cpu size={20} className="text-indigo-600 animate-pulse" />
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Globe size={10} />
                        <span>BioScience Enterprise</span>
                        <ChevronRight size={10} />
                        <span className="text-indigo-900">Highest Administrative Access</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* <div className="hidden lg:flex relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Scan Global Data..."
                        suppressHydrationWarning
                        className="w-96 pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none placeholder:text-slate-400"
                    />
                </div> */}

                <div className="flex items-center gap-4">
                    {/* <div className="relative">
                        <button
                            onClick={() => setNotificationsOpen(!notificationsOpen)}
                            suppressHydrationWarning
                            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 shadow-sm hover:shadow-md transition-all relative"
                        >
                            <Bell size={20} />
                            {(unreadMessages > 0) && (
                                <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                    {unreadMessages}
                                </span>
                            )}
                        </button>

                        {notificationsOpen && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-indigo-50 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-5 border-b border-gray-100 bg-indigo-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-indigo-900 text-xs uppercase tracking-widest">Global Insights</h3>
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                                    </div>
                                    {unreadMessages > 0 && <span className="text-[10px] text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => setUnreadMessages(0)}>Clear Cache</span>}
                                </div>
                                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                    {recentNotifications.length === 0 ? (
                                        <div className="p-8 text-center text-gray-400 text-sm italic font-medium">System Idle</div>
                                    ) : (
                                        recentNotifications.map((notif, idx) => (
                                            <div key={idx} className="p-4 border-b border-gray-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{notif.sender}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">{notif.time}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-2 italic">{notif.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div> */}

                    <div className="pl-6 border-l border-indigo-50 flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-black text-indigo-950 leading-none">{user?.name || 'Administrator'}</p>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Global Controller</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-2 ring-indigo-50 transition-transform hover:rotate-12">
                            <ShieldCheck size={22} className="text-indigo-400" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
