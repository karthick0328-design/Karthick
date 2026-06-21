'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Briefcase, ArrowRight, AlertCircle, Package } from 'lucide-react';
import Link from 'next/link';

export default function FinanceJuniorEmployeePage() {
    return (
        <div className="space-y-8 pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                            <DollarSign size={28} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Finance Operations</h1>
                    </div>
                    <p className="text-blue-100 max-w-2xl text-lg">
                        Junior Finance Employee Portal - Access salary processing, service payments, and brand purchase logistics.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold">
                        <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                        Junior Employee Access
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Salary Management */}
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

                {/* Service Payments */}
                <Link href="/employee-dashboard/finance/service" className="group">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Briefcase size={120} />
                        </div>
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Service Payments</h3>
                        <p className="text-slate-500 mb-6">Track project payments and revenue across departments.</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                            Monitor Payments <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </Link>

                {/* Purchase Management */}
                <Link href="/employee-dashboard/finance/purchase" className="group">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Package size={120} />
                        </div>
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                            <Package size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Brand Purchases</h3>
                        <p className="text-slate-500 mb-6">Manage brand specification orders and logistics tracking.</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                            Manage Purchases <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-[32px] p-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Junior Employee Access</h3>
                        <p className="text-slate-700 leading-relaxed">
                            As a junior finance employee, you have access to all financial operations including
                            salary processing and service payment monitoring. You may work under the supervision of senior employees
                            and managers. Please consult your supervisor for guidance on complex financial operations.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
