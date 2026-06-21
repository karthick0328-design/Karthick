'use client';

import { useParams } from 'next/navigation';
import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { User } from 'lucide-react';

export default function EmployeeServiceSeniorityComplaintsPage() {
    const { slug } = useParams();

    return (
        <main className="flex-1 overflow-y-auto p-4 lg:p-10">
            <div className="max-w-[1400px] mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                    <MyComplaintsView role="employee" serviceSlug={slug as string} />
                </div>
            </div>
        </main>
    );
}
