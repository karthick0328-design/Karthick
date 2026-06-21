'use client';

import React from 'react';
import {
    Bell,
    Search,
    Menu,
    X,
    User,
    ChevronRight,
    Users
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';

interface HeaderProps {
    scrolled: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    user: {
        name?: string;
        role?: string;
        department?: string;
        email?: string;
    } | null;
}

export default function HRServiceHeader({ scrolled, isSidebarOpen, setIsSidebarOpen, user }: HeaderProps) {
    const pathname = usePathname();

    const getContextLabel = () => {
        if (pathname.includes('/Attendance')) return 'Attendance Mgt';
        if (pathname.includes('/recruitment')) return 'Recruitment';
        if (pathname.includes('/creation')) return 'Employee Creation';
        if (pathname.includes('/escalations')) return 'Escalated Issues';
        if (pathname.includes('/Tools')) return 'HR Toolset';
        return 'HR Dashboard';
    };

    const currentContext = getContextLabel();

    return (
        <header
            className={`w-full z-40 h-24 bg-white border-b flex items-center px-10 justify-between transition-all duration-300 ${scrolled
                ? 'border-slate-200 shadow-xl shadow-slate-100/50'
                : 'border-slate-100'
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
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                        {currentContext}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span className="hover:text-indigo-600 transition-colors cursor-default">HR Dept</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="hover:text-indigo-600 transition-colors cursor-default">Management</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="text-indigo-600 italic">{currentContext}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <LeaveRequestWidget onSuccess={() => { }} />

                    <button
                        suppressHydrationWarning
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md transition-all relative"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>

                    <div className="pl-6 border-l border-slate-100 flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-black text-slate-900 leading-none">{user?.name || 'Manager'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user?.role || 'HR Lead'}</p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 text-sm font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || <User size={20} />}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
