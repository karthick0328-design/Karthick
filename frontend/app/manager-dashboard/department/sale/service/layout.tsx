'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import ServiceSidebar from '@/app/Manager-Compontent/sales/common/ServiceSidebar';
import ServiceHeader from '@/app/Manager-Compontent/sales/common/ServiceHeader';

interface UserType {
    name: string;
    email: string;
    role: string;
    department: string;
}

export default function ServiceCommonLayout({ children }: { children: React.ReactNode }) {
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
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    return (
        <div className="fixed inset-0 bg-white flex font-sans text-slate-900 overflow-hidden w-full z-0">
            <ServiceSidebar
                isSidebarOpen={isSidebarOpen}
                handleLogout={handleLogout}
            />

            <div className={`flex-1 min-w-0 flex flex-col h-screen transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <ServiceHeader
                    scrolled={scrolled}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    user={user}
                />

                <main className="flex-1 overflow-y-auto p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700 bg-slate-50/50 custom-scrollbar">
                    <div className="max-w-full mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
