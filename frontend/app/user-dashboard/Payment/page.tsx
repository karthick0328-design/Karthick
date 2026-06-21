'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
    Receipt,
    History,
    DollarSign,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Clock,
    Briefcase,
    User,
    Calendar,
    X,
    CreditCard,
    Download,
    FileText,
    TrendingUp,
    Zap,
    Search,
    ChevronDown,
    ExternalLink,
} from 'lucide-react';

interface DecodedToken {
    sub?: string;
    id?: string;
    role: string;
    department: string;
    exp: number;
    name?: string;
}

interface ReceiptData {
    receiptId: string;
    dueDate: string;
    amount?: number;
    paidAmount?: number;
    remainingAmount?: number;
    issuedBy: string;
    issuedAt: string;
    projectDetails?: {
        title: string;
        description?: string;
        quotation?: string;
        department: string;
        paymentMethod?: string;
        approval?: { approvedBy: string; approvedAt: string };
    };
    userDetails?: {
        name: string;
        email: string;
        uniqueId: string;
        phone: string;
        branch: string;
    };
}

interface BackendProject {
    _id: string;
    uniqueId: string;
    userId: { name: string; email: string; uniqueId: string };
    department: string;
    category: string;
    status: string;
    formData?: Record<string, unknown>;
    createdAt: string;
    updatedAt?: string;
    paymentStatus: 'Pending' | 'Quote Sent' | 'Payment Form Created' | 'Payment Submitted' | 'Awaiting Approval' | '50% Paid' | 'Official Receipt Issued' | 'Full Paid';
    quotedAmount?: number;
    activities?: Array<{
        description: string;
        timestamp: string;
        updatedBy: { name: string; role: string };
        statusChange?: string;
        remarks?: string;
    }>;
    paymentDetails?: {
        title?: string;
        projectDescription?: string;
        detailedQuotation?: string;
        dueDate?: string;
        amount?: number;
        paidAmount?: number;
        paymentMethod?: 'Cash' | 'Check' | 'UPI';
    };
    receipt?: { data: ReceiptData };
}

interface MappedProject {
    id: string;
    uniqueId: string;
    title: string;
    department: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    paymentStatus: BackendProject['paymentStatus'];
    quotedAmount: number;
    paidAmount: number;
    remainingAmount: number;
    activities: BackendProject['activities'];
    receipt: BackendProject['receipt'];
    paymentMethod?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

const getPaymentStatusStyle = (status: string) => {
    switch (status) {
        case 'Full Paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' };
        case '50% Paid': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', dot: 'bg-blue-500' };
        case 'Official Receipt Issued': return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500' };
        case 'Awaiting Approval': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500' };
        case 'Payment Submitted': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-500' };
        case 'Payment Form Created': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', dot: 'bg-orange-500' };
        case 'Quote Sent': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', dot: 'bg-cyan-500' };
        default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', dot: 'bg-slate-400' };
    }
};

