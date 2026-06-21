'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import { ShieldCheck } from 'lucide-react';

export default function HeadSaleDepartmentComplaintsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                    Sales Department Complaints
                </h1>
                <p className="text-slate-500 mt-1 font-medium">Executive oversight of service complaints within the Sales & Customer Services department.</p>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                <ProjectComplaintManager role="head" />
            </div>
        </div>
    );
}
