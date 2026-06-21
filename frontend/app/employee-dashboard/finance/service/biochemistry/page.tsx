'use client';

import React from 'react';
import FinanceServicePageContent from '@/app/manager-dashboard/department/finance/service/FinanceServicePageContent';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BiochemistryFinancePage() {
    const router = useRouter();
    return (
        <div className="space-y-6">
            <button
                onClick={() => router.back()}
                className="group flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 font-bold transition-all shadow-sm hover:shadow-md w-fit"
            >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                <span className="text-sm uppercase tracking-widest">Back to Services</span>
            </button>
            <FinanceServicePageContent department="Biochemistry" />
        </div>
    );
}
