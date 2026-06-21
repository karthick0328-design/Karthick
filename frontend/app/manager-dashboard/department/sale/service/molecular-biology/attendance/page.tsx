'use client';

import React from 'react';
import UnifiedAttendancePortal from '@/app/Compontent/UnifiedAttendancePortal';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const MolecularBiologySalesAttendancePage = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white p-6 md:p-10">
            <div className="w-full max-w-[1800px] mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={() => router.back()}
                                className="group flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                <span>Back</span>
                            </button>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-wider uppercase">
                                Sales Manager
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                            Molecular Biology<span className="text-indigo-600"> Attendance</span>
                        </h1>
                        <p className="text-lg text-gray-600 mt-2 font-medium max-w-2xl">
                            Track your daily attendance, manage leave requests, and view upcoming holidays.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <UnifiedAttendancePortal />
            </div>
        </div>
    );
};

export default MolecularBiologySalesAttendancePage;
