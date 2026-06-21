'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';

export default function EmployeeDeptSeniorityComplaintsPage() {
    return (
        <div className="max-w-[1400px] mx-auto py-4">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Department Complaints Manager</h1>
                <p className="text-slate-500 mt-2 font-medium">Lodge and track complaints regarding this specific department.</p>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                <ProjectComplaintManager role="employee" />
            </div>
        </div>
    );
}
