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
    FlaskConical,
    Zap,
    Computer,
    Microscope,
    Beaker,
    Dna,
    User,
    DollarSign,
    Wallet,
    ArrowLeft,
    Search,
    ShoppingCart,
    TrendingUp,
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

// Configuration for each service context
const serviceConfig: Record<string, { name: string, icon: any, color: string }> = {
    'drug-discovery': { name: 'Drug Discovery', icon: Beaker, color: 'text-emerald-500' },
    'biochemistry': { name: 'Biochemistry', icon: FlaskConical, color: 'text-blue-500' },
    'microbiology': { name: 'Microbiology', icon: Microscope, color: 'text-amber-500' },
    'molecular-biology': { name: 'Molecular Biology', icon: Dna, color: 'text-rose-500' },
    'ngs': { name: 'NGS', icon: Zap, color: 'text-purple-500' },
    'software-development': { name: 'Software Dev', icon: Computer, color: 'text-indigo-500' },
};

export default function FinanceServiceSidebar({ isSidebarOpen, handleLogout }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Extract current service from path
    // Path format: /manager-dashboard/department/finance/service/[serviceName]/...
    const pathSegments = pathname.split('/');
    const serviceIndex = pathSegments.indexOf('service');
    const currentServiceSlug = serviceIndex !== -1 ? pathSegments[serviceIndex + 1] : null;

    const currentService = currentServiceSlug && serviceConfig[currentServiceSlug]
        ? serviceConfig[currentServiceSlug]
        : { name: 'Finance Service', icon: DollarSign, color: 'text-slate-500' };

    const Icon = currentService.icon;
    const basePath = `/manager-dashboard/department/finance/service/${currentServiceSlug}`;

    const navItems = [
        { label: 'Dashboard', path: `/manager-dashboard/department/finance`, icon: LayoutDashboard },
        { label: 'Requested Services', path: `/manager-dashboard/department/finance/requested-services`, icon: FileText },
        { label: 'Service Payments', path: `/manager-dashboard/department/finance/service`, icon: DollarSign },
        { label: 'Financial Expense', path: `/manager-dashboard/department/finance/expense`, icon: Wallet },
        { label: 'Cash Book', path: `/manager-dashboard/department/finance/cashbook`, icon: TrendingUp },
        { label: 'GST Report', path: `/manager-dashboard/department/finance/gst-report`, icon: FileText },
        { label: 'Manage Salaries', path: `/manager-dashboard/department/finance/salary`, icon: Users },
        { label: 'Purchase Management', path: `/manager-dashboard/department/finance/purchase`, icon: ShoppingCart },
        { label: 'Department Attendance', path: `/manager-dashboard/department/finance/attendance`, icon: Clock },
        { label: 'Meetings', path: `/manager-dashboard/department/finance/meetings`, icon: Video },
        { label: 'Team Access', path: `/manager-dashboard/department/finance/team`, icon: ShieldCheck },
        { label: 'Members', path: `/member-chat`, icon: Search },
        { label: 'Software Issues', path: `/manager-dashboard/department/finance/software-issues`, icon: Bug },
        { label: 'Reports', path: `/manager-dashboard/department/finance/reports`, icon: PieChart },
        { label: 'Email Campaigns', path: `/manager-dashboard/department/finance/email-campaigns`, icon: Mail },
        { label: 'Service Complaints', path: currentServiceSlug ? `${basePath}/complaints` : `/manager-dashboard/department/finance/complaints`, icon: ShieldAlert },
        ...(currentServiceSlug ? [
            { label: '---', path: '#', icon: () => null, isDisabled: true },
            { label: `${currentService.name}`, path: basePath, icon: Icon },
        ] : []),
    ];

    const isActive = (path: string) => {
        if (path === '/manager-dashboard/department/finance' && pathname === path) return true;
        if (path !== '/manager-dashboard/department/finance' && path !== '#' && pathname.startsWith(path)) return true;
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
                                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">
                                    {currentServiceSlug ? currentService.name : 'Finance Dept'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management System</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item, idx) => {
                        if (item.isDisabled) {
                            return isSidebarOpen ? (
                                <div key={idx} className="px-4 pt-6 pb-2">
                                    <div className="h-px bg-slate-100 w-full" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Active Context</p>
                                </div>
                            ) : (
                                <div key={idx} className="py-4 flex justify-center"><div className="w-8 h-px bg-slate-100" /></div>
                            );
                        }

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
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Finance Role Access</p>
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
