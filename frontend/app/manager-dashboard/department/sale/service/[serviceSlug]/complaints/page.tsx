'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import { ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';

export default function SaleServiceSpecificComplaintsPage() {
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
    }, [router]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                        <ShieldCheck className="w-10 h-10 text-indigo-600" />
                        SERVICE PERFORMANCE OVERSIGHT
                    </h1>
                    <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Compliance & Grievance Registration System</p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-500/5 border-2 border-slate-50 overflow-hidden min-h-[600px]">
                <ProjectComplaintManager role="manager" />
            </div>
        </div>
    );
}
