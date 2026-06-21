'use client';

import React from 'react';
import { Bell, Search, Menu, UserCircle, Settings, MessageSquare } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

export default function FinanceHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const processedMsgIds = useRef<Set<string>>(new Set());

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
                console.error('Socket error in FinanceHeader');
            }
        }
    }, []);

    // Get title from path
    const getPageTitle = () => {
        if (pathname?.includes('/finance/salary')) return 'Salary Management';
        if (pathname?.includes('/finance/service')) return 'Service Payments';
        if (pathname?.includes('/finance/seniority/senior')) return 'Senior Finance Dashboard';
        if (pathname?.includes('/finance/seniority/junior')) return 'Junior Finance Dashboard';
        return 'Finance Overview';
    };

    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-8 sticky top-0 z-10 flex items-center justify-between">
            {/* Left: Title & Breadcrumbs */}
            <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-900 to-indigo-600 bg-clip-text text-transparent">
                    {getPageTitle()}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    Welcome back, Employee
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
                        className="pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none w-64"
                    />
                </div>

                {/* Chat */}
                <button
                    onClick={() => router.push('/chat')}
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                >
                    <MessageSquare className="w-5 h-5" />
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2.5 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
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
                                {unreadMessages > 0 && <span className="text-xs text-blue-600 font-bold cursor-pointer" onClick={() => setUnreadMessages(0)}>Mark all read</span>}
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

                {/* Profile */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-800">Finance User</p>
                        <p className="text-xs text-gray-500">Service Professional</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700">
                        <UserCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </header>
    );
}
