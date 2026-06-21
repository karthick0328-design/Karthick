'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    LogOut,
    Briefcase,
    Search,
    User,
    ShieldCheck,
    Calendar,
    ShoppingCart,
    Video,
    Bug,
    PieChart,
    ShieldAlert,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';

interface SidebarProps {
    className?: string;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
    serviceName?: string;
    servicePath?: string;
}

const ServiceSidebar = ({ className = '', isOpen = true, setIsOpen, serviceName, servicePath }: SidebarProps) => {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser(decoded);
            } catch (error) {
                console.error('Error decoding token:', error);
            }
        }
    }, []);

    const currentServicePath = servicePath || (pathname.startsWith('/manager-dashboard/service/')
        ? pathname.split('/').slice(0, 4).join('/')
        : '/manager-dashboard/service');

    const navItems = [
        // Navigation items for service managers
        { href: currentServicePath, label: 'Dashboard', icon: LayoutDashboard },
        { href: `${currentServicePath}/purchase`, label: 'Purchase', icon: ShoppingCart },
        { href: `${currentServicePath}/attendance`, label: 'Attendance', icon: Calendar },
        { href: `${currentServicePath}/meeting`, label: 'Meetings', icon: Video },
        { href: '/member-chat', label: 'Chat', icon: Search },
        { href: `${currentServicePath}/software-issues`, label: 'Software Issues', icon: Bug },
        { href: `${currentServicePath}/reports`, label: 'Reports', icon: PieChart },
        { href: `${currentServicePath}/complaints`, label: 'Service Complaints', icon: ShieldAlert },
        { href: `${currentServicePath}/profile`, label: 'My Profile', icon: User },
    ];

    const isActive = (href: string) => {
        if (href === currentServicePath && pathname === href) return true;
        if (href !== currentServicePath && pathname.startsWith(href)) return true;
        return false;
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('token');
        if (setIsOpen) setIsOpen(false);
    };

    const displayServiceName = serviceName || user?.service || 'Service Manager';

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isOpen ? 'w-72' : 'w-24'} ${className}`}
        >
            <div className="flex flex-col h-full bg-slate-50/30">
                {/* Header / Branding */}
                <div className="h-16 flex items-center border-b border-slate-100 flex-shrink-0 bg-white px-6">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isOpen ? 'w-full' : 'justify-center w-full'}`}>
                        <div className="relative w-8 h-8 lg:w-9 lg:h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg shadow-teal-100 ring-2 ring-white">
                            <img
                                src="/cag.jpg"
                                alt="Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {isOpen && (
                            <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                                <h2 className="font-extrabold text-slate-900 leading-none text-sm uppercase tracking-wide">TamSci Biology</h2>
                                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">Management</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 pt-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${isActive(item.href)
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                                : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                                }`}
                        >
                            <item.icon size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive(item.href) ? 'text-white' : ''}`} />
                            {isOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100">
                    <Link
                        href="/Login/Signin"
                        onClick={handleLogoutClick}
                        className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg ${isOpen
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
                            : 'bg-transparent text-slate-400 hover:text-rose-600 justify-center'
                            }`}
                    >
                        <LogOut size={20} className="shrink-0" />
                        {isOpen && <span className="font-bold text-sm">Sign Out</span>}
                    </Link>
                    {isOpen && (
                        <div className="mt-4 text-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Restricted Access</p>
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>
        </aside>
    );
};

export default ServiceSidebar;
