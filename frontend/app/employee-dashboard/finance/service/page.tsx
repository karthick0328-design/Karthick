'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Beaker,
    FlaskConical,
    Microscope,
    Dna,
    Zap,
    Computer,
    ChevronRight,
    ArrowLeft,
    Clock,
    MessageSquare
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

// Copied config from manager service page
const serviceConfig = [
    {
        id: 'drug-discovery',
        name: 'Drug Discovery',
        icon: Beaker,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-100',
        description: 'Pharmaceutical research and development finance.'
    },
    {
        id: 'biochemistry',
        name: 'Biochemistry',
        icon: FlaskConical,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-100',
        description: 'Chemical processes within organisms financial tracking.'
    },
    {
        id: 'microbiology',
        name: 'Microbiology',
        icon: Microscope,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-100',
        description: 'Microscopic organism research payment management.'
    },
    {
        id: 'molecular-biology',
        name: 'Molecular Biology',
        icon: Dna,
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100',
        description: 'Biological activity at molecular level financials.'
    },
    {
        id: 'ngs',
        name: 'Next Gen Sequencing',
        icon: Zap,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-100',
        description: 'High-throughput DNA sequencing service finance.'
    },
    {
        id: 'software-development',
        name: 'Software Dev',
        icon: Computer,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-100',
        description: 'Computational biology and software project payments.'
    },
];

export default function FinanceEmployeeServicesPage() {
    const router = useRouter();
    const [hasAccess, setHasAccess] = useState(false);
    const [financeAccess, setFinanceAccess] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        loadInitialData();
    }, [router]);

    const loadInitialData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // 1. Initial decode for UI responsiveness
            const decoded: any = jwtDecode(token);
            setFinanceAccess(decoded.financeAccess || []);
            setUserRole(decoded.role || '');

            // 2. Fetch fresh profile to sync role/access
            const res = await fetch(`${API_BASE}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            let currentAccess = decoded.financeAccess || [];
            let currentRole = decoded.role || '';

            if (data.success && data.user) {
                currentAccess = data.user.financeAccess || [];
                currentRole = data.user.role || '';
                setFinanceAccess(currentAccess);
                setUserRole(currentRole);
            }

            // 3. Final Authority Check
            const hasServiceAccess = currentAccess.some((a: string) => a === 'service' || a.startsWith('service:'));

            if (currentRole === 'employee' && !hasServiceAccess) {
                toast.error('Access Denied: Service Module');
                router.push('/employee-dashboard/finance');
            } else {
                setHasAccess(true);
            }
        } catch (err) {
            console.error('Initialization failed', err);
            router.push('/login');
        }
    };

    if (!hasMounted || !hasAccess) return null;

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="group flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 font-bold transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm uppercase tracking-widest">Back</span>
                </button>
                <div className="bg-white px-6 py-2 rounded-2xl border border-slate-100 shadow-sm">
                    <h1 className="text-lg font-black text-slate-900 uppercase">Service Payments Monitoring</h1>
                </div>
            </div>

            {/* Service Grid - Redirects to reused component handled via simpler pages or direct component usage */}
            {/* Note: Since we need specific pages for each detail view, we likely need to handle that or use a shared component. 
                For now, let's link to sub-pages we will create or assume exist. 
                Wait, creating 6 sub-pages in employee dashboard finance might be overkill if I can make one dynamic page.
                Use /employee-dashboard/finance/service/[serviceId]
             */}
            {/* Service Grid - Filtered by Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {serviceConfig
                    .filter(service => {
                        if (userRole === 'manager' || financeAccess.includes('service')) return true;
                        return financeAccess.includes(`service:${service.id}`);
                    })
                    .map((service) => (
                        <Link
                            key={service.id}
                            href={`/employee-dashboard/finance/service/${service.id}`}
                            className="group relative bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden block"
                        >
                            {/* Decorative Background Icon */}
                            <div className={`absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 scale-150 rotate-12 ${service.color}`}>
                                <service.icon size={160} />
                            </div>

                            <div className="relative z-10">
                                <div className={`w-16 h-16 rounded-3xl ${service.bgColor} ${service.color} flex items-center justify-center mb-6 shadow-lg shadow-current/5 group-hover:scale-110 transition-transform duration-500`}>
                                    <service.icon size={32} />
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                    {service.name}
                                </h3>
                                <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                                    {service.description}
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${service.borderColor} ${service.bgColor} ${service.color}`}>
                                        View Payments
                                    </span>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
            </div>
        </div>
    );
}

