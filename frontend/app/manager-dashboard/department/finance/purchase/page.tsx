'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart,
    Plus,
    Search,
    Filter,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Package,
    Truck,
    CreditCard,
    Loader2,
    Layers,
    User,
    ChevronRight,
    SearchX
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

interface PurchaseOrder {
    _id: string;
    uniqueId: string;
    status: string;
    createdAt: string;
    financialReview: {
        requestedBy: { name: string; uniqueId: string };
        requestReason: string;
        requestedAmount: number;
        status: string;
    };
    purchaseDetails?: {
        assignedEmployee?: { name: string; uniqueId: string };
        status: string;
    };
}

export default function PurchaseManagementPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in-progress' | 'delivered'>('all');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/purchase/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOrders(data.data || []);
            } else {
                toast.error(data.message || 'Failed to load purchase orders');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error loading orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = useMemo(() => {
        let result = orders;

        // Tab Filter
        if (activeFilter === 'pending') {
            result = result.filter(o => o.financialReview.status === 'Pending');
        } else if (activeFilter === 'in-progress') {
            result = result.filter(o => o.status === 'In Progress');
        } else if (activeFilter === 'delivered') {
            result = result.filter(o => o.purchaseDetails?.status === 'Delivered');
        }

        // Search Filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            result = result.filter(o =>
                o.uniqueId.toLowerCase().includes(query) ||
                o.financialReview.requestReason.toLowerCase().includes(query) ||
                o.financialReview.requestedBy.name.toLowerCase().includes(query)
            );
        }

        return result;
    }, [orders, searchTerm, activeFilter]);

    const stats = useMemo(() => {
        const total = orders.length;
        const pending = orders.filter(o => o.financialReview.status === 'Pending').length;
        const inProgress = orders.filter(o => o.status === 'In Progress').length;
        const completed = orders.filter(o => o.purchaseDetails?.status === 'Delivered').length;

        return [
            { label: 'Total Orders', value: total.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pending Review', value: pending.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'In Progress', value: inProgress.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Delivered', value: completed.toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ];
    }, [orders]);

    return (
        <div className="space-y-8 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                            <ShoppingCart className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black mb-2 tracking-tight">Purchase Management</h1>
                            <p className="text-slate-400 font-medium tracking-wide">Manage internal procurement orders and departmental logistics.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/manager-dashboard/department/finance/purchase/new')}
                        className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl flex items-center gap-3 self-start md:self-center group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        New Purchase Order
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-500 font-black`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Summary</span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
                {/* Controls */}
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col xl:flex-row justify-between items-center gap-8">
                    {/* Tabs */}
                    <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner w-full xl:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Orders', icon: <Layers className="w-4 h-4" /> },
                            { id: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" /> },
                            { id: 'in-progress', label: 'Purchasing', icon: <Truck className="w-4 h-4" /> },
                            { id: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-4 h-4" /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeFilter === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105 transform translate-y-[-1px]'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 font-black" />
                            <input
                                type="text"
                                placeholder="Scan order IDs or items..."
                                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200/60 rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700 outline-none shadow-sm placeholder-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="w-full md:w-auto px-6 py-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm">
                            <Filter className="w-4 h-4" />
                            Filter Options
                        </button>
                    </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto overflow-y-auto max-h-[800px] custom-scrollbar">
                    {loading ? (
                        <div className="p-32 text-center animate-pulse">
                            <Loader2 className="w-12 h-12 text-indigo-200 animate-spin mx-auto mb-6" />
                            <p className="text-xl font-black text-slate-300 tracking-tighter uppercase">Synchronizing Purchase Vault...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-32 text-center flex flex-col items-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner ring-8 ring-white">
                                <SearchX className="w-10 h-10 text-slate-200" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No Results Found</h2>
                            <p className="text-slate-400 max-w-sm font-medium">We couldn't find any purchase orders matching your current scan criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-y-4 px-8 pb-10">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    <th className="px-6 py-4">Identity</th>
                                    <th className="px-6 py-4">Originator</th>
                                    <th className="px-6 py-4">Valuation</th>
                                    <th className="px-6 py-4 Status & Logistics">Status</th>
                                    <th className="px-6 py-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr
                                        key={order._id}
                                        onClick={() => router.push(`/manager-dashboard/department/finance/purchase/view/${order._id}`)}
                                        className="group bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer rounded-3xl overflow-hidden relative"
                                    >
                                        <td className="px-6 py-8 first:rounded-l-3xl border-y border-l border-slate-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:bg-indigo-600 transition-colors duration-500">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-lg uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">{order.uniqueId}</p>
                                                    <p className="text-[10px] font-black text-slate-400 mt-1 flex items-center gap-1.5 uppercase">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 border-y border-slate-100">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-sm font-black text-slate-700">{order.financialReview.requestedBy?.name || 'Manager'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.financialReview.requestedBy?.uniqueId || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 border-y border-slate-100">
                                            <p className="text-lg font-black text-slate-900 tracking-tighter">
                                                ${order.financialReview.requestedAmount?.toLocaleString() || '0'}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 border border-indigo-100 bg-indigo-50 w-fit px-2 py-0.5 rounded-lg">
                                                <Package className="w-3 h-3 text-indigo-500" />
                                                <p className="text-[9px] font-black text-indigo-600 uppercase">Capital Order</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 border-y border-slate-100">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full animate-pulse ${order.purchaseDetails?.status === 'Delivered' ? 'bg-emerald-500' :
                                                        order.status === 'In Progress' ? 'bg-indigo-500' : 'bg-amber-500'
                                                        }`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                                                        {order.purchaseDetails?.status || order.financialReview.status}
                                                    </span>
                                                </div>
                                                {order.purchaseDetails?.assignedEmployee && (
                                                    <p className="text-[10px] font-bold text-slate-400 italic">
                                                        Assigned: {order.purchaseDetails.assignedEmployee.name}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 last:rounded-r-3xl border-y border-r border-slate-100 text-right">
                                            <button className="p-3 bg-slate-50 text-slate-300 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                <ChevronRight className="w-6 h-6" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
