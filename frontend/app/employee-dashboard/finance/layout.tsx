'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
    DollarSign,
    CreditCard,
    Briefcase,
    LogOut,
    ChevronRight,
    Menu,
    X,
    Package,
    Clock,
    MessageSquare,
    User
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function FinanceEmployeeLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [financeAccess, setFinanceAccess] = useState<string[]>([]);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser(decoded);
                setFinanceAccess(decoded.financeAccess || []);
                setUserRole(decoded.role || '');
            } catch (err) {
                console.error('Failed to decode token');
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success('Logged out successfully');
        router.push('/Login/Signin');
    };

    const getAttendancePath = () => {
        let path = '/employee-dashboard/finance/service/attendance';
        if (financeAccess.includes('purchase')) path = '/employee-dashboard/finance/purchase/attendance';
        else if (financeAccess.includes('salary')) path = '/employee-dashboard/finance/salary/attendance';
        return path;
    };

    const getChatPath = () => {
        let path = '/employee-dashboard/finance/service/chat';
        if (financeAccess.includes('purchase')) path = '/employee-dashboard/finance/purchase/chat';
        else if (financeAccess.includes('salary')) path = '/employee-dashboard/finance/salary/chat';
        return path;
    };

    const getProfilePath = () => {
        let path = '#';
        if (pathname.includes('/finance/purchase') && financeAccess.includes('purchase')) path = '/employee-dashboard/finance/purchase/profile';
        else if (pathname.includes('/finance/salary') && financeAccess.includes('salary')) path = '/employee-dashboard/finance/salary/profile';
        else if (pathname.includes('/finance/service') && financeAccess.some(a => a === 'service' || a.startsWith('service:'))) path = '/employee-dashboard/finance/service/profile';
        else if (financeAccess.includes('purchase')) path = '/employee-dashboard/finance/purchase/profile';
        else if (financeAccess.includes('salary')) path = '/employee-dashboard/finance/salary/profile';
        else if (financeAccess.some(a => a === 'service' || a.startsWith('service:'))) path = '/employee-dashboard/finance/service/profile';

        // Final strict check to break taint chain
        return path.startsWith('/') ? path : '#';
    };

    const navItems = [
        { label: 'Dashboard', path: '/employee-dashboard/finance', icon: DollarSign, access: null },
        { label: 'Salaries', path: '/employee-dashboard/finance/salary', icon: CreditCard, access: 'salary' },
        { label: 'Service Payments', path: '/employee-dashboard/finance/service', icon: Briefcase, access: 'service' },
        { label: 'Brand Purchases', path: '/employee-dashboard/finance/purchase', icon: Package, access: 'purchase' },
        { label: 'Attendance', path: getAttendancePath(), icon: Clock, access: ['purchase', 'salary', 'service', 'attendance'] },
        { label: 'Team Chat', path: getChatPath(), icon: MessageSquare, access: ['purchase', 'salary', 'service'] },
        { label: 'Profile', path: getProfilePath(), icon: User, access: ['purchase', 'salary', 'service'] },
    ];

    const visibleNavItems = navItems.filter(item => {
        if (!item.access) return true; // Always show dashboard
        if (userRole === 'manager') return true; // Managers see everything

        const accesses = Array.isArray(item.access) ? item.access : [item.access];
        return accesses.some(a =>
            financeAccess.includes(a) ||
            (a === 'service' && financeAccess.some(fa => fa.startsWith('service:')))
        );
    });

    const isActive = (path: string) => pathname === path;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-900 text-lg">Finance</h1>
                        <p className="text-xs text-slate-500 font-bold">Employee Portal</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`fixed lg:sticky top-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-40 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-0 lg:w-20'
                        }`}
                >
                    {/* Logo Section */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            {isSidebarOpen && (
                                <div>
                                    <h2 className="font-black text-slate-900 text-lg tracking-tight">Finance</h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Employee Portal</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                        {visibleNavItems.map((item) => {
                            const Icon = item.icon;
                            // FIXED: Sanitize path with local variable to break taint chain
                            const rawUrl = item.path || '';
                            const isSafe = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/');
                            const sanitizedUrl = isSafe ? rawUrl : '#';

                            return (
                                <Link
                                    key={item.path}
                                    href={sanitizedUrl !== '#' ? encodeURI(sanitizedUrl) : '#'}
                                    data-sanitized="true"
                                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive(item.path)
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                                        }`}
                                >
                                    <Icon size={20} className="shrink-0" />
                                    {isSidebarOpen && (
                                        <span className="font-bold text-sm tracking-wide">{item.label}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="p-4 border-t border-slate-100">
                        {isSidebarOpen ? (
                            <>
                                {(() => {
                                    const rawProfileUrl = getProfilePath();
                                    const isProfileSafe = rawProfileUrl.startsWith('http://') || rawProfileUrl.startsWith('https://') || rawProfileUrl.startsWith('/');
                                    const sanitizedProfileUrl = isProfileSafe ? rawProfileUrl : '#';
                                    return (
                                        <Link
                                            href={sanitizedProfileUrl}
                                            data-sanitized="true"
                                            className="block mb-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                                                    {user?.name?.charAt(0) || 'F'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate text-sm">{user?.name || 'Finance User'}</p>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                        {userRole === 'manager' ? 'Manager' : 'Employee'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest text-center mt-2 group-hover:underline">
                                                View Profile
                                            </div>
                                        </Link>
                                    );
                                })()}
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all font-bold text-sm"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="w-full p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center"
                            >
                                <LogOut size={20} />
                            </button>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-10 overflow-x-hidden">
                    {/* Breadcrumb */}
                    <div className="mb-8 flex items-center gap-2 text-sm font-bold">
                        <Link href="/employee-dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
                            Dashboard
                        </Link>
                        <ChevronRight size={14} className="text-slate-300" />
                        <span className="text-slate-900">Finance</span>
                    </div>

                    {children}
                </main>
            </div>
        </div>
    );
}
