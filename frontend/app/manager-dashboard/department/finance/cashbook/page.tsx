'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    DollarSign,
    TrendingUp,
    Clock,
    ArrowRight,
    Wallet,
    Calendar,
    Filter,
    ChevronRight,
    Plus,
    ArrowDownCircle,
    ArrowUpCircle,
    FileText,
    Search,
    X,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateURL } from '@/lib/validation';

// --- Types ---

interface UserType {
    _id: string;
    name: string;
    email: string;
    uniqueId: string;
    department: string;
    role: string;
}

interface Transaction {
    _id: string;
    date: string;
    description: string;
    source: string;
    debit: number;
    credit: number;
    type: 'Manual' | 'Expense' | 'Purchase';
    status: string;
    billUrl?: string;
}

interface Summary {
    openingBalance: number;
    netCashFlow: number;
    closingBalance: number;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/cashbook';

export default function CashBookPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary>({ openingBalance: 0, netCashFlow: 0, closingBalance: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Modal State
    const [entryType, setEntryType] = useState<'Cash In' | 'Cash Out'>('Cash In');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            setUser({
                _id: decoded._id || decoded.id,
                name: decoded.name || 'Manager',
                email: decoded.email,
                uniqueId: decoded.uniqueId,
                department: decoded.department,
                role: decoded.role
            });
            fetchTransactions(token);
        } catch (err) {
            router.push('/Login/Signin');
        }
    }, [router, startDate, endDate]);

    const fetchTransactions = async (token: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/transactions?startDate=${startDate}&endDate=${endDate}`, {
                mode: 'cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Cashbook] Fetch transactions error (${res.status}):`, errText);
                throw new Error(`Load error: ${res.status}`);
            }

            const result = await res.json();
            if (result.success) {
                setTransactions(result.data || []);
                setSummary(result.summary);
            } else {
                toast.error(result.message || 'Failed to fetch transactions');
            }
        } catch (err: any) {
            console.error('[Cashbook] Fetch transactions load error:', err);
            toast.error(err.message || 'Network error. Failed to load cash book.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) {
            toast.error('Please fill all fields');
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/entry`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    type: entryType,
                    amount: parseFloat(amount),
                    description,
                    date: new Date().toISOString()
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Cashbook] Add entry error (${res.status}):`, errText);
                throw new Error(`Save error: ${res.status}`);
            }

            const result = await res.json();
            if (result.success) {
                toast.success('Entry added successfully');
                setShowModal(false);
                setAmount('');
                setDescription('');
                if (token) fetchTransactions(token);
            } else {
                toast.error(result.message || 'Failed to add entry');
            }
        } catch (err: any) {
            console.error('[Cashbook] Add entry error:', err);
            toast.error(err.message || 'Network error. Failed to save entry.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && transactions.length === 0) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full shadow-xl"
                    />
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Synchronizing Ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-8 pb-24">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#0F172A] tracking-tight">Cash Book Management</h1>
                    <p className="text-slate-500 font-medium mt-1">Track daily cash flow, expenses, and closing reports</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:scale-105 transition-transform">
                        <TrendingUp size={18} />
                        LIVE LEDGER
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-400 rounded-xl text-sm font-bold border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors">
                        <Clock size={18} />
                        CLOSING HISTORY
                    </button>
                </div>
            </div>

            {/* Filter & Action Row */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0"
                        />
                        <span className="text-slate-300 mx-1">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0"
                        />
                    </div>
                    <button className="p-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 hover:text-indigo-600 transition-colors">
                        <Filter size={18} />
                    </button>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0F172A] text-white rounded-2xl text-sm font-black tracking-widest uppercase shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
                >
                    <Plus size={20} strokeWidth={3} />
                    ADD ENTRY
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                    label="OPENING BALANCE"
                    value={`₹${summary.openingBalance.toLocaleString()}`}
                    subtext="Carried forward"
                    icon={<ArrowRight className="text-indigo-500 rotate-[-45deg]" size={40} />}
                    bgColor="bg-indigo-50/50"
                />
                <SummaryCard
                    label="NET CASH FLOW"
                    value={`${summary.netCashFlow >= 0 ? '+' : ''}₹${summary.netCashFlow.toLocaleString()}`}
                    subtext="For selected period"
                    icon={<TrendingUp className="text-emerald-500" size={40} />}
                    bgColor="bg-emerald-50/50"
                    valueColor={summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                />
                <SummaryCard
                    label="CLOSING BALANCE"
                    value={`₹${summary.closingBalance.toLocaleString()}`}
                    subtext="Cash in hand"
                    icon={<DollarSign className="text-white/20" size={50} />}
                    bgColor="bg-[#0F172A]"
                    isDark
                />
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-slate-400" />
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Detailed Transactions</h3>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            className="pl-12 pr-6 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Debit (In)</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Credit (Out)</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.length > 0 ? (
                                transactions.map((tx, idx) => (
                                    <tr key={tx._id} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="py-6 px-8 whitespace-nowrap">
                                            <p className="text-sm font-black text-slate-900">{new Date(tx.date).toLocaleDateString()}</p>
                                            <p className="text-[10px] font-medium text-slate-400">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="py-6 px-8 max-w-xs">
                                            <p className="text-sm font-black text-slate-700 line-clamp-1">{tx.description}</p>
                                        </td>
                                        <td className="py-6 px-8">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${tx.type === 'Manual' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                tx.type === 'Expense' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                }`}>
                                                {tx.source}
                                            </span>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            {tx.debit > 0 ? <span className="text-sm font-black text-emerald-600">+₹{tx.debit.toLocaleString()}</span> : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            {tx.credit > 0 ? <span className="text-sm font-black text-rose-600">-₹{tx.credit.toLocaleString()}</span> : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-sm font-black text-slate-900">₹{(tx.debit || 0) + (tx.credit || 0)}</span>
                                                {tx.billUrl && (() => {
                                                    const rawUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${tx.billUrl}`;
                                                    const safeUrl = (rawUrl.startsWith('http') || rawUrl.startsWith('/')) ? validateURL(rawUrl) : '#';
                                                    return (
                                                        <a
                                                            href={tx.billUrl && (tx.billUrl.startsWith('/') || tx.billUrl.startsWith('http')) ? validateURL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${tx.billUrl}`) : '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                                            title="View Bill"
                                                        >
                                                            <FileText size={14} />
                                                        </a>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                <FileText size={32} />
                                            </div>
                                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No transactions found for this period</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Entry Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10"
                        >
                            <form onSubmit={handleAddEntry} className="p-10 space-y-8">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Add Cash Entry</h2>
                                        <p className="text-slate-400 font-medium text-sm mt-1">Record manual cash in/out</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => !isSubmitting && setShowModal(false)}
                                        className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Type Selector */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setEntryType('Cash In')}
                                        className={`flex items-center justify-center gap-3 py-5 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${entryType === 'Cash In'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-100'
                                            : 'bg-slate-50 border-transparent text-slate-400'
                                            }`}
                                    >
                                        <ArrowDownCircle size={18} />
                                        CASH IN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEntryType('Cash Out')}
                                        className={`flex items-center justify-center gap-3 py-5 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${entryType === 'Cash Out'
                                            ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-lg shadow-rose-100'
                                            : 'bg-slate-50 border-transparent text-slate-400'
                                            }`}
                                    >
                                        <ArrowUpCircle size={18} />
                                        CASH OUT
                                    </button>
                                </div>

                                {/* Input Fields */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors font-black">₹</div>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-xl text-slate-900 focus:ring-0 transition-all placeholder:text-slate-200"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea
                                            placeholder="e.g. Petty Cash, Tea, etc."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-medium text-slate-700 focus:ring-0 transition-all placeholder:text-slate-200 resize-none"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="py-5 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="py-5 bg-[#0F172A] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'SAVE ENTRY'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SummaryCard({ label, value, subtext, icon, bgColor, valueColor = 'text-[#0F172A]', isDark = false }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${bgColor} p-10 rounded-[2.5rem] border border-slate-100/10 relative overflow-hidden group hover:shadow-xl transition-all duration-500`}
        >
            <div className="absolute right-[-10px] top-[-10px] transition-transform duration-700 group-hover:scale-110 opacity-60">
                {icon}
            </div>
            <div className="relative z-10 space-y-2">
                <p className={`text-[10px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-[0.2em]`}>{label}</p>
                <h3 className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : valueColor}`}>{value}</h3>
                <p className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'} uppercase tracking-widest mt-4`}>{subtext}</p>
            </div>
        </motion.div>
    );
}
