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
    Dna, Cpu, FlaskConical, Microscope
} from 'lucide-react';

import HeadSidebar from '@/app/head-compontent/sale/sidebar';
import Header from '@/app/head-compontent/sale/header';

interface StatsCard {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    icon: any;
    color: string;
    bg: string;
}

export default function HeadSalesDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
            // Simulate data loading
            setTimeout(() => setLoading(false), 1000);
        } catch (error) {
            router.push('/Login/Signin');
        }

        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    const stats: StatsCard[] = [
        {
            title: 'Q1 Sales Revenue',
            value: '₹4.2M',
            change: '+12.5%',
            trend: 'up',
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Department Efficiency',
            value: '94.2%',
            change: '+2.1%',
            trend: 'up',
            icon: Activity,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Active Projects',
            value: '158',
            change: '+18',
            trend: 'up',
            icon: Briefcase,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Operational Risks',
            value: '3',
            change: '-2',
            trend: 'down',
            icon: ShieldAlert,
            color: 'text-rose-600',
            bg: 'bg-rose-50'
        }
    ];

    const services = [
        { name: 'NGS', lead: 'Dr. Sarah Wilson', status: 'Healthy', progress: 85, color: 'bg-indigo-500' },
        { name: 'Drug Discovery', lead: 'Dr. Michael Chen', status: 'Healthy', progress: 72, color: 'bg-blue-500' },
        { name: 'Software Dev', lead: 'Alex Rivnas', status: 'Critical', progress: 45, color: 'bg-rose-500' },
        { name: 'Bio-Chemistry', lead: 'Jane Cooper', status: 'Healthy', progress: 91, color: 'bg-emerald-500' },
    ];

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading Executive Hub...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            <HeadSidebar department="Sales and Customer Services" />

            <div className="flex-1 ml-72">
                <Header department="Sales Center" />

                <main className="p-8 pb-20">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Hero Section */}
                        <div className="mb-10 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Oversite</h1>
                                <p className="text-slate-500 mt-2 text-lg">Comprehensive analytics and strategic performance monitor for the Sales Department.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm hover:shadow-lg transition-all text-slate-600">
                                    <Download size={18} />
                                    Generate Annual Report
                                </button>
                                <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all shadow-indigo-100">
                                    <TrendingUp size={18} />
                                    Forecast Q2
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

                        {/* Insights & Services */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                            {/* Department Performance */}
                            <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center mb-10">
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <BarChart3 className="text-indigo-600" />
                                        Department Performance Matrix
                                    </h2>
                                    <div className="flex bg-slate-50 p-1.5 rounded-xl gap-2 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                                        <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-sm">Monthly</button>
                                        <button className="px-4 py-2 hover:text-slate-600 transition-colors">Quarterly</button>
                                        <button className="px-4 py-2 hover:text-slate-600 transition-colors">Yearly</button>
                                    </div>
                                </div>
                                <div className="h-80 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <Activity className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-bold italic">Real-time performance analytics visualization</p>
                                    </div>
                                </div>
                            </div>

                            {/* Service Health */}
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                    <ShieldCheck className="text-indigo-600" />
                                    Service Health
                                </h2>
                                <div className="space-y-6">
                                    {services.map((service, i) => (
                                        <div key={i} className="group">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm tracking-tight">{service.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{service.lead}</p>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${service.status === 'Healthy' ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                                                    {service.status}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${service.color} transition-all duration-1000`} 
                                                    style={{ width: `${service.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-8 py-4 border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                                    Full Service Audit
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-slate-900">Recent Department Decisions</h2>
                                <button className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                    Decision Log <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { title: 'Project Allocation', desc: 'Assigned NGS pipeline expansion to Molecular Team.', time: '2h ago', icon: Target },
                                    { title: 'Budget Adjustment', desc: 'Approved accessory funding for Lab-B upgrades.', time: '5h ago', icon: DollarSign },
                                    { title: 'Personnel Update', desc: 'Promoted Dr. Sarah to Head of NGS Service.', time: '1d ago', icon: Users },
                                ].map((item, i) => (
                                    <div key={i} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                                        <div className="flex h-10 w-10 bg-white rounded-xl items-center justify-center mb-4 shadow-sm text-indigo-600">
                                            <item.icon size={20} />
                                        </div>
                                        <h4 className="font-black text-slate-900 mb-1">{item.title}</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed mb-4">{item.desc}</p>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={10} /> {item.time}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <Toaster position="bottom-right" />
        </div>
    );
}
