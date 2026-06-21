'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    TrendingUp,
    DollarSign,
    Briefcase,
    Wallet,
    Clock,
    ArrowRight,
    ChevronRight,
    Filter,
    Download,
    Calendar,
    PieChart as PieChartIcon,
    Search,
    ArrowUpRight,
    Building2,
    Trash2,
    Eye,
    FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---

interface UserType {
    _id: string;
    name: string;
    email: string;
    uniqueId: string;
    department: string;
    role: string;
}

interface ProjectPayment {
    _id: string;
    uniqueId: string;
    userId: { name: string; email: string };
    paymentDetails?: { paidAmount: number };
    createdAt: string;
    paidAt?: string;
    status: string;
}

interface ExpenseRecord {
    _id: string;
    receiptDate: string;
    category: string;
    totalAmount: number;
    paidTo: string;
    paymentMode: string;
    description?: string;
}

const API_PROJECTS = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';
const API_EXPENSES = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/expenses';

export default function FinanceAnalyticsPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [payments, setPayments] = useState<ProjectPayment[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
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
            fetchCombinedData(token);
        } catch (err) {
            router.push('/Login/Signin');
        }
    }, [router]);

    const fetchCombinedData = async (token: string) => {
        setLoading(true);
        try {
            const [paymentsRes, expensesRes] = await Promise.all([
                fetch(`${API_PROJECTS}/financial/all-payments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(API_EXPENSES, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const [paymentsData, expensesData] = await Promise.all([
                paymentsRes.json(),
                expensesRes.json()
            ]);

            if (paymentsData.success) setPayments(paymentsData.data || []);
            if (expensesData.success) setExpenses(expensesData.data || []);
        } catch (err) {
            toast.error('Failed to sync financial intelligence');
        } finally {
            setLoading(false);
        }
    };

    const chartData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const result: { m: string, rev: number, exp: number, month: number, year: number }[] = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                m: months[d.getMonth()],
                rev: 0,
                exp: 0,
                month: d.getMonth(),
                year: d.getFullYear()
            });
        }

        payments.forEach(p => {
            const pDate = new Date(p.paidAt || p.createdAt);
            const amount = p.paymentDetails?.paidAmount || 0;
            result.forEach(r => {
                if (pDate.getMonth() === r.month && pDate.getFullYear() === r.year) {
                    r.rev += amount;
                }
            });
        });

        expenses.forEach(e => {
            const eDate = new Date(e.receiptDate);
            result.forEach(r => {
                if (eDate.getMonth() === r.month && eDate.getFullYear() === r.year) {
                    r.exp += e.totalAmount;
                }
            });
        });

        const maxVal = Math.max(...result.map(r => Math.max(r.rev, r.exp, 1)));
        return result.map(r => ({
            ...r,
            revHeight: (r.rev / (maxVal * 1.2)) * 100,
            expHeight: (r.exp / (maxVal * 1.2)) * 100,
        }));
    }, [payments, expenses]);

    const expenseBreakdown = useMemo(() => {
        const breakdown: { [key: string]: number } = {};
        expenses.forEach(e => {
            breakdown[e.category] = (breakdown[e.category] || 0) + e.totalAmount;
        });
        return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const netProfit = totalRevenue - totalExpenses;

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full shadow-xl shadow-indigo-100"
                    />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Aggregating Global Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto p-12 space-y-16 pb-32 font-sans bg-white min-h-screen">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-indigo-600 flex items-center gap-2 mb-6 group transition-all">
                        <ArrowRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Return to Command</span>
                    </button>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Financial <span className="text-indigo-600">Intelligence</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-4 flex items-center gap-2">
                        Consolidated Enterprise Reporting <span className="w-8 h-px bg-slate-200"></span> Live Data Feed
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-8 py-5 bg-white border border-slate-100 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 shadow-sm hover:border-slate-300 transition-all">
                        <Calendar size={16} /> Last 12 Months
                    </button>
                    <button className="flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 transition-all active:scale-95">
                        <Download size={16} /> Export Intelligence
                    </button>
                </div>
            </div>

            {/* Executive KPI Overview */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                <KPICard title="Gross Inflow" value={`$${totalRevenue.toLocaleString()}`} trend="+14.2%" color="text-emerald-500" bgColor="bg-emerald-50" icon={<TrendingUp />} />
                <KPICard title="Total Outflow" value={`$${totalExpenses.toLocaleString()}`} trend="-2.4%" color="text-rose-500" bgColor="bg-rose-50" icon={<Wallet />} />
                <KPICard title="Net Operations" value={`$${netProfit.toLocaleString()}`} trend="Stable" color="text-indigo-600" bgColor="bg-indigo-50" icon={<DollarSign />} />
                <KPICard title="Active Contracts" value={payments.length} trend="Growing" color="text-blue-500" bgColor="bg-blue-50" icon={<Briefcase />} />
            </section>

            {/* Primary Analytics Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">

                {/* Comparison Bar Graph */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-2 bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-16 underline-offset-8">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Operational Performance</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-4">
                                Revenue vs Expense Comparison <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> Revenue</span><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Expense</span>
                            </p>
                        </div>
                    </div>

                    <div className="h-96 w-full relative">
                        <div className="absolute inset-0 flex flex-col justify-between py-2">
                            {[4, 3, 2, 1, 0].map(i => (
                                <div key={i} className="flex items-center gap-6">
                                    <span className="text-[9px] font-black text-slate-300 w-12">$ {i * 25}k</span>
                                    <div className="flex-1 h-px bg-slate-50"></div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Velocity Trajectories (Line & Dots) */}
                        <div className="absolute inset-0 left-16 right-4 pointer-events-none">
                            <svg className="w-full h-full overflow-visible">
                                {/* Revenue Line */}
                                <motion.path
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                                    d={chartData.map((bar, i) => {
                                        const x = (i / (chartData.length - 1)) * 100;
                                        const y = 100 - bar.revHeight;
                                        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#ff4d4f"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Expense Line */}
                                <motion.path
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.4 }}
                                    transition={{ duration: 2, delay: 0.7, ease: "easeInOut" }}
                                    d={chartData.map((bar, i) => {
                                        const x = (i / (chartData.length - 1)) * 100;
                                        const y = 100 - bar.expHeight;
                                        return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth="3"
                                    strokeDasharray="8,8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                {/* Revenue Dots */}
                                {chartData.map((bar, i) => (
                                    <motion.circle
                                        key={`rev-${i}`}
                                        cx={`${(i / (chartData.length - 1)) * 100}%`}
                                        cy={`${100 - bar.revHeight}%`}
                                        r="5"
                                        fill="white"
                                        stroke="#ff4d4f"
                                        strokeWidth="3"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1.5 + (i * 0.1), type: "spring" }}
                                    />
                                ))}

                                {/* Expense Dots */}
                                {chartData.map((bar, i) => (
                                    <motion.circle
                                        key={`exp-${i}`}
                                        cx={`${(i / (chartData.length - 1)) * 100}%`}
                                        cy={`${100 - bar.expHeight}%`}
                                        r="4"
                                        fill="white"
                                        stroke="#6366f1"
                                        strokeWidth="2"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1.7 + (i * 0.1), type: "spring" }}
                                    />
                                ))}
                            </svg>
                        </div>

                        <div className="absolute inset-0 left-16 right-4 flex items-end justify-between px-4">
                            {chartData.map((bar, i) => (
                                <div key={i} className="flex flex-col items-center gap-6 group/bar w-16">
                                    <div className="flex items-end gap-1.5 h-full opacity-10 group-hover/bar:opacity-30 transition-opacity">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${bar.revHeight}%` }}
                                            className="w-5 bg-indigo-600 rounded-t-lg"
                                        />
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${bar.expHeight}%` }}
                                            className="w-5 bg-rose-400 rounded-t-lg"
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 group-hover/bar:text-slate-900 transition-colors uppercase">{bar.m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Categories Breakdown */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-3xl shadow-slate-900/60 flex flex-col"
                >
                    <div className="flex items-center gap-4 mb-12">
                        <div className="p-4 bg-white/10 rounded-2xl">
                            <PieChartIcon size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Outflow Index</h3>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Category Expenditure Weight</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-8 custom-scrollbar overflow-y-auto pr-2">
                        {expenseBreakdown.map(([cat, val], idx) => (
                            <div key={cat} className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase">
                                    <span className="text-slate-400 tracking-wider font-bold">{cat}</span>
                                    <span className="text-white">${val.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(val / (totalExpenses || 1)) * 100}%` }}
                                        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                                        className="h-full bg-indigo-500 rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                        {expenseBreakdown.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                                <Search size={48} />
                                <p className="text-[10px] uppercase font-black tracking-[0.2em]">No Expense Intelligence</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <button className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all">Strategic Review</button>
                    </div>
                </motion.div>
            </div>

            {/* Unified Master Ledger */}
            <section className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-12">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Master Financial Registry</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            Combined Project Payments & Departmental Expenses <span className="w-12 h-px bg-slate-100"></span> Total {payments.length + expenses.length} Operations
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" placeholder="FILTER BY ID, CATEGORY OR PAYEE..." className="bg-white rounded-[1.5rem] pl-14 pr-8 py-4 text-[10px] font-black uppercase tracking-widest border border-slate-200 focus:border-indigo-500 outline-none w-80 transition-all placeholder:text-slate-300" />
                        </div>
                        <button className="px-8 py-4 text-[10px] font-black uppercase tracking-widest bg-white text-slate-900 rounded-[1.5rem] border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"><Filter size={14} className="inline mr-2" /> Global Filter</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] rounded-[2rem]">
                                <th className="px-10 py-8 rounded-l-[2rem]">Classification</th>
                                <th className="px-10 py-8">Entity & Timing</th>
                                <th className="px-10 py-8">Operational Flow</th>
                                <th className="px-10 py-8 text-right pr-20 rounded-r-[2rem]">Net Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* Simplified mixed view for demo purposes */}
                            {[...payments.slice(0, 10), ...expenses.slice(0, 10)]
                                .sort((a, b) => new Date((b as any).paidAt || (b as any).receiptDate || (b as any).createdAt).getTime() - new Date((a as any).paidAt || (a as any).receiptDate || (a as any).createdAt).getTime())
                                .map((row: any, i) => (
                                    <motion.tr
                                        key={row._id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${row.category ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'} shadow-sm group-hover:scale-105 transition-transform`}>
                                                    {row.category ? <Wallet size={20} /> : <Briefcase size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{row.uniqueId || 'EXP-R'}</p>
                                                    <p className="text-base font-black text-slate-900 tracking-tight">{row.category || 'Project Milestone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-slate-700 capitalize">{row.userId?.name || row.paidTo}</p>
                                                <p className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                                                    <Calendar size={12} /> {new Date(row.paidAt || row.receiptDate || row.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm">
                                                <span className={`w-1.5 h-1.5 rounded-full ${row.category ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{row.category ? 'Expenditure' : 'Inflow Asset'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right pr-20">
                                            <p className={`text-xl font-black tracking-tighter ${row.category ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                {row.category ? '-' : '+'}${(row.paymentDetails?.paidAmount || row.totalAmount || 0).toLocaleString()}
                                            </p>
                                            <p className="text-[8px] font-black text-slate-300 uppercase mt-1 tracking-widest">Digital Settlement Verified</p>
                                        </td>
                                    </motion.tr>
                                ))}
                        </tbody>
                    </table>
                    {(payments.length === 0 && expenses.length === 0) && (
                        <div className="py-40 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                <FileText size={40} />
                            </div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">No registry entries discovered</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

// --- Helper Components ---

function KPICard({ title, value, trend, color, bgColor, icon }: any) {
    return (
        <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group"
        >
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${bgColor} opacity-20 group-hover:scale-150 transition-transform duration-700`} />
            <div className="relative flex items-center justify-between">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
                    <div>
                        <h3 className={`text-4xl font-black tracking-tighter ${color} mb-1`}>{value}</h3>
                        <div className={`flex items-center gap-1.5 text-[9px] font-black tracking-[0.2em] ${trend.startsWith('-') ? 'text-rose-400' : 'text-emerald-500'}`}>
                            {trend.startsWith('+') ? <ArrowUpRight size={12} /> : null}
                            {trend} Metrics
                        </div>
                    </div>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${color} ${bgColor} shadow-inner`}>
                    {React.cloneElement(icon, { size: 24 })}
                </div>
            </div>
        </motion.div>
    );
}
