'use client';

import React from 'react';
import {
  Bell,
  Search,
  Menu,
  X,
  User,
  ChevronRight
} from 'lucide-react';
// import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';

interface HeaderProps {
  scrolled: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  user: any;
  pathname: string;
  services: any[];
}

export default function Header({
  scrolled,
  isSidebarOpen,
  setIsSidebarOpen,
  user,
  pathname,
  services
}: HeaderProps) {
  const currentServiceName = services.find(s => pathname.includes(s.path))?.name || 'Sales Management';

  return (
    <header
      className={`sticky top-0 z-40 h-20 transition-all duration-300 flex items-center px-8 justify-between ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-lg shadow-slate-200/50' : 'bg-white border-b border-slate-100'
        }`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="hidden md:flex flex-col">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {currentServiceName}
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>Sale Center</span>
            <ChevronRight size={10} />
            <span className="text-indigo-500 underline underline-offset-4 decoration-indigo-200">Management Dashboard</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="hidden lg:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search resources..."
            className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
          />
        </div>

        {/* Leave Request Widget */}
        {/* <LeaveRequestWidget onSuccess={() => {
          window.dispatchEvent(new CustomEvent('refreshDashboard'));
        }} /> */}

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all hover:text-indigo-600 active:scale-90">
          <Bell size={22} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full animate-ping"></span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">{user?.name}</span>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-indigo-100">Sale Manager</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white ring-4 ring-indigo-50 shadow-lg shadow-indigo-100 group cursor-pointer hover:scale-105 transition-transform">
            <User size={24} className="group-hover:animate-bounce" />
          </div>
        </div>
      </div>
    </header>
  );
}