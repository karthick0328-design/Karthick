'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    LogOut,
    ChevronRight,
    Briefcase,
    Clock,
    Zap,
    Beaker,
    Computer,
    Microscope,
    Dna,
    FlaskConical,
    ShieldAlert,
    Mail,
} from 'lucide-react';

interface SidebarProps {
    isSidebarOpen: boolean;
    handleLogout: () => void;
}

const services = [
    { name: 'Biochemistry', icon: FlaskConical, path: '/manager-dashboard/department/sale/service/biochemistry' },
    { name: 'NGS', icon: Zap, path: '/manager-dashboard/department/sale/service/ngs' },
    { name: 'Software Development', icon: Computer, path: '/manager-dashboard/department/sale/service/software-development' },
    { name: 'Microbiology', icon: Microscope, path: '/manager-dashboard/department/sale/service/microbiology' },
    { name: 'Drug Discovery', icon: Beaker, path: '/manager-dashboard/department/sale/service/drug-discovery' },
    { name: 'Molecular Biology', icon: Dna, path: '/manager-dashboard/department/sale/service/molecular-biology' },
];

export default function ModernSidebar({ isSidebarOpen, handleLogout }: SidebarProps) {
    const pathname = usePathname();
    const currentService = services.find(s => pathname.startsWith(s.path));
    const otherServices = services.filter(s => s.name !== currentService?.name);

    const isActive = (path: string) => pathname === path;
    const isServiceActive = (path: string) => pathname.startsWith(path);

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
                                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">Sales Hub</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management</p>
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
                        {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Main Dashboard</span>}
                    </Link>

                    {currentService && (
                        <>
                            {isSidebarOpen && (
                                <div className="px-4 pt-6 pb-2">
                                    <div className="h-px bg-slate-100 w-full" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">{currentService.name} Unit</p>
                                </div>
                            )}
                            {!isSidebarOpen && <div className="py-4 flex justify-center"><div className="w-8 h-px bg-slate-100" /></div>}

                            <Link
                                href={currentService.path}
                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive(currentService.path)
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                    : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                    }`}
                            >
                                <currentService.icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                                {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Service Dashboard</span>}
                                {isActive(currentService.path) && isSidebarOpen && <ChevronRight size={14} className="ml-auto text-white" />}
                            </Link>

                            <Link
                                href={`${currentService.path}/attendance`}
                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname.includes('/attendance')
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                    : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                    }`}
                            >
                                <Clock size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                                {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Attendance Hub</span>}
                            </Link>
                        </>
                    )}

                    <Link
                        href="/manager-dashboard/department/sale/email-campaigns"
                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname.includes('/email-campaigns')
                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                            : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                            }`}
                    >
                        <Mail size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                        {isSidebarOpen && <span className="font-bold text-sm tracking-wide">Email Campaigns</span>}
                    </Link>

                    <Link
                        href={currentService ? `${currentService.path}/complaints` : "/manager-dashboard/department/sale/complaints"}
                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${pathname.includes('/complaints')
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
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Switch Unit</p>
                        </div>
                    )}
                    {!isSidebarOpen && <div className="py-4 flex justify-center"><div className="w-8 h-px bg-slate-100" /></div>}

                    {otherServices.map((service) => {
                        const Icon = service.icon;
                        return (
                            <Link
                                key={service.name}
                                href={service.path}
                                className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-95"
                            >
                                <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                                {isSidebarOpen && <span className="font-bold text-sm tracking-wide flex-1">{service.name}</span>}
                                {isSidebarOpen && <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" />}
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
                        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-300 font-black px-2 tracking-widest uppercase">
                            <span>TAMSCI PORTAL</span>
                            <span className="flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div> LIVE</span>
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
