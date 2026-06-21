'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Beaker,
    FlaskConical,
    Microscope,
    Dna,
    Zap,
    Computer,
    ChevronRight,
    ArrowUpRight,
    TrendingUp,
    DollarSign,
    CheckCircle,
    FileText,
    Loader2
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

// --- Interfaces ---

interface Project {
    _id: string;
    uniqueId: string;
    department: string;
    paymentStatus: string;
    quotedAmount?: number;
    paymentDetails?: {
        amount: number;
        paidAmount: number;
    };
}

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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// --- Helper Components ---

const MetricCard = ({ title, value, icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
                {icon}
            </div>
            {subValue && (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    {subValue}
                </span>
            )}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-tight mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
    </div>
);

export default function FinanceServicesPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/financial/all-payments`, {
                mode: 'cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Finance Service] Aggregate payments error (${res.status}):`, errText);
                throw new Error(`Load error: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                setProjects(data.data || []);
            } else {
                toast.error(data.message || 'Failed to load payments');
            }
        } catch (err: any) {
            console.error('[Finance Service] Aggregate payments load error:', err);
            toast.error(err.message || 'Error loading aggregate payments');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalPaid = projects.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);
        const totalQuoted = projects.reduce((sum, p) => sum + (p.paymentDetails?.amount || p.quotedAmount || 0), 0);
        return { totalPaid, totalQuoted, count: projects.length };
    }, [projects]);

    return (
        <div className="space-y-12">
            <Toaster position="top-right" />

            {/* Overall Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse flex flex-col gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                            <div className="space-y-2">
                                <div className="h-2 w-20 bg-slate-100 rounded"></div>
                                <div className="h-6 w-32 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <>
                        <MetricCard
                            title="Gross Paid"
                            value={`$${stats.totalPaid.toLocaleString()}`}
                            icon={<CheckCircle size={28} />}
                            color="bg-emerald-500"
                            subValue="Collected"
                        />
                        <MetricCard
                            title="Potential Revenue"
                            value={`$${stats.totalQuoted.toLocaleString()}`}
                            icon={<DollarSign size={28} />}
                            color="bg-indigo-500"
                            subValue="Quoted"
                        />
                        <MetricCard
                            title="Balance Due"
                            value={`$${(stats.totalQuoted - stats.totalPaid).toLocaleString()}`}
                            icon={<ArrowUpRight size={28} />}
                            color="bg-rose-500"
                            subValue="Outstanding"
                        />
                        <MetricCard
                            title="Volume"
                            value={stats.count}
                            icon={<FileText size={28} />}
                            color="bg-amber-500"
                            subValue="Total Projects"
                        />
                    </>
                )}
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {serviceConfig.map((service) => {
                    // Calculate individual service metrics
                    const serviceProjects = projects.filter(p =>
                        p.department.toLowerCase() === service.name.toLowerCase() ||
                        p.department.toLowerCase() === service.id.toLowerCase() ||
                        (service.id === 'ngs' && p.department.toUpperCase() === 'NGS')
                    );

                    const sPaid = serviceProjects.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);
                    const sQuoted = serviceProjects.reduce((sum, p) => sum + (p.paymentDetails?.amount || p.quotedAmount || 0), 0);
                    const sDue = sQuoted - sPaid;

                    return (
                        <Link
                            key={service.id}
                            href={`/manager-dashboard/department/finance/service/${service.id}`}
                            className="group relative bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col"
                        >
                            {/* Decorative Background Icon */}
                            <div className={`absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 scale-150 rotate-12 ${service.color}`}>
                                <service.icon size={160} />
                            </div>

                            <div className="relative z-10 flex-1">
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`w-16 h-16 rounded-3xl ${service.bgColor} ${service.color} flex items-center justify-center shadow-lg shadow-current/5 group-hover:scale-110 transition-transform duration-500`}>
                                        <service.icon size={32} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vol.</p>
                                        <p className="text-lg font-black text-slate-900">{serviceProjects.length}</p>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                    {service.name}
                                </h3>
                                <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                                    {service.description}
                                </p>

                                {/* Mini Metrics */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid</p>
                                        <p className="text-sm font-black text-emerald-600">${sPaid.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due</p>
                                        <p className="text-sm font-black text-rose-600">${sDue.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${service.borderColor} ${service.bgColor} ${service.color}`}>
                                        View Details
                                    </span>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
