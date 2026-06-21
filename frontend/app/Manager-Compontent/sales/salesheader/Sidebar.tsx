'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Briefcase,
  Search,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  pathname: string;
  services: any[];
  handleLogout: () => void;
}

export default function Sidebar({ isSidebarOpen, pathname, services, handleLogout }: SidebarProps) {
  const isActive = (path: string) => {
    if (path === '/manager-dashboard/department/sale' && pathname === path) return true;
    if (path !== '/manager-dashboard/department/sale' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isSidebarOpen ? 'w-72' : 'w-24'}`}
    >
      <div className="flex flex-col h-full bg-slate-50/30">
        {/* Header / Branding */}
        <div className="h-24 flex items-center justify-center border-b border-slate-100 mb-6 bg-white px-6">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'w-full' : 'w-auto'}`}>
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-slate-100 overflow-hidden">
              <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">Sale Center</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management Hub</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link
            href="/manager-dashboard/department/sale"
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname === '/manager-dashboard/department/sale'
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
              : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
              }`}
          >
            <LayoutDashboard size={20} className="shrink-0 transition-transform group-hover:scale-110" />
            {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Dashboard Home</span>}
          </Link>

          <Link
            href="/member-chat"
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname === '/member-chat'
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
              : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
              }`}
          >
            <Search size={20} className="shrink-0 transition-transform group-hover:scale-110" />
            {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Members</span>}
          </Link>

          <Link
            href="/manager-dashboard/department/sale/complaints"
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname === '/manager-dashboard/department/sale/complaints'
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
              : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
              }`}
          >
            <ShieldAlert size={20} className="shrink-0 transition-transform group-hover:scale-110" />
            {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Service Complaints</span>}
          </Link>

          {isSidebarOpen && (
            <div className="px-4 pt-6 pb-2">
              <div className="h-px bg-slate-100 w-full" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Services</p>
            </div>
          )}
          {!isSidebarOpen && <div className="py-4 flex justify-center"><div className="w-8 h-px bg-slate-100" /></div>}

          {services.map((service) => {
            const active = isActive(service.path);
            const Icon = service.icon;
            return (
              <Link
                key={service.name}
                href={service.path}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${active
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                  : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
              >
                <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                {isSidebarOpen && <span className="font-bold text-sm tracking-wide flex-1">{service.name}</span>}
                {active && isSidebarOpen && <ChevronRight size={14} className="text-white" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg ${isSidebarOpen
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
              : 'bg-transparent text-slate-400 hover:text-rose-600 justify-center'
              }`}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sales Role Access</p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </aside>
  );
}