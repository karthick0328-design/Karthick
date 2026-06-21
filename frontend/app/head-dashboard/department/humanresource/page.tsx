'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Activity, Clock, User, Search, ChevronRight,
    Users, Building, ShieldCheck, Download, Bell,
    TrendingUp, PieChart, BarChart3, Target, ShieldAlert,
    UserCircle2, UserCheck2, HeartHandshake, Award
} from 'lucide-react';

import HeadSidebar from '@/app/head-compontent/humanresource/sidebar';
import Header from '@/app/head-compontent/humanresource/header';

interface StatsCard {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: any;
    color: string;
    bg: string;
}

export default function HeadHRDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
            setTimeout(() => setLoading(false), 1000);
        } catch (error) {
            router.push('/Login/Signin');
        }
    }, [router]);

    const stats: StatsCard[] = [
        {
            title: 'Total Workforce',
            value: '428',
            change: '+12',
            trend: 'up',
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Active Recruitment',
            value: '14',
            change: 'Jobs',
            trend: 'up',
            icon: UserCheck2,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Staff Satisfaction',
            value: '4.8/5',
            change: '+0.2',
            trend: 'up',
            icon: HeartHandshake,
            color: 'text-rose-600',
            bg: 'bg-rose-50'
        },
        {
            title: 'Retention Rate',
            value: '96.4%',
            change: '+2.1%',
            trend: 'up',
            icon: Award,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        }
    ];

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading Personnel Hub...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            <HeadSidebar department="Human Resource" />

            <div className="flex-1 ml-72">
                <Header department="Personnel Management" />

                <main className="p-8 pb-20">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Hero Section */}
                        <div className="mb-10 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">HR Oversight</h1>
                                <p className="text-slate-500 mt-2 text-lg">Workforce strategic planning, talent acquisition monitoring, and employee relations.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm hover:shadow-lg transition-all text-slate-600">
                                    <Download size={18} />
                                    Workforce Analytics
                                </button>
                                <button className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all shadow-rose-100">
                                    <UserCircle2 size={18} />
                                    Launch Hires
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-500">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-1">{stat.value}</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Staffing Analytics */}
                            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-[500px]">
                                <div className="flex justify-between items-center mb-10">
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <BarChart3 className="text-rose-600" />
                                        Workforce Growth & Turnover
                                    </h2>
                                </div>
                                <div className="h-80 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                                    <p className="text-slate-400 font-bold italic">Departmental manpower trends visualization</p>
                                </div>
                            </div>

                            {/* Recent Hires */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                    <PieChart className="text-rose-600" />
                                    Recent Deployments
                                </h2>
                                <div className="space-y-6">
                                    {[
                                        { name: 'Dr. Emily Watson', role: 'Senior Pathologist', dept: 'NGS' },
                                        { name: 'Kevin Durant', role: 'Software Engineer', dept: 'Digital Hub' },
                                        { name: 'Linda Grey', role: 'Compliance Officer', dept: 'Financial' },
                                        { name: 'James Moriarty', role: 'Project Lead', dept: 'Drug Discovery' },
                                    ].map((hire, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs uppercase shadow-sm">
                                                {hire.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm tracking-tight">{hire.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{hire.role} • {hire.dept}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-lg shadow-slate-200">
                                    Full Staff Registry
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <Toaster position="bottom-right" />
        </div>
    );
}
