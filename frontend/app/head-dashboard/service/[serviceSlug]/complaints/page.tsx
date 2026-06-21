'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { ShieldCheck, User, LayoutGrid } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function HeadServiceSlugComplaintsPage() {
    const { serviceSlug } = useParams();
    const [tab, setTab] = useState<'mine' | 'reports'>('mine');

    return (
        <div className="min-h-screen bg-slate-50/50 p-8">
            <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <ShieldCheck className="w-7 h-7 text-indigo-600" />
                            Service Complaints Center
                        </h1>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 mt-1">
                            Monitoring: {(serviceSlug as string)?.replace(/-/g, ' ')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab('mine')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                tab === 'mine'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
                            }`}
                        >
                            <User size={13} /> My Complaints
                        </button>
                        <button
                            onClick={() => setTab('reports')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                                tab === 'reports'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <LayoutGrid size={13} /> All Reports
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                    {tab === 'mine'
                        ? <MyComplaintsView role="head" serviceSlug={serviceSlug as string} />
                        : <ProjectComplaintManager role="head" serviceSlug={serviceSlug as string} />
                    }
                </div>
            </div>
        </div>
    );
}
