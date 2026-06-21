'use client';

import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { User } from 'lucide-react';

export default function MolecularBiologyManagerComplaintsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                <MyComplaintsView role="manager" serviceSlug="molecular-biology" />
            </div>
        </div>
    );
}