'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import { ShieldCheck } from 'lucide-react';
import FinanceServiceSidebar from '@/app/Manager-Compontent/finance/common/FinanceServiceSidebar';
import Header from '@/app/Manager-Compontent/finance/common/FinanceServiceHeader';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';

export default function FinanceServiceSpecificComplaintsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
        } catch (e) {
            router.push('/Login/Signin');
        }

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <FinanceServiceSidebar isSidebarOpen={isSidebarOpen} handleLogout={handleLogout} />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <Header user={user} scrolled={scrolled} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <main className="flex-1 p-8 pt-24 space-y-8 animate-in fade-in duration-500">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight lowercase first-letter:uppercase">
                            <ShieldCheck className="w-7 h-7 text-indigo-600" />
                            Financial Service Complaints
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Monitoring service-level financial compliance and grievances.</p>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                        <ProjectComplaintManager role="manager" />
                    </div>
                </main>
            </div>
        </div>
    );
}
