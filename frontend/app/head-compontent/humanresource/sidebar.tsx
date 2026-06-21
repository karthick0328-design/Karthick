'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Clock,
    MessageSquare,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Building2,
    Users,
    Search,
    Video,
    TrendingUp,
    ShieldCheck,
    UserPlus,
    Bug,
    PieChart,
    ShieldAlert,
    Dna,
    Activity,
    Binary,
    Cpu,
    Microscope,
    FlaskConical
} from 'lucide-react';

interface HeadSidebarProps {
    department: string;
}

export default function HeadSidebar({ department }: HeadSidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [basePath, setBasePath] = useState(`/head-dashboard/department/humanresource`);

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: basePath },
        { label: 'Recruitment', icon: UserPlus, href: `${basePath}/recruitment` },
        { label: 'Meetings', icon: Video, href: `${basePath}/meetings` },
        { label: 'Attendance Monitor', icon: Clock, href: `${basePath}/attendance` },
        { label: 'Staff Directory', icon: Users, href: `${basePath}/staff` },
        { label: 'Communications', icon: MessageSquare, href: '/chat' },
        { label: 'Global Search', icon: Search, href: '/member-chat' },
        { label: 'Software Issues', icon: Bug, href: `${basePath}/software-issues` },
        { label: 'Reports', icon: PieChart, href: `${basePath}/reports` },
        { label: 'Service Complaints', icon: ShieldAlert, href: `${basePath}/complaints` },
    ];

    const services = [
        { name: 'NGS', path: '/head-dashboard/service/ngs', icon: Dna },
        { name: 'Drug Discovery', path: '/head-dashboard/service/drug-discovery', icon: Activity },
        { name: 'Software Dev', path: '/head-dashboard/service/software-development', icon: Cpu },
        { name: 'Microbiology', path: '/head-dashboard/service/microbiology', icon: Binary },
        { name: 'Biochemistry', path: '/head-dashboard/service/biochemistry', icon: FlaskConical },
        { name: 'Molecular Biology', path: '/head-dashboard/service/molecular-biology', icon: Microscope },
    ];

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out bg-white border-r border-slate-100 shadow-xl flex flex-col ${isCollapsed ? 'w-24' : 'w-72'}`}
        >
            <div className="h-24 flex items-center justify-center border-b border-slate-100 bg-white px-6">
                <div className={`flex items-center gap-3 transition-all duration-300 ${!isCollapsed ? 'w-full' : 'w-auto'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-rose-100 overflow-hidden">
                        <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide truncate">
                                {department}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Head</p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                {!isCollapsed && (
                    <p className="px-4 mb-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Management</p>
                )}
                {menuItems.map((item, idx) => {
                    const isActive = pathname === item.href || (item.href !== '/chat' && item.href !== '/member-chat' && pathname?.startsWith(item.href) && item.href !== basePath);
                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-rose-600 text-white shadow-xl shadow-rose-100 scale-[1.02]'
                                : 'text-slate-400 hover:bg-white hover:text-rose-600 hover:shadow-md'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''}`} />
                            {!isCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                        </Link>
                    );
                })}

                <div className="px-4 pt-6 pb-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Services oversight</p>
                </div>

                {services.map((service, idx) => {
                    const isActive = pathname === service.path;
                    return (
                        <Link
                            key={`service-${idx}`}
                            href={service.path}
                            className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-rose-50 text-rose-600 shadow-sm'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-rose-600'
                                }`}
                        >
                            <service.icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''}`} />
                            {!isCollapsed && <span className="font-bold text-xs tracking-wide">{service.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-slate-100">
                <button
                    className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
                </button>
            </div>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-rose-600 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-rose-500 transition-all z-30"
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>
        </aside>
    );
}
