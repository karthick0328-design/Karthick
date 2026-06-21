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
    Search,
    ShoppingCart,
    Video,
    ShieldAlert,
    Mail
} from 'lucide-react';

interface SidebarProps {
    isSidebarOpen: boolean;
    handleLogout: () => void;
    overrideService?: string;
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

export default function ServiceSidebar({ isSidebarOpen, handleLogout, overrideService }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Extract current service from path or use override
    // Path format: /manager-dashboard/department/sale/service/[serviceName]/...
    const pathSegments = pathname.split('/');
    const serviceIndex = pathSegments.indexOf('service');
    let currentServiceSlug = serviceIndex !== -1 ? pathSegments[serviceIndex + 1] : null;

    if (!currentServiceSlug && overrideService) {
        currentServiceSlug = overrideService.toLowerCase().replace(/\s+/g, '-');
    }

    const currentService = currentServiceSlug && serviceConfig[currentServiceSlug]
        ? serviceConfig[currentServiceSlug]
        : { name: 'Service Unit', icon: ShieldCheck, color: 'text-slate-500' };

    const Icon = currentService.icon;
    const basePath = currentServiceSlug ? `/manager-dashboard/department/sale/service/${currentServiceSlug}` : '/manager-dashboard/department/sale';

    const navItems = [
        { label: 'Dashboard', path: basePath, icon: LayoutDashboard },
        { label: 'Attendance', path: `${basePath}/attendance`, icon: Clock },
        { label: 'Meetings', path: `${basePath}/meeting`, icon: Video },
        // { label: 'Team Members', path: `${basePath}/team`, icon: Users },
        { label: 'Profile', path: `${basePath}/profile`, icon: User },
        { label: 'Chat', path: '/member-chat', icon: Search },
        { label: 'Email Campaigns', path: `/manager-dashboard/service/email-campaigns`, icon: Mail },
        { label: 'Complaints', path: `${basePath}/complaints`, icon: ShieldAlert },
    ];

    const isActive = (path: string) => {
        if (path === '/member-chat') return pathname === '/member-chat';
        return pathname === path || pathname.startsWith(path + '/');
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
                                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">{currentService.name}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager Portal</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            suppressHydrationWarning
                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive(item.path)
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105'
                                : 'text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-md'
                                }`}
                        >
                            <item.icon size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive(item.path) ? 'text-white' : ''}`} />
                            {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                        </Link>
                    ))}
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
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Restricted Access</p>
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
