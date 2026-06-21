'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    LogOut,
    Clock,
    ShieldCheck,
    FileText,
    Users,
    UsersRound,
    Settings,
    UserCircle,
    ShoppingCart,
    Video,
    ShieldAlert,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Briefcase,
    MessageSquare,
    Megaphone,
    Monitor,
    HardDrive,
    CreditCard,
    ClipboardList,
    Layers,
    Mail
} from 'lucide-react';

interface SidebarProps {
    isSidebarOpen: boolean;
    handleLogout: () => void;
}

export default function SuperAdminSidebar({ isSidebarOpen, handleLogout }: SidebarProps) {
    const pathname = usePathname();

    const menuGroups = [
        {
            title: 'Main Dashboard',
            items: [
                { label: 'Overview', path: '/super-admin-dashboard', icon: LayoutDashboard },
                { label: 'Member Profiles', path: '/super-admin-dashboard/members', icon: UserCircle },
                { label: 'Member Creation', path: '/super-admin-dashboard/member-creation', icon: Users },
                // { label: 'Recruitment', path: '/super-admin-dashboard/recruitment', icon: ClipboardList },
            ]
        },
        {
            title: 'Financial Management',
            items: [
                { label: 'Profit & Loss', path: '/super-admin-dashboard/finance/profit-loss', icon: TrendingUp },
                { label: 'Income & Cashbook', path: '/super-admin-dashboard/finance/cashbook', icon: FileText },
                { label: 'Expense Details', path: '/super-admin-dashboard/finance/expenses', icon: TrendingDown },
                { label: 'GST Report', path: '/super-admin-dashboard/finance/gst', icon: ClipboardList },
                { label: 'Salary Management', path: '/super-admin-dashboard/finance/salary', icon: DollarSign },
                { label: 'Purchase Orders', path: '/super-admin-dashboard/finance/purchase-orders', icon: ShoppingCart },
            ]
        },
        {
            title: 'Projects & Services',
            items: [
                { label: 'All Projects', path: '/super-admin-dashboard/projects', icon: Briefcase },
                { label: 'Service P&L', path: '/super-admin-dashboard/service-profit', icon: Layers },
                // { label: 'Project Status', path: '/super-admin-dashboard/project-status', icon: Clock },
            ]
        },
        {
            title: 'Support & Updates',
            items: [
                { label: 'Email Campaigns', path: '/super-admin-dashboard/email-campaigns', icon: Mail },
                { label: 'Service Complaints', path: '/super-admin-dashboard/project-complaints', icon: ShieldAlert },
                { label: 'Software Issues', path: '/super-admin-dashboard/software-issues', icon: Monitor },
                { label: 'Global Chat', path: '/super-admin-dashboard/chat', icon: MessageSquare },
                { label: 'Advertisements', path: '/super-admin-dashboard/advertisements', icon: Megaphone },
                { label: 'Job Openings', path: '/super-admin-dashboard/job-openings', icon: Briefcase },
                { label: 'Announcements', path: '/super-admin-dashboard/announcements', icon: Megaphone },
            ]
        },
        {
            title: 'Client Management',
            items: [
                { label: 'Client Details', path: '/super-admin-dashboard/clients', icon: UsersRound },
                { label: 'Drive Usage', path: '/super-admin-dashboard/drive-usage', icon: HardDrive },
                { label: 'Payment Status', path: '/super-admin-dashboard/payments', icon: CreditCard },
            ]
        },
        {
            title: 'Operations',
            items: [
                { label: 'Attendance', path: '/super-admin-dashboard/attendance', icon: Clock },
                { label: 'Meetings', path: '/super-admin-dashboard/meetings', icon: Video },
            ]
        }
    ];

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(path + '/');
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isSidebarOpen ? 'w-72' : 'w-24'
                }`}
        >
            <div className="flex flex-col h-full bg-slate-50/30">
                {/* Header / Branding */}
                <div className="h-24 flex items-center justify-center border-b border-slate-100 bg-white px-6">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'w-full' : 'w-auto'}`}>
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-indigo-100 overflow-hidden">
                            <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden">
                                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">Super Admin</h2>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Master Portal</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-10">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-2">
                            {isSidebarOpen && (
                                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                    {group.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        suppressHydrationWarning
                                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${isActive(item.path)
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]'
                                            : 'text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md'
                                            }`}
                                    >
                                        <item.icon size={18} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive(item.path) ? 'text-white' : ''}`} />
                                        {isSidebarOpen && <span className="font-bold text-xs tracking-wide">{item.label}</span>}
                                        {!isSidebarOpen && isActive(item.path) && (
                                            <div className="absolute left-1 w-1.5 h-6 bg-indigo-600 rounded-full" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white">
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
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Master Authority Access</p>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                ${!isSidebarOpen ? '.custom-scrollbar::-webkit-scrollbar { width: 0px; }' : ''}
            `}</style>
        </aside>
    );
}
