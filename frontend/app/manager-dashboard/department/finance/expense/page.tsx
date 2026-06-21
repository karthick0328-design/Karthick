'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Plus,
    Calendar as CalendarIcon,
    Tag,
    Trash2,
    DollarSign,
    Filter,
    MoreHorizontal,
    Search,
    Paperclip,
    File,
    Eye,
    Briefcase,
    ChevronDown
} from 'lucide-react';
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

interface ExpenseRecord {
    _id: string;
    receiptDate: string;
    category: string;
    basicAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidTo: string;
    paymentMode: string;
    description?: string;
    receiptUrl?: string;
    recordedBy?: {
        name: string;
    };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/expenses';

export default function ExpenseManagementPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        receiptDate: new Date().toISOString().split('T')[0],
        category: 'Other',
        basicAmount: '',
        taxAmount: '0',
        paidTo: '',
        paymentMode: 'Cash',
        description: ''
    });
    const [file, setFile] = useState<File | null>(null);

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
            fetchExpenses(token);
        } catch (err) {
            router.push('/Login/Signin');
        }
    }, [router]);

    const fetchExpenses = async (token: string) => {
        setLoading(true);
        try {
            const res = await fetch(API_BASE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const sanitizedExpenses = (data.data || []).map((exp: any) => ({
                    ...exp,
                    receiptUrl: exp.receiptUrl ? validateURL(exp.receiptUrl) : undefined
                }));
                setExpenses(sanitizedExpenses);
            }
        } catch (err) {
            toast.error('Failed to load expense records');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!formData.basicAmount || !formData.paidTo) {
            toast.error('Please fill in required fields');
            return;
        }

        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            submitData.append(key, value);
        });
        if (file) {
            submitData.append('file', file);
        }

        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type: multipart/form-data manually, fetch will do it with the boundary
                },
                body: submitData
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Expense recorded successfully');
                setShowModal(false);
                setFormData({
                    receiptDate: new Date().toISOString().split('T')[0],
                    category: 'Other',
                    basicAmount: '',
                    taxAmount: '0',
                    paidTo: '',
                    paymentMode: 'Cash',
                    description: ''
                });
                setFile(null);
                fetchExpenses(token!);
            } else {
                toast.error(data.message || 'Failed to save expense');
            }
        } catch (err) {
            toast.error('Network error. Failed to save.');
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Record deleted');
                fetchExpenses(token!);
            }
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const stats = useMemo(() => {
        const total = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
        const uniqueCategories = new Set(expenses.map(e => e.category)).size;
        return {
            total,
            categoryCount: uniqueCategories,
            recordCount: expenses.length
        };
    }, [expenses]);

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-8 space-y-10 font-sans text-slate-800">
            <Toaster position="top-right" />

            {/* Top Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Expenses</h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage your business expenditures and overheads</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-[#002B5B] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-[#003d80] transition-all transform hover:scale-105 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Record Expense
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard
                    title="TOTAL EXPENSES"
                    value={`₹ ${stats.total.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6" />}
                    color="text-[#002B5B]"
                    bgColor="bg-slate-50"
                />
                <StatCard
                    title="ACTIVE CATEGORIES"
                    value={`${stats.categoryCount} Categories`}
                    icon={<Tag className="w-6 h-6" />}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <StatCard
                    title="RECORD COUNT"
                    value={`${stats.recordCount} Records`}
                    icon={<CalendarIcon className="w-6 h-6" />}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                />
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Transactions</h3>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="pl-12 pr-6 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold w-64 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                            />
                        </div>
                        <button className="p-3 bg-slate-50 text-slate-400 hover:text-[#002B5B] rounded-xl transition-all">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[800px] custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-b border-slate-50">
                                <th className="px-10 py-6">Date</th>
                                <th className="px-10 py-6">Category</th>
                                <th className="px-10 py-6">Recipient</th>
                                <th className="px-10 py-6">Payment</th>
                                <th className="px-10 py-6">Amount</th>
                                <th className="px-10 py-6 text-center">Receipt</th>
                                <th className="px-10 py-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-sans">
                            {expenses.map((expense) => (
                                <tr key={expense._id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-bold text-slate-700">{new Date(expense.receiptDate).toLocaleDateString('en-GB')}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1 bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-md">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Briefcase className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 capitalize">{expense.paidTo}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[150px]">
                                                    {expense.description || 'No Ref.'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <p className="text-sm font-bold text-slate-600">{expense.paymentMode}</p>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div>
                                            <p className="text-lg font-black text-slate-900 tracking-tighter">₹ {expense.totalAmount.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">Incl. ₹{expense.taxAmount} GST</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        {expense.receiptUrl ? (
                                            (() => {
                                                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                                                const rawUrl = expense.receiptUrl || '';
                                                const fullUrl = `${baseUrl}${rawUrl}`;
                                                const isSafe = fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('/');
                                                const finalUrl = isSafe ? fullUrl : '#';

                                                return (
                                                    <a
                                                        href={finalUrl !== '#' ? encodeURI(finalUrl) : '#'}
                                                        data-sanitized="true"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-tighter">No File</span>
                                        )}
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <button
                                            onClick={() => handleDeleteExpense(expense._id)}
                                            className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                                                <MoreHorizontal size={32} />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records available</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001529]/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-10 pt-10 pb-6 border-b border-slate-50">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">New Expense</h2>
                            <p className="text-slate-400 font-medium text-sm mt-1">Fill in the details of your expenditure</p>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveExpense} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                {/* Receipt Date */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Receipt Date</label>
                                    <div className="relative group">
                                        <input
                                            type="date"
                                            required
                                            value={formData.receiptDate}
                                            onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                                            className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                        />
                                        <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-[#002B5B] transition-colors pointer-events-none" />
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Expense Category</label>
                                    <div className="relative group">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                        >
                                            {['Other', 'Rent', 'Electricity', 'Water', 'Internet', 'Salary', 'Maintenance', 'Software', 'Equipments', 'Office Supplies'].map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-[#002B5B] transition-colors pointer-events-none" />
                                    </div>
                                </div>

                                {/* Basic Amount */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Basic Amount</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-300">₹</span>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.basicAmount}
                                            onChange={(e) => setFormData({ ...formData, basicAmount: e.target.value })}
                                            className="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Tax Amount */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">GST / Tax Amount</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-300">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={formData.taxAmount}
                                            onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                                            className="w-full bg-slate-50 border-0 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Recipient */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Paid to (Recipient)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Vendor name or person"
                                        value={formData.paidTo}
                                        onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                        className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                    />
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Payment Mode</label>
                                    <div className="relative group">
                                        <select
                                            value={formData.paymentMode}
                                            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                            className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-[#002B5B] transition-all outline-none"
                                        >
                                            {['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other'].map(mode => (
                                                <option key={mode} value={mode}>{mode}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-[#002B5B] transition-colors pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* File Upload & Description */}
                            <div className="grid grid-cols-2 gap-8 items-start">
                                {/* File Upload */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Attachment (Receipt/PDF)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="file-upload"
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all ${file ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-indigo-400'}`}
                                        >
                                            {file ? (
                                                <>
                                                    <File className="w-8 h-8 text-indigo-600 mb-2" />
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate max-w-[140px]">{file.name}</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setFile(null); }}
                                                        className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Paperclip className="w-8 h-8 text-slate-300 mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to Attach</p>
                                                    <p className="text-[8px] text-slate-300 font-bold mt-1 uppercase">PDF, JPG, PNG (Max 10MB)</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Additional Description</label>
                                    <textarea
                                        placeholder="Enter additional details about this expenditure..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={6}
                                        className="w-full bg-slate-50 border-0 rounded-3xl px-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#002B5B] transition-all outline-none resize-none"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-8 py-5 bg-slate-50 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-5 bg-[#002B5B] text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#002B5B]/20 hover:bg-[#003d80] transition-all"
                                >
                                    Save Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Helper UI Components ---

function StatCard({ title, value, icon, color, bgColor }: any) {
    return (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:shadow-xl transition-all duration-500">
            <div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">{title}</p>
                <h4 className={`text-4xl font-black tracking-tighter ${color}`}>{value}</h4>
            </div>
            <div className={`p-5 rounded-3xl ${bgColor} ${color} transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500`}>
                {icon}
            </div>
        </div>
    );
}
