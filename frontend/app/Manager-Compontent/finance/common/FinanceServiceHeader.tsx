'use client';

import React from 'react';
import {
    Bell,
    Search,
    Menu,
    X,
    User,
    ChevronRight,
    DollarSign
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface HeaderProps {
    scrolled: boolean;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    user: any;
}

export default function FinanceServiceHeader({ scrolled, isSidebarOpen, setIsSidebarOpen, user }: HeaderProps) {
    const pathname = usePathname();

    // Context label based on pathname
    const getContextLabel = () => {
        if (!pathname) return 'Finance Unit';
        if (pathname.includes('/biochemistry')) return 'Biochemistry';
        if (pathname.includes('/ngs')) return 'NGS';
        if (pathname.includes('/software-development')) return 'Software Development';
        if (pathname.includes('/microbiology')) return 'Microbiology';
        if (pathname.includes('/drug-discovery')) return 'Drug Discovery';
        if (pathname.includes('/molecular-biology')) return 'Molecular Biology';
        return 'Finance Unit';
    };

    const currentContext = getContextLabel();

    return (
        <header
            className={`sticky top-0 z-40 h-24 transition-all duration-500 flex items-center px-10 justify-between ${scrolled
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
                        <DollarSign size={10} />
                        <span>Finance Dept</span>
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
                    {/* Integrated Leave Request Widget */}

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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Financial Lead</p>
                        </div>
                        <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            {user?.name?.charAt(0) || <User size={20} />}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
