'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Search,
    Filter,
    Activity,
    Dna,
    TrendingUp,
    CheckCircle,
    Eye,
    Users,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import HeadSidebar from '@/app/head-compontent/sale/sidebar'; // Using sale sidebar as base or we might need a generic one

export default function HeadServiceDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [serviceName, setServiceName] = useState('Software Development');

    useEffect(() => {
        // In a real app, we'd fetch service-wide analytics for the Head
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            {/* We might need to pass the department to the sidebar */}
            <HeadSidebar department="Science" /> 

            <main className="flex-1 ml-72 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-4 transition-colors font-bold text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Department
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Dna className="w-10 h-10 text-indigo-600" />
                            {serviceName} Oversight
                        </h1>
                        <p className="text-slate-500 mt-1">Global service performance, resource allocation, and project status.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Active Projects', value: '42', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Total Experts', value: '18', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Avg. Completion', value: '92%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Pending Reviews', value: '5', icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stat.value}</h3>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Service Activity</h2>
                        <button className="px-6 py-2 bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl font-bold text-xs transition-all">
                            View Comprehensive Log
                        </button>
                    </div>
                    <div className="p-8 italic text-slate-400 text-center py-20">
                        Detailed service analytics and project tracking will appear here.
                    </div>
                </div>
            </main>
        </div>
    );
}
