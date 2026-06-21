'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import FinanceServiceSidebar from '@/app/Manager-Compontent/finance/common/FinanceServiceSidebar';
import FinanceServiceHeader from '@/app/Manager-Compontent/finance/common/FinanceServiceHeader';

interface UserType {
    name: string;
    email: string;
    role: string;
    department: string;
}

export default function FinanceCommonLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser({
                    name: decoded.name || 'Manager',
                    email: decoded.email,
                    role: decoded.role,
                    department: decoded.department,
                });
            } catch (err) {
                console.error('Failed to decode token');
            }
        } else {
            router.push('/Login/Signin');
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    return (
        <div className="min-h-screen bg-white flex font-sans text-slate-900 overflow-x-hidden w-full">
            <FinanceServiceSidebar
                isSidebarOpen={isSidebarOpen}
                handleLogout={handleLogout}
            />

            <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <FinanceServiceHeader
                    scrolled={scrolled}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    user={user}
                />

                <main className="flex-1 p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700 bg-slate-50/30">
                    <div className="w-full h-full flex flex-col flex-1">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
