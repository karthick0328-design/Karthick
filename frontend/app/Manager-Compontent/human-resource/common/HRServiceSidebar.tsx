'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    LogOut,
    Clock,
    ShieldCheck,
    FileText,
    Users,
    Settings,
    User,
    Calendar,
    UserPlus,
    Briefcase,
    Search,
    Video,
    Bug,
    PieChart,
    ShieldAlert,
    Mail,
} from 'lucide-react';

interface SidebarProps {
    isSidebarOpen: boolean;
    handleLogout: () => void;
}

export default function HRServiceSidebar({ isSidebarOpen, handleLogout }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: 'Dashboard', path: `/manager-dashboard/department/hr`, icon: LayoutDashboard },
        { label: 'Attendance', path: `/manager-dashboard/department/hr/Attendance`, icon: Clock },
        { label: 'Recruitment', path: `/manager-dashboard/department/hr/recruitment`, icon: Briefcase },
        { label: 'Creation', path: `/manager-dashboard/department/hr/creation`, icon: UserPlus },
        { label: 'Escalations', path: `/manager-dashboard/department/hr/escalations`, icon: Calendar },
        { label: 'Meetings', path: `/manager-dashboard/department/hr/meetings`, icon: Video },
        { label: 'HR Tools', path: `/manager-dashboard/department/hr/Tools`, icon: FileText },
        { label: 'Department Access', path: `/manager-dashboard/department/hr/team`, icon: ShieldCheck },
        { label: 'Members', path: `/member-chat`, icon: Search },
        { label: 'Software Issues', path: `/manager-dashboard/department/hr/software-issues`, icon: Bug },
        { label: 'Reports', path: `/manager-dashboard/department/hr/reports`, icon: PieChart },
        { label: 'Email Campaigns', path: `/manager-dashboard/department/hr/email-campaigns`, icon: Mail },
        { label: 'Service Complaints', path: `/manager-dashboard/department/hr/complaints`, icon: ShieldAlert },
        { label: 'Profile', path: `/manager-dashboard/department/hr/profile`, icon: User },
    ];

    const isActive = (path: string) => {
        if (path === '/manager-dashboard/department/hr' && pathname === path) return true;
        if (path !== '/manager-dashboard/department/hr' && path !== '#' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isSidebarOpen ? 'w-72' : 'w-24'
                }`}
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
                                <h2 className="font-extrabold text-slate-900 leading-tight text-[15px] uppercase tracking-wider">
                                    Admin Console
                                </h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Management System</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item, idx) => {
                        const IconComponent = item.icon;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive(item.path)
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                    : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                    }`}
                            >
                                <IconComponent size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive(item.path) ? 'text-white' : ''}`} />
                                {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        suppressHydrationWarning
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
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">HR Role Access</p>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                    background: transparent;
                }
            `}</style>
        </aside>
    );
}
