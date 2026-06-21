'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Activity, Briefcase, Clock, DollarSign,
    FileText, User, Search, ChevronRight,
    Users, Building, ShieldCheck, Download, Bell, Menu, X,
    TrendingUp, PieChart, BarChart3, Target, ShieldAlert,
    Wallet, Receipt, Landmark
} from 'lucide-react';

import HeadSidebar from '@/app/head-compontent/finance/sidebar';
import Header from '@/app/head-compontent/finance/header';

interface StatsCard {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: any;
    color: string;
    bg: string;
}

export default function HeadFinanceDashboard() {
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
            title: 'Total Fiscal Rev',
            value: '₹12.8M',
            change: '+8.4%',
            trend: 'up',
            icon: Landmark,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Op. Expenditure',
            value: '₹3.1M',
            change: '+4.2%',
            trend: 'down',
            icon: Wallet,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Pending Approvals',
            value: '24',
            change: '+5',
            trend: 'up',
            icon: Receipt,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
        {
            title: 'Compliance Rate',
            value: '99.8%',
            change: '+0.1%',
            trend: 'up',
            icon: ShieldCheck,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        }
    ];

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading Fiscal Oversight...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            <HeadSidebar department="Financial" />

            <div className="flex-1 ml-72">
                <Header department="Financial Hub" />

                <main className="p-8 pb-20">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Hero Section */}
                        <div className="mb-10 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Oversight</h1>
                                <p className="text-slate-500 mt-2 text-lg">Central control for budget allocation, revenue streams, and corporate fiscal health.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm hover:shadow-lg transition-all text-slate-600">
                                    <Download size={18} />
                                    Download Ledger
                                </button>
                                <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all shadow-emerald-100">
                                    <TrendingUp size={18} />
                                    Balance Audits
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

                        {/* Financial Insights */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-96">
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                            <BarChart3 className="text-emerald-600" />
                                            Revenue vs Expenditure Flow
                                        </h2>
                                    </div>
                                    <div className="h-64 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                                        <p className="text-slate-400 font-bold italic">Fiscal performance chart visualization</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                    <h2 className="text-xl font-black text-slate-900 mb-8">Urgent Approvals Required</h2>
                                    <div className="space-y-4">
                                        {[
                                            { id: 'PAY-882', vendor: 'LabQuest Solutions', amount: '₹1,45,000', status: 'Pending Review' },
                                            { id: 'PAY-884', vendor: 'BioTech Supplies', amount: '₹84,200', status: 'Awaiting Sign-off' },
                                            { id: 'PAY-885', vendor: 'Digital Streams Inc', amount: '₹2,10,000', status: 'Verification Stage' },
                                        ].map((pay, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                                        <Receipt size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm">{pay.id}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{pay.vendor}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900 text-sm">{pay.amount}</p>
                                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">{pay.status}</p>
                                                </div>
                                                <button className="p-2 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg transition-colors">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                    <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                        <PieChart className="text-emerald-600" />
                                        Budget Distribution
                                    </h2>
                                    <div className="space-y-6">
                                        {[
                                            { name: 'Research & Lab', val: '45%', color: 'bg-emerald-500' },
                                            { name: 'Salaries', val: '30%', color: 'bg-indigo-500' },
                                            { name: 'Ops & IT', val: '15%', color: 'bg-blue-500' },
                                            { name: 'Legal/Compliance', val: '10%', color: 'bg-slate-400' },
                                        ].map((item, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
                                                    <span className="text-slate-500">{item.name}</span>
                                                    <span className="text-slate-900">{item.val}</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${item.color}`} style={{ width: item.val }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200">
                                    <h3 className="text-lg font-black uppercase tracking-tighter mb-4">Internal Audit Alert</h3>
                                    <p className="text-emerald-100 text-sm leading-relaxed mb-6 font-medium">The Q1 audit cycle is approaching. Ensure all department leads have submitted their ledger transparency reports by Friday.</p>
                                    <button className="w-full py-4 bg-white text-emerald-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform">
                                        Broadcast Alert
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <Toaster position="bottom-right" />
        </div>
    );
}
