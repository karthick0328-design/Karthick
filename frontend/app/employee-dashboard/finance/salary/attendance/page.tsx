'use client';

import React from 'react';
import UnifiedAttendancePortal from '@/app/Compontent/UnifiedAttendancePortal';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const FinanceSalaryAttendancePage = () => {
    const router = useRouter();

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 mb-4 text-slate-500 hover:text-slate-900 transition-colors group text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Dashboard</span>
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 uppercase">
                        Finance Salary <span className="text-indigo-600">Personnel Attendance</span>
                    </h1>
                    <p className="text-slate-500 mt-2 max-w-2xl font-medium">
                        Track your daily attendance, manage leave requests, and view the team calendar.
                    </p>
                </div>
            </div>

            <UnifiedAttendancePortal />
        </div>
    );
};

export default FinanceSalaryAttendancePage;
