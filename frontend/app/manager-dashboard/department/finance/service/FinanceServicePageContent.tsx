'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import {
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    TrendingUp,
    AlertCircle,
    FileText,
    Eye,
    Send,
    Filter,
    Wallet,
    ArrowUpRight
} from 'lucide-react';

// --- Types ---

interface Project {
    _id: string;
    uniqueId: string;
    userId: {
        name: string;
        email: string;
        uniqueId: string;
    };
    department: string;
    category: string;
    status: string;
    paymentStatus: string;
    quotedAmount?: number;
    paymentDetails?: {
        amount: number;
        paidAmount: number;
        paymentMethod: string;
        transactionId?: string;
        isVerified?: boolean;
    };
    financialReview?: {
        requested: boolean;
        status: string;
        requestedAmount: number;
        requestReason: string;
        requestedBy: { name: string };
    };
    submittedAt: string;
    createdAt: string;
    formData?: any;
}

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
        <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
    </div>
);

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
        {children}
    </span>
);

const Modal = ({ children, title, onClose }: any) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 text-2xl">×</button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar font-sans">
                {children}
            </div>
        </div>
    </div>
);

// --- Main Component ---

export default function FinanceServicePageContent({ department }: { department: string }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    useEffect(() => {
        loadData();
    }, [department]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/financial/all-payments?department=${encodeURIComponent(department)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProjects(data.data || []);
            }
        } catch (err) {
            toast.error('Error loading payments');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const totalPaid = projects.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);
        const totalQuoted = projects.reduce((sum, p) => sum + (p.paymentDetails?.amount || p.quotedAmount || 0), 0);
        const paidCount = projects.filter(p => p.paymentStatus === 'Full Paid').length;
        return { totalPaid, totalQuoted, paidCount, count: projects.length };
    }, [projects]);

    const filteredProjects = useMemo(() => {
        let filtered = projects;
        if (activeTab === 'unpaid') filtered = filtered.filter(p => !p.paymentDetails?.paidAmount);
        if (activeTab === 'partial') filtered = filtered.filter(p => p.paymentStatus === '50% Paid');
        if (activeTab === 'paid') filtered = filtered.filter(p => p.paymentStatus === 'Full Paid' || p.paymentStatus === 'Official Receipt Issued');

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.uniqueId.toLowerCase().includes(q) || p.userId.name.toLowerCase().includes(q));
        }
        return filtered;
    }, [projects, activeTab, searchTerm]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Full Paid':
            case 'Official Receipt Issued': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case '50% Paid': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    if (loading) return <div className="flex h-[60vh] items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-10">
            <Toaster />

            {/* Controls Row (Main header handled by layout) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="lg:hidden">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                        {department || 'All Services'} <span className="text-indigo-600">Payments</span>
                    </h1>
                </div>
                <div className="flex gap-4 ml-auto">
                    <button onClick={loadData} className="px-6 py-3 bg-white border border-slate-100 text-slate-900 font-black rounded-2xl hover:bg-slate-50 shadow-sm transition-all uppercase text-xs tracking-widest">Refresh</button>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="SEARCH BY ID..."
                            className="bg-white border-0 ring-1 ring-slate-100 shadow-sm rounded-2xl pl-12 pr-6 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none w-64 uppercase tracking-tighter"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Gross Paid" value={`$${stats.totalPaid.toLocaleString()}`} icon={<CheckCircle size={28} />} color="bg-emerald-500" subValue="Collected" />
                <MetricCard title="Potential Revenue" value={`$${stats.totalQuoted.toLocaleString()}`} icon={<DollarSign size={28} />} color="bg-indigo-500" subValue="Quoted" />
                <MetricCard title="Balance Due" value={`$${(stats.totalQuoted - stats.totalPaid).toLocaleString()}`} icon={<ArrowUpRight size={28} />} color="bg-rose-500" subValue="Outstanding" />
                <MetricCard title="Volume" value={stats.count} icon={<FileText size={28} />} color="bg-amber-500" subValue="Total Projects" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                    <div className="flex gap-2">
                        {['all', 'unpaid', 'partial', 'paid'].map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[650px] overflow-y-auto custom-scrollbar font-sans">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-slate-50">
                            <tr className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                                <th className="px-8 py-6">Project Context</th>
                                <th className="px-8 py-6">Client Identity</th>
                                <th className="px-8 py-6">Paid Amount</th>
                                <th className="px-8 py-6">Total Due</th>
                                <th className="px-8 py-6">Payment Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProjects.map(p => (
                                <tr key={p._id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedProject(p)}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                                {p.uniqueId.slice(-2)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm tracking-tight">{p.uniqueId}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-slate-800 tracking-tight">{p.userId.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{p.userId.email}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <p className="text-lg font-black text-emerald-600 tracking-tighter">
                                                ${(p.paymentDetails?.paidAmount || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-black text-slate-900 tracking-tight">
                                            ${(p.paymentDetails?.amount || p.quotedAmount || 0).toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge color={getStatusStyle(p.paymentStatus)}>{p.paymentStatus}</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedProject && (
                <Modal title="Payment Verification" onClose={() => setSelectedProject(null)}>
                    <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedProject.uniqueId}</h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{selectedProject.department} // {selectedProject.category}</p>
                            </div>
                            <Badge color={getStatusStyle(selectedProject.paymentStatus)}>{selectedProject.paymentStatus}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2 p-8 bg-slate-900 rounded-[32px] text-white flex justify-between items-center relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:scale-110"></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Paid Amount</p>
                                    <h2 className="text-4xl font-black tracking-tighter text-emerald-400 block">${(selectedProject.paymentDetails?.paidAmount || 0).toLocaleString()}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Quoted Total</p>
                                    <h2 className="text-2xl font-black tracking-tighter">${(selectedProject.paymentDetails?.amount || selectedProject.quotedAmount || 0).toLocaleString()}</h2>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Client Detail</h4>
                                <p className="font-black text-slate-900">{selectedProject.userId.name}</p>
                                <p className="text-xs text-slate-500 font-bold">{selectedProject.userId.email}</p>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Transaction Info</h4>
                                <p className="text-xs font-black text-slate-900 uppercase">Method: {selectedProject.paymentDetails?.paymentMethod || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {selectedProject.paymentDetails?.transactionId || 'NOT RECORDED'}</p>
                            </div>
                        </div>

                        {selectedProject.financialReview?.requested && (
                            <div className="p-8 bg-indigo-600 rounded-[32px] text-white">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-indigo-200"><AlertCircle size={14} /> Manager Review Requested</h4>
                                <p className="text-xs font-black text-indigo-100 mb-2 italic">"{selectedProject.financialReview.requestReason}"</p>
                                <div className="flex justify-between items-end mt-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-indigo-300">Requested Amount</p>
                                        <p className="text-2xl font-black tracking-tighter">${selectedProject.financialReview.requestedAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-indigo-300">By Manager</p>
                                        <p className="text-sm font-black">{selectedProject.financialReview.requestedBy.name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button onClick={() => setSelectedProject(null)} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all uppercase text-xs tracking-widest">Acknowledge</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
