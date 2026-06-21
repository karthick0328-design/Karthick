'use client';

import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { User } from 'lucide-react';

export default function TLServiceComplaintsPage() {
    return (
        <main className="p-4 lg:p-10 flex-1">
            <div className="max-w-[1400px] mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                    <MyComplaintsView role="tl" />
                </div>
            </div>
        </main>
    );
}
