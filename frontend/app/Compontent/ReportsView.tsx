'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import PerformanceComplianceReporting from '@/components/Reports/PerformanceComplianceReporting';

interface Props {
    roleName: string;
}

export default function ReportsView({ roleName }: Props) {
    // Extract service from roleName (e.g., "Manager - Drug Discovery" -> "Drug Discovery")
    const service = roleName.includes('-') ? roleName.split('-')[1].trim().toUpperCase() : '';

    return (
        <div className="space-y-10 animate-in fade-in duration-700 max-w-[1800px] mx-auto p-6">
            {/* Top Navigation Bar - as seen in Image 1 */}
            <div className="flex items-center justify-between bg-white px-8 py-5 rounded-3xl border border-slate-100 shadow-sm sticky top-0 z-10 transition-all">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => window.history.back()}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <ChevronDown size={22} className="-rotate-90 md:rotate-0" />
                    </button>
                    <div>
                        <h2 className="font-extrabold text-[#1e293b] text-xl tracking-tight leading-none">
                             Advanced Performance Suite
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border border-indigo-100/50 shadow-sm">
                        {service || 'SERVICE'}
                    </span>
                </div>
            </div>

            {/* Main Content - No wrapper for more seamless Image 1 look */}
            <PerformanceComplianceReporting />
        </div>
    );
}

