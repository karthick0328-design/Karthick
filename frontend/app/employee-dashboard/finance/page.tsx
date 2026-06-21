'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    DollarSign,
    Briefcase,
    ArrowRight,
    AlertCircle,
    Loader2,
    Package,
    Clock,
    MessageSquare
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

interface FinancialReviewProject {
    _id: string;
    title: string;
    serviceType: string;
    client: {
        name: string;
    };
    financialReview?: {
        status: string;
        requestedAmount: number;
        reason: string;
        requestedBy: {
            name: string;
        };
        requestedAt: string;
    };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

export default function FinanceEmployeeDashboard() {
    const [reviews, setReviews] = useState<FinancialReviewProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [financeAccess, setFinanceAccess] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>('');

    // Review Modal State
    const [selectedReview, setSelectedReview] = useState<FinancialReviewProject | null>(null);
    const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | null>(null);
    const [approvedAmount, setApprovedAmount] = useState<number>(0);
    const [remarks, setRemarks] = useState('');

    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Initial load from token
                const decoded: any = jwtDecode(token);
                setFinanceAccess(decoded.financeAccess || []);
                setUserRole(decoded.role || '');

                // Fetch fresh profile to sync
                await fetchProfile();
            } catch (err) {
                console.error('Failed to decode token');
            }
        }
        fetchReviews();
    };

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE.replace('/projects', '')}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.user) {
                setFinanceAccess(data.user.financeAccess || []);
                setUserRole(data.user.role || '');
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
    };

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/projects/financial/reviews`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Filter only pending reviews
                setReviews(data.data.filter((r: any) => r.financialReview?.status === 'Pending'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (project: FinancialReviewProject) => {
        setSelectedReview(project);
        setApprovedAmount(project.financialReview?.requestedAmount || 0);
        setReviewAction(null);
        setRemarks('');
    };

    const submitReview = async () => {
        if (!selectedReview || !reviewAction) return;

        setProcessingId(selectedReview._id);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_BASE}/projects/${selectedReview._id}/approve-financial-review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: reviewAction,
                    approvedAmount: reviewAction === 'Approved' ? approvedAmount : 0,
                    remarks
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Request ${reviewAction}`);
                setSelectedReview(null);
                fetchReviews();
            } else {
                toast.error(data.message || 'Action failed');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    if (!hasMounted) return null;

    return (
        <div className="space-y-8 pb-20">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black mb-4 tracking-tight">Finance Operations</h1>
                    <p className="text-slate-300 max-w-2xl text-lg">
                        Welcome to the Finance Department portal. Access salary processing data and service payment monitoring tools.
                    </p>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Salary Management */}
                {(userRole === 'manager' || financeAccess.includes('salary')) && (
                    <Link href="/employee-dashboard/finance/salary" className="group">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign size={120} />
                            </div>
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                                <DollarSign size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Salaries</h3>
                            <p className="text-slate-500 mb-6">Process salaries, credit payments, and view records.</p>
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                                Manage Salaries <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Service Payments */}
                {(userRole === 'manager' || financeAccess.some(a => a === 'service' || a.startsWith('service:'))) && (
                    <Link href="/employee-dashboard/finance/service" className="group">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Briefcase size={120} />
                            </div>
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                                <Briefcase size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                {financeAccess.find(a => a.startsWith('service:'))
                                    ? `Payments (${financeAccess.find(a => a.startsWith('service:'))?.split(':')[1].toUpperCase()})`
                                    : 'Service Payments'}
                            </h3>
                            <p className="text-slate-500 mb-6 font-medium">
                                {financeAccess.find(a => a.startsWith('service:'))
                                    ? `Track and monitor payments specifically for the ${financeAccess.find(a => a.startsWith('service:'))?.split(':')[1].replace('-', ' ')} department.`
                                    : 'Track project payments and revenue across all laboratory departments.'}
                            </p>
                            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 uppercase tracking-widest">
                                Monitor {financeAccess.find(a => a.startsWith('service:'))?.split(':')[1] || 'Payments'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Brand Purchase */}
                {(userRole === 'manager' || financeAccess.includes('purchase')) && (
                    <Link href="/employee-dashboard/finance/purchase" className="group">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Package size={120} />
                            </div>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                <Package size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Brand Purchase</h3>
                            <p className="text-slate-500 mb-6">Manage brand product orders, generate bills, and track delivery.</p>
                            <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                                View Purchases <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Attendance */}
                {(userRole === 'manager' || financeAccess.includes('attendance') || financeAccess.includes('purchase') || financeAccess.includes('salary') || financeAccess.some(a => a === 'service' || a.startsWith('service:'))) && (
                    <Link href={
                        financeAccess.includes('purchase') ? "/employee-dashboard/finance/purchase/attendance" :
                            financeAccess.includes('salary') ? "/employee-dashboard/finance/salary/attendance" :
                                "/employee-dashboard/finance/service/attendance"
                    } className="group">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock size={120} />
                            </div>
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 mb-6 group-hover:scale-110 transition-transform">
                                <Clock size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">My Attendance</h3>
                            <p className="text-slate-500 mb-6">View your attendance records and manage leave requests.</p>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                View Attendance <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Team Chat */}
                {(userRole === 'manager' || financeAccess.includes('purchase') || financeAccess.includes('salary') || financeAccess.some(a => a === 'service' || a.startsWith('service:'))) && (
                    <Link href={
                        financeAccess.includes('purchase') ? "/employee-dashboard/finance/purchase/chat" :
                            financeAccess.includes('salary') ? "/employee-dashboard/finance/salary/chat" :
                                "/employee-dashboard/finance/service/chat"
                    } className="group">
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <MessageSquare size={120} />
                            </div>
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Team Chat</h3>
                            <p className="text-slate-500 mb-6 font-medium">Connect and communicate with your department team members.</p>
                            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 uppercase tracking-widest">
                                Open Messenger <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                )}
            </div>

            {
                userRole === 'employee' && financeAccess.length === 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8 text-center text-amber-800">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-black mb-2 tracking-tight">Access Restricted</h3>
                        <p className="font-medium">You do not have any operational permissions assigned yet. Please contact your Financial Manager.</p>
                    </div>
                )
            }

        </div >
    );
}
