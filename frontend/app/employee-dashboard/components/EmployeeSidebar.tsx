'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Clock,
    MessageSquare,
    Mail,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    ClipboardList,
    User,
    Search,
    Video,
    Bug,
    PieChart,
    ShieldAlert,
} from 'lucide-react';

export default function EmployeeSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [basePath, setBasePath] = useState('');
    const [serviceName, setServiceName] = useState('');
    const [seniority, setSeniority] = useState('junior');

    useEffect(() => {
        const serviceMatch = pathname?.match(/\/employee-dashboard\/(?:service|department)\/([^/]+)/);
        const seniorityMatch = pathname?.match(/\/seniority\/([^/]+)/);

        if (serviceMatch) {
            setServiceName(serviceMatch[1]);
            const type = pathname?.includes('/department/') ? 'department' : 'service';
            setBasePath(`/employee-dashboard/${type}/${serviceMatch[1]}`);
        } else {
            setServiceName('');
            setBasePath('/employee-dashboard');
        }

        if (seniorityMatch) setSeniority(seniorityMatch[1]);
    }, [pathname]);

    const mainMenuItems = [
        {
            label: basePath && basePath !== '/employee-dashboard' ? 'Service Dashboard' : 'Main Dashboard',
            icon: LayoutDashboard,
            href: basePath && basePath !== '/employee-dashboard' ? `${basePath}/seniority/${seniority}` : '/employee-dashboard'
        },
        { label: 'My Projects', icon: ClipboardList, href: '/employee-dashboard/projects' },
        {
            label: 'Meetings',
            icon: Video,
            href: basePath && basePath !== '/employee-dashboard' ? `${basePath}/seniority/${seniority}/meetings` : '/employee-dashboard/meetings',
        },
        {
            label: 'Attendance',
            icon: Clock,
            href: basePath && basePath !== '/employee-dashboard' ? `${basePath}/seniority/${seniority}/attendance` : '/employee-dashboard/attendance',
            hidden: serviceName === 'finance'
        },
        { label: 'Messages', icon: MessageSquare, href: '/chat' },
        { label: 'Chat', icon: Search, href: '/member-chat' },
        { label: 'Email Campaigns', icon: Mail, href: '/employee-dashboard/email-campaigns' },
        { label: 'Software Issues', icon: Bug, href: '/employee-dashboard/software-issues' },
        { label: 'Reports', icon: PieChart, href: '/employee-dashboard/reports' },
        { label: 'Service Complaints', icon: ShieldAlert, href: basePath && basePath !== '/employee-dashboard' ? `${basePath}/seniority/${seniority}/complaints` : '/employee-dashboard/service/complaints' },
        {
            label: 'Profile',
            icon: User,
            href: basePath && basePath !== '/employee-dashboard' ? `${basePath}/profile` : '/employee-dashboard/profile'
        },
    ];

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
                            <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">Employee</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BioLab Operations</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                {!isCollapsed && (
                    <p className="px-4 mb-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">General</p>
                )}
                {mainMenuItems.filter(item => !item.hidden).map((item, idx) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={idx}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''}`} />
                            {!isCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                        </Link>
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
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Employee Access</p>
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
