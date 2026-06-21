'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    ArrowLeft,
    Download,
    FileJson,
    Calendar,
    ChevronDown,
    FileText,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

interface GSTData {
    period: { month: string; year: string };
    summary: {
        netGSTPayable: number;
        totalOutputTax: number;
        totalInputTax: number;
    };
    outputTax: {
        total: number;
        igst: number;
        cgst: number;
        sgst: number;
    };
    inputTax: {
        total: number;
        igst: number;
        cgst: number;
        sgst: number;
    };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/gst';

export default function GSTReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<GSTData | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        fetchReport();
    }, [selectedMonth, selectedYear]);

    const fetchReport = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/report?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                toast.error(result.message || 'Failed to fetch report');
            }
        } catch (err) {
            toast.error('Network error. Failed to load GST report.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        toast.success("Preparing CSV Export...");
        // CSV logic would go here
    };

    const handleDownloadJSON = () => {
        toast.success("Generating GSTR JSON...");
        // JSON logic would go here
    };

    if (loading && !data) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-16 h-16 border-[6px] border-blue-600 border-t-transparent rounded-full shadow-xl"
                    />
                    <p className="text-slate-400 font-extrabold uppercase tracking-[0.3em] text-xs">Generating Tax Report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] p-4 lg:p-10 space-y-10 pb-32">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-100 transition-all active:scale-95"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">GST Report</h1>
                        <p className="text-slate-400 font-bold text-sm mt-0.5">Input Tax Credit vs Output Tax Liability</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent border-none text-sm font-black text-slate-600 focus:ring-0 cursor-pointer px-4 py-2"
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent border-none text-sm font-black text-slate-600 focus:ring-0 cursor-pointer px-4 py-2"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-6 py-3 bg-[#10A37F] text-white rounded-xl text-sm font-black tracking-wide shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                    >
                        <Download size={18} strokeWidth={3} />
                        EXPORT CSV
                    </button>
                </div>
            </header>

            {/* Net GST Payable Card */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-r from-[#4E4AF2] via-[#5C58FF] to-[#726DFF] rounded-[2.5rem] p-12 text-white shadow-2xl shadow-blue-200"
            >
                {/* Abstract visual elements */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 overflow-hidden opacity-20 pointer-events-none">
                    <div className="flex items-end justify-between h-full px-10 gap-2">
                        <div className="w-8 bg-white/40 h-1/4 rounded-t-xl" />
                        <div className="w-8 bg-white/60 h-1/2 rounded-t-xl" />
                        <div className="w-8 bg-white/40 h-1/3 rounded-t-xl" />
                        <div className="w-8 bg-white/80 h-3/4 rounded-t-xl" />
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <p className="text-xs font-black text-blue-100 uppercase tracking-[0.3em]">Net GST Payable (Output - Input Credit)</p>
                    <h2 className="text-7xl font-black tracking-tighter">₹ {data?.summary.netGSTPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                        <Calendar size={14} className="text-white/70" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{months[selectedMonth - 1]} {selectedYear}</span>
                    </div>
                </div>
            </motion.section>

            {/* Split Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Output Tax Details */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-xl shadow-slate-100/50"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-2">Output Tax (Sales)</h3>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">₹ {data?.outputTax.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <span className="px-4 py-1.5 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-rose-100">LIABILITY</span>
                    </div>

                    <div className="space-y-6">
                        <TaxRow label="IGST" value={data?.outputTax.igst || 0} />
                        <TaxRow label="CGST" value={data?.outputTax.cgst || 0} />
                        <TaxRow label="SGST" value={data?.outputTax.sgst || 0} />
                    </div>
                </motion.div>

                {/* Input Tax Credit Details */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-xl shadow-slate-100/50"
                >
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">Input Tax Credit (Purchases & Expenses)</h3>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">₹ {data?.inputTax.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100">CREDIT (ITC)</span>
                    </div>

                    <div className="space-y-6">
                        <TaxRow label="IGST" value={data?.inputTax.igst || 0} />
                        <TaxRow label="CGST" value={data?.inputTax.cgst || 0} />
                        <TaxRow label="SGST" value={data?.inputTax.sgst || 0} />
                    </div>
                </motion.div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-center pt-6">
                <button
                    onClick={handleDownloadJSON}
                    className="flex items-center gap-4 px-10 py-5 bg-[#C2581A] text-white rounded-[1.5rem] text-sm font-black tracking-[0.1em] uppercase shadow-2xl shadow-orange-100 hover:bg-[#A64812] transition-all active:scale-95 group"
                >
                    <FileJson size={22} className="group-hover:rotate-12 transition-transform" />
                    DOWNLOAD GSTR JSON
                </button>
            </div>
        </div>
    );
}

function TaxRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 group">
            <span className="text-sm font-black text-slate-400 group-hover:text-slate-600 transition-colors">{label}</span>
            <span className="text-base font-black text-slate-800 tracking-tight">₹ {value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
    );
}
