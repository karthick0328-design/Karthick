'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ShoppingCart,
    Clock,
    CheckCircle,
    User,
    DollarSign,
    FileText,
    Package,
    Cpu,
    FlaskConical,
    PlusCircle,
    Truck,
    Send,
    Download,
    Calendar,
    AlertCircle,
    Loader2,
    Check
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';

export default function PurchaseOrderViewPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/purchase/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setOrder(data.data);
                } else {
                    toast.error(data.message || 'Error fetching order details');
                }
            } catch (err) {
                console.error(err);
                toast.error('Network error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchOrderDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-16 h-16 text-slate-200" />
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Order Not Found</h2>
                <button onClick={() => router.back()} className="text-indigo-600 font-bold hover:underline underline-offset-4 flex items-center gap-2">
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    const { financialReview, purchaseDetails } = order;

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-10">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all group"
                    >
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{order.uniqueId}</h1>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${purchaseDetails?.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' :
                                order.status === 'In Progress' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                {purchaseDetails?.status || order.status}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium">Internal Purchase Dossier • Created on {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Progress Tracker Layer */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Logistics Lifecycle
                        </h3>

                        <div className="relative px-4">
                            <div className="absolute left-[2.35rem] top-4 bottom-4 w-1 bg-slate-50 rounded-full" />
                            <div className="space-y-12 relative">
                                {[
                                    { step: 'Order Placing', icon: <Package />, label: 'Initiation', desc: 'Manager created and approved the order' },
                                    { step: 'Going to send', icon: <Send />, label: 'Purchasing', desc: 'Employee is procuring the items' },
                                    { step: 'Delivered', icon: <CheckCircle />, label: 'Delivery', desc: 'Order received and verified' }
                                ].map((step, idx) => {
                                    const currentStatus = purchaseDetails?.status || 'Order Placing';
                                    const statusOrder = ['Order Placing', 'Going to send', 'Delivered'];
                                    const activeIdx = statusOrder.indexOf(currentStatus);
                                    const isDone = idx <= activeIdx;
                                    const isCurrent = idx === activeIdx;

                                    return (
                                        <div key={idx} className="flex items-start gap-8 relative group">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 transition-all duration-700 ${isDone ? 'bg-slate-900 text-white shadow-xl scale-110' : 'bg-white text-slate-200 border-2 border-slate-50'
                                                } ${isCurrent ? 'ring-4 ring-slate-100' : ''}`}>
                                                {step.icon}
                                            </div>
                                            <div>
                                                <p className={`font-black uppercase tracking-tight ${isDone ? 'text-slate-900' : 'text-slate-300'}`}>{step.label}</p>
                                                <p className="text-sm font-medium text-slate-400 mt-1">{step.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Order Details */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-10">
                        <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-900">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Purchase Narrative</h2>
                        </div>

                        <div className="prose prose-slate max-w-none">
                            <p className="text-lg text-slate-600 font-medium leading-relaxed italic">"{financialReview?.requestReason || 'No description provided'}"</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { icon: <Cpu />, label: 'Software', value: financialReview?.software },
                                { icon: <Package />, label: 'Consumables', value: financialReview?.consumable },
                                { icon: <FlaskConical />, label: 'Kits', value: financialReview?.kits },
                                { icon: <PlusCircle />, label: 'Others', value: financialReview?.others }
                            ].map((res, i) => res.value && (
                                <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                                        {res.icon}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{res.label}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-900">{res.value}</p>
                                </div>
                            ))}
                        </div>

                        {financialReview?.quality && (
                            <div className="p-8 bg-emerald-50/50 rounded-[32px] border border-emerald-100/50">
                                <div className="flex items-center gap-3 mb-3 text-emerald-600">
                                    <CheckCircle size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quality Standards</span>
                                </div>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{financialReview.quality}</p>
                            </div>
                        )}
                    </section>

                    {/* Employee Fulfillment Data */}
                    {purchaseDetails?.billForm?.generated && (
                        <section className="bg-slate-900 p-10 rounded-[40px] shadow-2xl space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 rounded-2xl text-emerald-400 border border-white/10">
                                        <Check size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Employee Fulfillment</h2>
                                        <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest mt-1">Transaction Verified</p>
                                    </div>
                                </div>
                                <div className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                                    Verified Bill
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Bill Number</p>
                                    <p className="text-lg font-black text-white uppercase tracking-tighter">{purchaseDetails.billForm.billNumber}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Paid Amount</p>
                                    <p className="text-2xl font-black text-white tracking-tighter">${purchaseDetails.billForm.totalAmount?.toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all md:col-span-2">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Fulfillment Quality Notes</p>
                                    <p className="text-sm font-bold text-slate-300 italic">"{purchaseDetails.billForm.quality || 'No quality notes provided by employee'}"</p>
                                </div>
                            </div>

                            {purchaseDetails.billForm.billImage && (
                                <div className="pt-4 relative z-10">
                                    <button
                                        onClick={() => {
                                            const rawUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${purchaseDetails.billForm.billImage}`;
                                            const safeUrl = rawUrl && /^(https?:\/\/|blob:|\/)/i.test(rawUrl) ? rawUrl : '#';
                                            if (safeUrl !== '#') window.open(safeUrl, '_blank', 'noopener,noreferrer');
                                        }}
                                        className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-xl"
                                    >
                                        <FileText size={18} />
                                        View Fulfillment PDF/Bill
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Vendor Comparison */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                        <div className="flex items-center gap-4 border-b border-slate-50 pb-8">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                <DollarSign size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Vendor Analysis</h2>
                        </div>

                        <div className="space-y-4">
                            {financialReview?.vendors?.map((v: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-300">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{v.details}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vendor Quote</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-900 tracking-tighter">${Number(v.amount).toLocaleString()}</p>
                                        {v.attachment && (
                                            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 mt-1 ml-auto hover:underline">
                                                <Download size={10} /> View Quote
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-10">
                    {/* Originator / Status Card */}
                    <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white space-y-8 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />

                        <div className="space-y-6 relative z-10">
                            <div className="pb-6 border-b border-white/10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Originator</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center font-black text-white italic">
                                        M
                                    </div>
                                    <div>
                                        <p className="font-black text-white">{financialReview?.requestedBy?.name || 'Department Manager'}</p>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{financialReview?.requestedBy?.uniqueId || 'MANAGEMENT'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-6 border-b border-white/10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Assigned Authority</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white italic shadow-lg shadow-indigo-500/20">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="font-black text-white">{purchaseDetails?.assignedEmployee?.name || 'Unassigned'}</p>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{purchaseDetails?.assignedEmployee?.uniqueId || 'PENDING'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Budget Allocation</p>
                                <p className="text-4xl font-black text-white tracking-tighter">${financialReview?.requestedAmount?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Supporting Docs Sidebar */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Download size={14} className="text-indigo-600" /> Dossier Attachments
                        </h3>
                        <div className="space-y-3">
                            {financialReview?.attachments?.length > 0 ? financialReview.attachments.map((at: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-50 group hover:bg-slate-100 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="text-indigo-600 w-4 h-4 shrink-0" />
                                        <span className="text-xs font-black text-slate-900 truncate">{at.originalName || at.filename}</span>
                                    </div>
                                    <Download size={14} className="text-slate-200 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            )) : (
                                <p className="text-xs font-bold text-slate-300 italic text-center py-4">No supporting documents found</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
