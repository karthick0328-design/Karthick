'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import HRServiceSidebar from '@/app/Manager-Compontent/human-resource/common/HRServiceSidebar';
import HRServiceHeader from '@/app/Manager-Compontent/human-resource/common/HRServiceHeader';

interface UserType {
    name: string;
    email: string;
    role: string;
    department: string;
}

export default function HRCommonLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        setScrolled(e.currentTarget.scrollTop > 10);
    };

    useEffect(() => {
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
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    return (
        <div className="min-h-screen bg-white flex font-sans text-slate-900">
            <HRServiceSidebar
                isSidebarOpen={isSidebarOpen}
                handleLogout={handleLogout}
            />

            <div className={`flex-1 flex flex-col h-screen transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-24'} overflow-hidden`}>
                <HRServiceHeader
                    scrolled={scrolled}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    user={user}
                />

                <main
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700 bg-slate-50/30 custom-scrollbar"
                >
                    <div className="max-w-[1700px] mx-auto pb-20">
                        {children}
                    </div>
                </main>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.4);
                }
            `}</style>
        </div>
    );
}
