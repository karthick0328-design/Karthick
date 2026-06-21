'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Clock,
    MessageSquare,
    ListTodo,
    User,
    Search,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Beaker,
    Dna,
    Microscope,
    FlaskConical,
    Binary,
    Activity,
    Atom,
    PlayCircle,
    CheckCircle,
    Video,
    FolderOpen,
    Bug,
    PieChart,
    ShieldAlert,
} from 'lucide-react';

interface TLSidebarProps {
    overrideService?: string;
}

export default function TLSidebar({ overrideService }: TLSidebarProps = {}) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [serviceName, setServiceName] = useState('');
    const [basePath, setBasePath] = useState('');

    useEffect(() => {
        if (overrideService) {
            const formattedService = overrideService.toLowerCase().replace(/\s+/g, '-');
            setServiceName(formattedService);
            setBasePath(`/tl-dashboard/service/${formattedService}`);
            return;
        }
        const match = pathname?.match(/\/tl-dashboard\/service\/([^/]+)/);
        if (match) {
            setServiceName(match[1]);
            setBasePath(`/tl-dashboard/service/${match[1]}`);
        }
    }, [pathname, overrideService]);

    const getServiceIcon = () => {
        switch (serviceName) {
            case 'drug-discovery': return <FlaskConical className="w-6 h-6" />;
            case 'ngs': return <Dna className="w-6 h-6" />;
            case 'microbiology': return <Microscope className="w-6 h-6" />;
            case 'biochemistry': return <Beaker className="w-6 h-6" />;
            case 'molecular-biology': return <Atom className="w-6 h-6" />;
            case 'software-development': return <Binary className="w-6 h-6" />;
            default: return <Activity className="w-6 h-6" />;
        }
    };

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: basePath || '#' },
        { label: 'Projects', icon: FolderOpen, href: basePath ? `${basePath}/project` : '#' },
        { label: 'Attendance', icon: Clock, href: basePath ? `${basePath}/attendance` : '#' },
        { label: 'Meetings', icon: Video, href: basePath ? `${basePath}/meetings` : '#' },
        { label: 'Team Messages', icon: MessageSquare, href: '/chat' },
        { label: 'Chat', icon: Search, href: '/member-chat' },
        { label: 'Software Issues', icon: Bug, href: basePath ? `${basePath}/software-issues` : '#' },
        { label: 'Reports', icon: PieChart, href: basePath ? `${basePath}/reports` : '#' },
        { label: 'Service Complaints', icon: ShieldAlert, href: basePath ? `${basePath}/complaints` : '/tl-dashboard/service/complaints' },
        { label: 'Profile', icon: User, href: basePath ? `${basePath}/profile` : '#' },
    ];

    if (!basePath) return null;

    return (
        <aside
            className={`relative h-screen bg-white border-r border-slate-100 shadow-xl transition-all duration-300 ease-in-out z-20 flex flex-col ${isCollapsed ? 'w-24' : 'w-72'}`}
        >
            {/* Header */}
            <div className="h-24 flex items-center justify-center border-b border-slate-100 bg-white px-6">
                <div className={`flex items-center gap-3 transition-all duration-300 ${!isCollapsed ? 'w-full' : 'w-auto'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-slate-100 overflow-hidden">
                        <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide capitalize">
                                {serviceName.replace('-', ' ')}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Lead Portal</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                {menuItems.map((item, idx) => {
                    const isActive = item.label === 'Dashboard'
                        ? pathname === item.href
                        : (pathname === item.href || pathname?.startsWith(`${item.href}/`));

                    return (
                        <div key={idx}>
                            <Link
                                href={item.href}
                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                    : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                    }`}
                                title={isCollapsed ? item.label : ''}
                            >
                                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''}`} />
                                {!isCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100">
                <button
                    className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
                </button>
                {!isCollapsed && (
                    <div className="mt-4 text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Team Lead Access</p>
                    </div>
                )}
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-indigo-600 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-indigo-500 transition-all z-30"
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>
        </aside>
    );
}
