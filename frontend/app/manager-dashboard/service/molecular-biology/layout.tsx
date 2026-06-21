'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import ServiceSidebar from '@/app/Manager-Compontent/services/sidebar';
import ServiceHeader from '@/app/Manager-Compontent/services/header';

interface UserType {
    name: string;
    email: string;
    role: string;
    department: string;
}

export default function MolecularBiologyServiceLayout({ children }: { children: React.ReactNode }) {
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
        <div className="fixed inset-0 bg-slate-50 flex overflow-hidden z-0">
            <ServiceSidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                serviceName="Molecular Biology"
                servicePath="/manager-dashboard/service/molecular-biology"
            />

            <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <ServiceHeader
                    onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    serviceName="Molecular Biology"
                    isSidebarOpen={isSidebarOpen}
                />

                <main className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
