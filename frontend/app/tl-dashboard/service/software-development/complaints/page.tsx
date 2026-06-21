'use client';

import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { User } from 'lucide-react';

export default function SoftwareDevelopmentTLComplaintsPage() {
    return (
        <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-[1400px] mx-auto space-y-6">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                    <MyComplaintsView role="tl" serviceSlug="software-development" />
                </div>
            </div>
        </main>
    );
}