const PaymentsPage = () => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [projects, setProjects] = useState<MappedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedProjectForHistory, setSelectedProjectForHistory] = useState<MappedProject | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/Login/Signin'); return; }
        try {
            const decoded: DecodedToken = jwtDecode(token);
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                router.push('/Login/Signin');
                return;
            }
            setUser(decoded);
            fetchPaymentData(token);
        } catch { router.push('/Login/Signin'); }
    }, [router]);

    const fetchPaymentData = async (token: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/my-projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch financial data');
            const data = await response.json();
            if (data.success) {
                const mapped = (data.data as BackendProject[])
                    .filter(p => p.paymentStatus !== 'Pending')
                    .map(mapBackendToFrontend);
                setProjects(mapped);
            }
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const mapBackendToFrontend = (backend: BackendProject): MappedProject => {
        let title = backend.category || 'Untitled Project';
        if (backend.paymentDetails?.title) {
            title = backend.paymentDetails.title;
        } else if (backend.formData && backend.department) {
            const titleFields: Record<string, string> = {
                'Drug Discovery': 'titleProject', 'NGS': 'sampleName',
                'Software Development': 'projectName', 'Microbiology': 'sampleName',
                'Biochemistry and Molecular Biology': 'sampleName',
            };
            const preferredField = titleFields[backend.department];
            if (preferredField && typeof (backend.formData as any)[preferredField] === 'string') {
                title = (backend.formData as any)[preferredField];
            }
        }
        const total = backend.paymentDetails?.amount || backend.quotedAmount || 0;
        const paid = backend.paymentDetails?.paidAmount || 0;
        return {
            id: backend._id, uniqueId: backend.uniqueId, title, department: backend.department,
            status: backend.status, createdAt: backend.createdAt,
            updatedAt: backend.updatedAt || backend.createdAt,
            paymentStatus: backend.paymentStatus, quotedAmount: total, paidAmount: paid,
            remainingAmount: Math.max(0, total - paid),
            activities: backend.activities || [], receipt: backend.receipt,
            paymentMethod: backend.paymentDetails?.paymentMethod,
        };
    };

    const getPaymentHistory = (project: MappedProject) => {
        const keywords = ['quote', 'payment', 'official receipt', 'receipt', 'form', 'approved', 'submitted', 'purchase', 'bill', 'fee', 'deposit', 'settled', 'review'];
        return project.activities
            ? project.activities.filter(a => keywords.some(k => a.description.toLowerCase().includes(k)))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : [];
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalPaid: projects.reduce((sum, p) => sum + p.paidAmount, 0),
        totalPending: projects.reduce((sum, p) => sum + p.remainingAmount, 0),
        receiptsCount: projects.filter(p => p.receipt).length,
        activeProjects: projects.length,
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-2xl animate-spin shadow-xl mb-6" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Financial Grid...</p>
            </div>
        );
    }

    return (
        <div className="pb-10 space-y-8">
            <Toaster position="top-right" />

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: 'Total Paid', value: `₹${stats.totalPaid.toLocaleString()}`, icon: CheckCircle, bg: 'bg-emerald-600', iconBg: 'bg-white/20' },
                    { label: 'Outstanding', value: `₹${stats.totalPending.toLocaleString()}`, icon: AlertCircle, bg: 'bg-rose-600', iconBg: 'bg-white/20' },
                    { label: 'Bills Ready', value: stats.receiptsCount, icon: Receipt, bg: 'bg-indigo-600', iconBg: 'bg-white/20' },
                    { label: 'Total Projects', value: stats.activeProjects, icon: Briefcase, bg: 'bg-slate-800', iconBg: 'bg-white/20' },
                ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 120 }}
                        className={`${s.bg} rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex items-center gap-4 group hover:scale-[1.02] transition-all relative overflow-hidden`}>
                        <div className={`w-12 h-12 ${s.iconBg} text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xl font-black text-white tracking-tight leading-none">{s.value}</p>
                            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    </motion.div>
                ))}
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {/* Table Header with Search */}
                <div className="px-8 py-6 bg-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 shadow-lg">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Payment Ledger</h2>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{filteredProjects.length} records</p>
                        </div>
                    </div>
                    <div className="relative group w-full sm:w-72 relative z-10">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by title or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white placeholder:text-slate-500 focus:ring-4 focus:ring-white/10 focus:bg-white/10 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                {filteredProjects.length === 0 ? (
                    <div className="text-center py-24 bg-slate-50/30">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                            <DollarSign className="w-9 h-9 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Financial Records</h3>
                        <p className="text-slate-400 font-bold text-sm">Projects appear here once they reach the quoting stage.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800">
                                    {['Project', 'Department', 'Payment Status', 'Budget', 'Paid', 'Outstanding', 'Actions'].map(col => (
                                        <th key={col} className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap border-b border-white/5">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {filteredProjects.map((project, idx) => {
                                        const style = getPaymentStatusStyle(project.paymentStatus);
                                        return (
                                            <motion.tr
                                                key={project.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.04 }}
                                                className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors group"
                                            >
                                                {/* Project */}
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                            <Briefcase className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-slate-900 text-sm truncate max-w-[180px] group-hover:text-indigo-600 transition-colors">{project.title}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{project.uniqueId}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Department */}
                                                <td className="px-6 py-5">
                                                    <span className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                                        {project.department}
                                                    </span>
                                                </td>

                                                {/* Payment Status */}
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${style.bg} ${style.text} border ${style.border}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                        {project.paymentStatus}
                                                    </span>
                                                </td>

                                                {/* Budget */}
                                                <td className="px-6 py-5">
                                                    <p className="font-black text-slate-900 text-sm">₹{project.quotedAmount.toLocaleString()}</p>
                                                </td>

                                                {/* Paid */}
                                                <td className="px-6 py-5">
                                                    <p className={`font-black text-sm ${project.paidAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        ₹{project.paidAmount.toLocaleString()}
                                                    </p>
                                                </td>

                                                {/* Outstanding */}
                                                <td className="px-6 py-5">
                                                    <p className={`font-black text-sm ${project.remainingAmount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                        {project.remainingAmount > 0 ? `₹${project.remainingAmount.toLocaleString()}` : '—'}
                                                    </p>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {project.receipt && (
                                                            <Link
                                                                href={`/user-dashboard/Project/${project.id}/view/review-bill?official=true`}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all whitespace-nowrap"
                                                                title="Download Document"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                {project.paymentStatus === 'Full Paid' || (project.paidAmount && project.paidAmount >= project.quotedAmount) ? 'Download Bill' : 'Download Receipt'}
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => { setSelectedProjectForHistory(project); setShowHistoryModal(true); }}
                                                            className="p-2 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                                                            title="View History"
                                                        >
                                                            <History className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/user-dashboard/Project/${project.id}/view`)}
                                                            className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                                                            title="View Project"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {showHistoryModal && selectedProjectForHistory && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4 lg:p-8">
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                        Payment History
                                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate max-w-[280px]">
                                        {selectedProjectForHistory.title}
                                    </p>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-4">
                                {getPaymentHistory(selectedProjectForHistory).length === 0 ? (
                                    <div className="py-20 text-center">
                                        <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No payment history found</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                                        {getPaymentHistory(selectedProjectForHistory).map((activity, index) => (
                                            <div key={index} className="relative flex items-start gap-5 group/item">
                                                <div className={`z-10 flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shadow-md shrink-0 ${index === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                    <DollarSign className="w-3.5 h-3.5 text-white" />
                                                </div>
                                                <div className="flex-1 bg-slate-50 hover:bg-white p-5 rounded-2xl border border-slate-100 transition-all">
                                                    <p className="text-sm font-black text-slate-900 mb-2">{activity.description}</p>
                                                    <div className="flex items-center gap-4">
                                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(activity.timestamp).toLocaleDateString()}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                                            <User className="w-3 h-3" />
                                                            {activity.updatedBy?.name || 'System'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <button onClick={() => setShowHistoryModal(false)}
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-all">
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PaymentsPage;
