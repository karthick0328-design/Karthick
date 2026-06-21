'use client';

import React, { useState, useEffect } from 'react';
import {
    Bell,
    Search,
    Menu,
    X,
    User,
    ChevronRight,
    Search as SearchIcon,
    Settings,
    ShieldCheck,
    HelpCircle,
    LogOut,
    Sparkles,
    Globe
} from 'lucide-react';
import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    scrolled: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    user: any;
}

export default function ModernHeader({
    scrolled,
    isSidebarOpen,
    setIsSidebarOpen,
    user
}: HeaderProps) {
    const pathname = usePathname();
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Context label based on pathname
    const getContextLabel = () => {
        if (pathname.includes('/biochemistry')) return 'Biochemistry Suite';
        if (pathname.includes('/ngs')) return 'NGS Processing';
        if (pathname.includes('/software-development')) return 'Software Ops';
        if (pathname.includes('/microbiology')) return 'Microbiology Lab';
        if (pathname.includes('/drug-discovery')) return 'Discovery Hub';
        if (pathname.includes('/molecular-biology')) return 'Molecular Unit';
        return 'Strategic Sales';
    };

    return (
        <header
            className={`sticky top-0 z-40 h-24 transition-all duration-500 flex items-center px-10 justify-between ${scrolled
                ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.05)]'
                : 'bg-white border-b border-slate-100'
                }`}
        >
            {/* Left: Menu & Breadcrumbs */}
            <div className="flex items-center gap-8">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="group relative p-3 hover:bg-slate-100 rounded-2xl transition-all duration-300 text-slate-500 hover:text-indigo-600 active:scale-95"
                >
                    {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>

                <div className="hidden md:flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {getContextLabel()}
                        </h1>
                        <div className="bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50 flex items-center gap-1 animate-pulse">
                            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Active</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                        <Globe size={11} className="text-slate-300" />
                        <span>Sales Center</span>
                        <ChevronRight size={10} className="text-slate-300" />
                        <span className="text-indigo-500/80 font-black decoration-indigo-200/50 underline underline-offset-4 tracking-widest">
                            Manager Portal
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Search, Widget, Actions */}
            <div className="flex items-center gap-3 lg:gap-8">
                {/* Search Bar */}
                <div className={`hidden lg:flex relative group transition-all duration-500 ${isSearchFocused ? 'w-96' : 'w-64'}`}>
                    <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isSearchFocused ? 'text-indigo-600' : 'text-slate-400'}`} size={18} />
                    <input
                        type="text"
                        placeholder="Search resources..."
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        className={`w-full bg-slate-100 border border-transparent rounded-2xl pl-12 pr-12 py-3 text-sm transition-all duration-500 outline-none placeholder:text-slate-400 font-medium ${isSearchFocused ? 'bg-white ring-4 ring-indigo-500/10 border-indigo-200 shadow-lg' : 'hover:bg-slate-200/50'}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-focus-within:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black text-slate-400 border border-slate-300 px-1 rounded-md">CMD</span>
                        <span className="text-[10px] font-black text-slate-400 border border-slate-300 px-1 rounded-md">K</span>
                    </div>
                </div>

                {/* Leave Request Widget Container */}
                <div className="hidden sm:block">
                    <div className="bg-slate-50 hover:bg-white border border-slate-100 p-1 rounded-2xl transition-all duration-300 hover:shadow-md active:scale-95">
                        <LeaveRequestWidget onSuccess={() => {
                            window.dispatchEvent(new CustomEvent('refreshDashboard'));
                        }} />
                    </div>
                </div>

                {/* Notifications */}
                <button className="relative p-3 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all duration-300 hover:text-indigo-600 active:scale-90 group">
                    <Bell size={24} />
                    <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-2 border-white rounded-full group-hover:animate-ping opacity-75"></span>
                    <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></span>
                </button>

                {/* User Profile Area */}
                <div className="flex items-center gap-4 pl-6 border-l border-slate-200/60">
                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{user?.name || 'Manager'}</span>
                        <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm uppercase tracking-tighter">
                            <Sparkles size={8} className="animate-pulse" /> Sale Manager
                        </div>
                    </div>
                    <div className="relative group cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 flex items-center justify-center text-white ring-4 ring-white shadow-xl shadow-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 overflow-hidden">
                            {/* Initials or Icon */}
                            <span className="text-lg font-black tracking-tighter shadow-sm">{user?.name?.charAt(0) || 'M'}</span>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg z-10 transition-transform group-hover:scale-125"></div>
                    </div>
                </div>
            </div>
        </header>
    );
}
