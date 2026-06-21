'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, UserX, UserCheck, RefreshCw, AlertCircle,
    CheckCircle2, Clock, ChevronDown, ChevronUp, Settings2, Check, Info, Plus
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import RaiseComplaintModal from './RaiseComplaintModal';

interface Complaint {
    _id: string;
    complaintId: string;
    projectId?: any;
    projectName: string;
    description: string;
    category: string[];
    severity: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved';
    actionBy: string;
    role: string;
    againstName?: string;
    raisedByName?: string;
    raisedByRole?: string;
    isAiGenerated?: boolean;
    createdAt: string;
}

interface MyComplaintsData {
    raisedByMe: Complaint[];
    againstMe: Complaint[];
}

const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
    High: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    Medium: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    Low: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const statusConfig: Record<string, { dot: string; label: string }> = {
    'Open': { dot: 'bg-amber-400 animate-pulse', label: 'Open' },
    'In Progress': { dot: 'bg-indigo-400 animate-pulse', label: 'In Progress' },
    'Resolved': { dot: 'bg-emerald-500', label: 'Resolved' },
};

function ComplaintCard({
    complaint,
    type,
    role,
    onUpdate,
}: {
    complaint: Complaint;
    type: 'raised' | 'against';
    role: string;
    onUpdate: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [updating, setUpdating] = useState(false);
    const sev = severityConfig[complaint.severity] || severityConfig.Low;
    const sta = statusConfig[complaint.status] || statusConfig['Open'];

    const canAct = role === 'admin';

    const handleStatus = async (newStatus: string) => {
        try {
            setUpdating(true);
            await api.put(`/project-service-complaints/complaint/${complaint._id}/status`, { status: newStatus });
            toast.success(`Marked as ${newStatus}`);
            onUpdate();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden ${expanded ? 'border-indigo-200 shadow-lg shadow-indigo-50' : 'border-slate-100 hover:border-indigo-100 hover:shadow-md'
            }`}>
            {/* Card Header */}
            <button
                className="w-full text-left p-5 flex items-start gap-4"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Severity dot */}
                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${sev.bg} border-2 ${sev.border} relative`}>
                    <div className={`absolute inset-0.5 rounded-full ${sev.text.replace('text-', 'bg-').replace('-600', '-400')}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black text-indigo-600 font-mono">{complaint.complaintId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${sev.bg} ${sev.text} ${sev.border}`}>
                            {complaint.severity}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-500">
                            <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`} />
                            {sta.label}
                        </span>
                    </div>

                    <p className="text-sm font-bold text-slate-800 truncate">{complaint.description}</p>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {complaint.projectId?.uniqueId && <span className="text-indigo-500 mr-1">{complaint.projectId.uniqueId}</span>}
                            {complaint.projectName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-400">{Array.isArray(complaint.category) ? complaint.category.join(', ') : complaint.category}</span>
                        {type === 'raised' && complaint.againstName && (
                            <>
                                <span className="text-[10px] font-bold text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-rose-500">Against: {complaint.againstName}</span>
                            </>
                        )}
                        {type === 'against' && (complaint.raisedByName || complaint.isAiGenerated) && (
                            <>
                                <span className="text-[10px] font-bold text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-amber-600">
                                    By: {complaint.isAiGenerated ? '🤖 AI Audit' : complaint.raisedByName}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 mt-1">
                    {expanded
                        ? <ChevronUp size={16} className="text-slate-400" />
                        : <ChevronDown size={16} className="text-slate-400" />
                    }
                </div>
            </button>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-5 pb-5 border-t border-slate-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 md:col-span-1">
                            <div className="flex flex-col gap-2">
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Project ID</div>
                                    <div className="text-[10px] font-black text-indigo-600">
                                        {complaint.projectId?.uniqueId || '---'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Project Title</div>
                                    <div className="text-xs font-black text-slate-800 leading-tight">
                                        {complaint.projectName}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Category</div>
                            <div className="text-xs font-black text-slate-700">{Array.isArray(complaint.category) ? complaint.category.join(', ') : complaint.category}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Action By</div>
                            <div className="text-xs font-black text-indigo-600">{complaint.actionBy || '—'}</div>
                        </div>
                        {type === 'raised' && complaint.againstName && (
                            <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                                <div className="text-[9px] font-black text-rose-400 uppercase mb-1">Complaint Against</div>
                                <div className="text-xs font-black text-rose-700">{complaint.againstName}</div>
                                <div className="text-[9px] font-bold text-rose-400 mt-0.5">{complaint.role}</div>
                            </div>
                        )}
                        {type === 'against' && (
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <div className="text-[9px] font-black text-amber-500 uppercase mb-1">Raised By</div>
                                <div className="text-xs font-black text-amber-700">
                                    {complaint.isAiGenerated ? '🤖 System AI Audit' : complaint.raisedByName || 'Unknown'}
                                </div>
                                {complaint.raisedByRole && (
                                    <div className="text-[9px] font-bold text-amber-400 mt-0.5">{complaint.raisedByRole}</div>
                                )}
                            </div>
                        )}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Raised On</div>
                            <div className="text-xs font-black text-slate-700">
                                {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mb-4">
                        <div className="text-[9px] font-black text-indigo-500 uppercase mb-1.5">Description</div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{complaint.description}</p>
                    </div>

                    {/* Action buttons */}
                    {canAct && complaint.status !== 'Resolved' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Update Status:</span>
                            {updating ? (
                                <RefreshCw size={14} className="text-indigo-400 animate-spin" />
                            ) : (
                                <>
                                    {complaint.status !== 'In Progress' && (
                                        <button
                                            onClick={() => handleStatus('In Progress')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-colors"
                                        >
                                            <Settings2 size={11} /> In Progress
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleStatus('Resolved')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-colors"
                                    >
                                        <Check size={11} /> Resolve
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {complaint.status === 'Resolved' && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
                            <CheckCircle2 size={13} /> Complaint resolved
                        </div>
                    )}
                    {!canAct && complaint.status !== 'Resolved' && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 italic">
                            <Info size={12} /> Actions managed by: {complaint.actionBy}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function MyComplaintsView({ role, serviceSlug }: { role: string; serviceSlug?: string }) {
    const [data, setData] = useState<MyComplaintsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'against' | 'raised'>('against');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const canRaiseComplaint = role !== 'admin';

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/project-service-complaints/my-complaints');
            if (res.data.success) setData(res.data.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load complaints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <RefreshCw className="w-9 h-9 animate-spin text-indigo-500" />
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Loading Complaints...</p>
        </div>
    );

    const againstMe = data?.againstMe ?? [];
    const raisedByMe = data?.raisedByMe ?? [];

    const tabs = [
        { key: 'against', label: 'Complaints Against Me', icon: UserX, count: againstMe.length, color: 'rose' },
        { key: 'raised', label: 'Complaints I Raised', icon: UserCheck, count: raisedByMe.length, color: 'indigo' },
    ] as const;

    const activeList = activeTab === 'against' ? againstMe : raisedByMe;

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                        <ShieldAlert className="text-indigo-600 w-7 h-7" />
                        MY COMPLAINT REGISTRY
                    </h2>
                    <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">
                        Personal complaint visibility — {role.charAt(0).toUpperCase() + role.slice(1)} View
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canRaiseComplaint && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
                        >
                            <Plus size={14} /> Raise Complaint
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-3 flex-wrap">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            suppressHydrationWarning
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 border-2 ${isActive
                                    ? tab.color === 'rose'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200'
                                        : 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <Icon size={14} />
                            {tab.label}
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Summary bar */}
            {activeList.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                    {(['Open', 'In Progress', 'Resolved'] as const).map(s => {
                        const count = activeList.filter(c => c.status === s).length;
                        const cfg = statusConfig[s];
                        return (
                            <div key={s} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                <span className="text-[10px] font-black text-slate-500 uppercase">{s}</span>
                                <span className="text-xs font-black text-slate-800">{count}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Complaint Cards */}
            <div className="space-y-3">
                {activeList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                        <CheckCircle2 className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">
                            {activeTab === 'against' ? 'No complaints filed against you' : 'You have not raised any complaints'}
                        </p>
                    </div>
                ) : (
                    activeList.map(complaint => (
                        <ComplaintCard
                            key={complaint._id}
                            complaint={complaint}
                            type={activeTab === 'against' ? 'against' : 'raised'}
                            role={role}
                            onUpdate={fetchData}
                        />
                    ))
                )}
            </div>

            {canRaiseComplaint && (
                <RaiseComplaintModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { fetchData(); setActiveTab('raised'); }}
                    serviceSlug={serviceSlug}
                    role={role}
                />
            )}
        </div>
    );
}
