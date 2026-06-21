const fs = require('fs');
const path = require('path');

const services = ['biochemistry', 'drug-discovery', 'microbiology', 'molecular-biology', 'ngs', 'software-development'];

services.forEach(svc => {
    // e.g. 'Drug Discovery' -> 'DrugDiscovery'
    const nameNoSpaces = svc.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const serviceName = svc.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    const managerContent = `'use client';

import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { ShieldCheck, User, LayoutGrid } from 'lucide-react';
import { useState } from 'react';

export default function ${nameNoSpaces}ManagerComplaintsPage() {
    const [tab, setTab] = useState<'mine' | 'reports'>('mine');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <ShieldCheck className="w-7 h-7 text-indigo-600" />
                        ${serviceName} Complaints
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Service-level escalations and complaint management for the ${serviceName} unit.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTab('mine')}
                        suppressHydrationWarning
                        className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all \${tab === 'mine' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}\`}
                    >
                        <User size={13} /> My Complaints
                    </button>
                    <button
                        onClick={() => setTab('reports')}
                        suppressHydrationWarning
                        className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all \${tab === 'reports' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}\`}
                    >
                        <LayoutGrid size={13} /> All Reports
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                {tab === 'mine'
                    ? <MyComplaintsView role="manager" serviceSlug="${svc}" />
                    : <ProjectComplaintManager role="manager" serviceSlug="${svc}" />
                }
            </div>
        </div>
    );
}`;

    const tlContent = `'use client';

import TLSidebar from '@/app/tl-dashboard/components/TLSidebar';
import TLHeader from '@/app/tl-dashboard/components/TLHeader';
import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';
import MyComplaintsView from '@/components/ProjectService/MyComplaintsView';
import { ShieldCheck, User, LayoutGrid } from 'lucide-react';
import { useState } from 'react';

export default function ${nameNoSpaces}TLComplaintsPage() {
    const [tab, setTab] = useState<'mine' | 'reports'>('mine');

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <TLSidebar overrideService="${svc}" />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TLHeader />
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                                    ${serviceName} Complaints
                                </h1>
                                <p className="text-slate-500 mt-1 font-medium">Team-level service complaint management for the ${serviceName} unit.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTab('mine')}
                                    suppressHydrationWarning
                                    className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all \${tab === 'mine' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'}\`}
                                >
                                    <User size={13} /> My Complaints
                                </button>
                                <button
                                    onClick={() => setTab('reports')}
                                    suppressHydrationWarning
                                    className={\`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all \${tab === 'reports' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}\`}
                                >
                                    <LayoutGrid size={13} /> All Reports
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
                            {tab === 'mine'
                                ? <MyComplaintsView role="tl" serviceSlug="${svc}" />
                                : <ProjectComplaintManager role="tl" serviceSlug="${svc}" />
                            }
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}`;

    const mgrDir = path.join(__dirname, 'app', 'manager-dashboard', 'service', svc, 'complaints');
    const tlDir = path.join(__dirname, 'app', 'tl-dashboard', 'service', svc, 'complaints');
    const mgrPath = path.join(mgrDir, 'page.tsx');
    const tlPath = path.join(tlDir, 'page.tsx');

    try { fs.mkdirSync(mgrDir, { recursive: true }); fs.writeFileSync(mgrPath, managerContent); console.log('Wrote', mgrPath); } catch(e) { console.error(e) }
    try { fs.mkdirSync(tlDir, { recursive: true }); fs.writeFileSync(tlPath, tlContent); console.log('Wrote', tlPath); } catch(e) { console.error(e) }
});
