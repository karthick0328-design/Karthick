'use client';

import UnifiedAttendancePortal from '@/app/Compontent/UnifiedAttendancePortal';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const SoftwareDevelopmentTLAttendancePage = () => {
    const router = useRouter();

    return (
        <div className="p-8 font-sans min-h-full">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="group flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-4 font-medium"
                        >
                            <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100 group-hover:border-indigo-100 transition-all">
                                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            </div>
                            <span>Back to Dashboard</span>
                        </button>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight uppercase">
                            Software <span className="text-indigo-600">Development</span> Attendance
                        </h1>
                        <p className="text-lg text-gray-500 mt-2 max-w-2xl">
                            Daily check-in and leave management portal for Software Development Team Leads.
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <UnifiedAttendancePortal />
            </div>
        </div>
    );
};

export default SoftwareDevelopmentTLAttendancePage;
