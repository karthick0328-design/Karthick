'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import Sidebar from '@/app/Manager-Compontent/human-resource/common/HRServiceSidebar';
import Header from '@/app/Manager-Compontent/human-resource/common/HRServiceHeader';

export default function HRComplaintsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser(decoded);
                setLoading(false);
            } catch (e) {
                console.error('Failed to decode token', e);
                router.push('/Login/Signin');
            }
        } else {
            router.push('/Login/Signin');
        }

        const handleScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    if (loading) return null;

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            <Sidebar 
                isSidebarOpen={isSidebarOpen} 
                handleLogout={handleLogout} 
            />
            
            <div className={`flex-1 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <Header 
                    isSidebarOpen={isSidebarOpen} 
                    setIsSidebarOpen={setIsSidebarOpen} 
                    user={user}
                    scrolled={scrolled}
                />
                
                <main className="p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">HR Complaints Center</h1>
                        <p className="text-slate-500 mt-2 font-medium">Monitor and manage internal department grievances and service quality escalations.</p>
                    </div>
                    
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] hover:shadow-2xl transition-shadow duration-500">
                        <ProjectComplaintManager role="manager" />
                    </div>
                </main>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>
        </div>
    );
}
