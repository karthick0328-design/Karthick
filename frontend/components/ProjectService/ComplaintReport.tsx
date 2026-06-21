import React, { useState } from 'react';
import { 
    AlertCircle, CheckCircle2, AlertTriangle, Shield, Eye, 
    ArrowUpRight, Users, Layout, Zap, Info, TrendingUp,
    Briefcase, UserX, UserCheck, Calendar, Settings2,
    Check, X, RefreshCw, FileText, Archive, Activity, 
    ShieldCheck, Paperclip, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api$/, '');

const sanitizeUrl = (url: string | null | undefined) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^(https?:\/\/|\/)/i.test(trimmed) && !trimmed.toLowerCase().includes('javascript:')) {
        return trimmed;
    }
    return '';
};

interface ComplaintReportProps {
    data: any; 
    onUpdate?: () => void;
    role?: string;
}

export default function ProjectComplaintReport({ data, onUpdate, role }: ComplaintReportProps) {
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [previewCase, setPreviewCase] = useState<any>(null);

    if (!data) return <div className="p-8 text-center text-slate-500 font-bold">No report data available.</div>;

    const { projectSummary, complaintSummary, complaints, aiGeneratedComplaints, escalations, resolutions, adminInsights, adminActions } = data;

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setUpdatingId(id);
            await api.put(`/project-service-complaints/complaint/${id}/status`, 
                { status: newStatus }
            );
            toast.success(`Status updated to ${newStatus}`);
            if (onUpdate) onUpdate();
            if (previewCase && previewCase._id === id) {
                setPreviewCase({ ...previewCase, status: newStatus });
            }
        } catch (error: any) {
            console.error("Status update error:", error);
            toast.error(error.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    const userRoleFriendly = (role || '').charAt(0).toUpperCase() + (role || '').slice(1).toLowerCase();
    const isAdmin = ['admin', 'head', 'manager'].includes((role || '').toLowerCase());
    const canManage = (complaint: any) => isAdmin;

    const exportCaseDossier = (c: any) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(c, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `CASE_DOSSIER_${c.complaintId}_${timestamp}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success("Dossier Extract Completed");
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header: Project Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-indigo-500/20">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter mb-2">
                        COMPLAINT MANAGEMENT <span className="text-indigo-400">REPORT</span>
                    </h1>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <span className="bg-white/10 text-indigo-100 border border-indigo-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center">
                            <Briefcase size={14} className="mr-2" />
                            {projectSummary?.projectId}
                        </span>
                        <span className="bg-white/10 text-indigo-100 border border-indigo-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center">
                            <Layout size={14} className="mr-2" />
                            {projectSummary?.projectName}
                        </span>
                        <span className="bg-white/10 text-indigo-100 border border-indigo-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center">
                            <Zap size={14} className="mr-2 text-yellow-400" />
                            Project Service
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="text-[10px] uppercase font-bold text-indigo-300 mb-1">Total Issues</div>
                        <div className="text-2xl font-black">{complaintSummary?.total || 0}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Resolved</div>
                        <div className="text-2xl font-black">{complaintSummary?.resolved || 0}</div>
                    </div>
                </div>
            </div>

            {/* Stage 3 & 8: Analytics & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-4">
                        <div className="text-sm font-black flex items-center gap-2">
                            <TrendingUp size={16} className="text-indigo-600" />
                            CRITICAL COMPLAINTS
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {adminInsights?.criticalComplaints?.map((id: string) => (
                                <div key={id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="text-xs font-bold text-rose-700">{id}</span>
                                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">CRITICAL</span>
                                </div>
                            )) || <div className="text-slate-400 text-xs text-center py-4 font-bold">No critical issues</div>}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-4">
                        <div className="text-sm font-black flex items-center gap-2">
                            <UserX size={16} className="text-orange-600" />
                            FREQUENT OFFENDERS
                        </div>
                    </div>
                    <div className="p-6">
                         <div className="space-y-3">
                            {adminInsights?.frequentOffenders?.map((id: string) => (
                                <div key={id} className="flex items-center p-3 bg-orange-50 rounded-xl border border-orange-100 gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-black text-xs">
                                        USR
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] text-orange-600 font-bold">User System ID</div>
                                        <div className="text-xs font-black text-slate-800">{id}</div>
                                    </div>
                                </div>
                            )) || <div className="text-slate-400 text-xs text-center py-4 font-bold">Status clear</div>}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-slate-50/50 border-b border-slate-100 p-4">
                        <div className="text-sm font-black flex items-center gap-2">
                            <Shield size={16} className="text-emerald-600" />
                            RISK SUMMARY
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[11px] font-bold mb-2">
                                    <span>Project Risk Index</span>
                                    <span className={complaintSummary?.riskSummary === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-600'}>
                                        {complaintSummary?.riskSummary || 'STABLE'}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full transition-all duration-1000 ${
                                        complaintSummary?.riskSummary === 'CRITICAL' ? 'bg-rose-500 w-[95%]' : 
                                        complaintSummary?.riskSummary === 'ELEVATED' ? 'bg-orange-500 w-[60%]' : 'bg-emerald-500 w-[20%]'
                                    }`}></div>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-500 uppercase mb-1">AI Audit Insight</div>
                                <div className="text-xs text-slate-600 leading-relaxed italic font-medium">
                                    "{adminInsights?.projectRiskSummary || 'No immediate risks detected in current project cycle.'}"
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stage 4: Compliant List Table */}
            <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden">
                <div className="bg-slate-900 border-b border-white/10 p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-white text-xl font-black tracking-tight uppercase">Unified Complaint Registry</h2>
                            <p className="text-slate-400 font-bold text-xs mt-1">Stage 4: Role-Based Visibility Controlled List</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-bold">Manual</span>
                            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-bold">AI Generated</span>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Complaint</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Against</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Severity</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Action By</th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {complaints?.map((c: any) => (
                                <tr 
                                    key={c._id || c.complaintId} 
                                    className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                                    onClick={() => setPreviewCase(c)}
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full transform transition-transform group-hover:scale-125 ${c.isAiGenerated ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-indigo-400'}`} />
                                            <div>
                                                <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                    {c.complaintId}
                                                    <ArrowUpRight size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{c.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs font-black text-slate-700">{c.againstName}</div>
                                        <div className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-1">{c.role}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black border shadow-sm ${
                                            c.severity === 'High' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                                            c.severity === 'Medium' ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {c.severity}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-600">
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'Resolved' ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                                            {c.status}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-black text-slate-500">
                                        {c.actionBy}
                                    </td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin ? (
                                            <div className="flex items-center gap-2">
                                                {updatingId === c._id ? (
                                                    <RefreshCw size={16} className="text-indigo-500 animate-spin" />
                                                ) : c.status !== 'Resolved' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(c._id, 'In Progress')}
                                                            className={`p-2 rounded-lg border transition-all ${c.status === 'In Progress' ? 'bg-indigo-100 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:shadow-sm'}`}
                                                            title="Mark In Progress"
                                                        >
                                                            <Settings2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(c._id, 'Resolved')}
                                                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                                                            title="Resolve Case"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                                                        <ShieldCheck size={14} /> Finalized
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-400 font-bold italic">No Permissions</div>
                                        )}
                                    </td>
                                </tr>
                            )) || <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-xs uppercase italic">Registry empty</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Stage 8: Admin Actions */}
            <AdminActionPanels adminActions={adminActions} />

            {/* Case Preview Drawer */}
            {previewCase && (
                <div className="fixed inset-0 z-[300] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPreviewCase(null)} />
                    <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right-10 duration-500 border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="bg-slate-900 text-white p-8 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Live Intelligence Preview</span>
                                </div>
                                <h2 className="text-2xl font-black tracking-tightest">INTERNAL DOSSIER</h2>
                                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{previewCase.complaintId}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {isAdmin && (
                                    <button 
                                        onClick={() => exportCaseDossier(previewCase)}
                                        className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                                        title="Export Dossier Intelligence"
                                    >
                                        <Download size={20} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setPreviewCase(null)}
                                    className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-400 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-10">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Impact Severity</div>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                        previewCase.severity === 'High' ? 'bg-rose-100 text-rose-600' :
                                        previewCase.severity === 'Medium' ? 'bg-orange-100 text-orange-600' :
                                        'bg-slate-200 text-slate-600'
                                    }`}>
                                        {previewCase.severity} Severity
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Case Status</div>
                                    <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                        <div className={`w-2 h-2 rounded-full ${previewCase.status === 'Resolved' ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                                        {previewCase.status}
                                    </div>
                                </div>
                            </div>

                            {/* Main Context */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <FileText size={14} className="text-indigo-600" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Statement</span>
                                </div>
                                <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-3xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                                    <p className="relative z-10 text-slate-800 text-lg font-medium italic leading-relaxed">
                                        "{previewCase.description}"
                                    </p>
                                </div>
                            </div>

                            {/* Subjects & Evidence */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Personnel Involved</div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
                                                {previewCase.againstName?.[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">{previewCase.againstName}</div>
                                                <div className="text-[10px] font-bold text-indigo-500 uppercase">{previewCase.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Case Evidence</div>
                                    {previewCase.evidenceFiles?.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {previewCase.evidenceFiles.map((file: any, i: number) => {
                                                const rawUrl = file.url ? (file.url.startsWith('http') ? file.url : `${API_BASE_URL}${file.url}`) : null;
                                                const url = sanitizeUrl(rawUrl);
                                                return (
                                                    <a key={i} href={url || '#'} target="_blank" rel="noopener noreferrer" 
                                                       className="aspect-square bg-slate-50 border border-slate-100 rounded-xl overflow-hidden group relative">
                                                        {file.mimetype?.startsWith('image/') && url ? (
                                                            <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <Paperclip size={20} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye size={16} className="text-white" />
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                                            <Archive size={24} className="mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No evidence archived</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Admin Action Control */}
                            {isAdmin && previewCase.status !== 'Resolved' && (
                                <div className="pt-10 border-t border-slate-100">
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Executive Status Update</div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => handleUpdateStatus(previewCase._id, 'In Progress')}
                                            disabled={previewCase.status === 'In Progress'}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                                previewCase.status === 'In Progress' 
                                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                                                : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98]'
                                            }`}
                                        >
                                            <Settings2 size={16} /> Mark In Progress
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(previewCase._id, 'Resolved')}
                                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            <Check size={16} /> Resolve Case
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Fallback Administrative Steering Protocols
const STEERING_PROTOCOLS = {
    immediate: [
        'Issue high-priority performance warnings to identified risk factors',
        'Direct reallocation of mission-critical tasks to stabilizing units',
        'Implement immediate operational freezes on disputed activity streams',
    ],
    preventive: [
        'Deploy mandatory leadership synchronisation for segment leads',
        'Activate automated multi-vector audit triggers and review cycles',
        'Enforce recalibrated operational bandwidth per departmental unit',
    ],
    strategic: [
        'Initiate full-scale structural realignment of high-risk project nodes',
        'Integrate AI-driven delay prediction with real-time risk mitigation',
        'Execute departmental restructuring for persistent suboptimal performance',
    ],
};

function AdminActionPanels({ adminActions }: { adminActions?: any }) {
    const [expanded, setExpanded] = React.useState<string | null>(null);

    const immediate = (adminActions?.immediate?.length > 0) ? adminActions.immediate : STEERING_PROTOCOLS.immediate;
    const preventive = (adminActions?.preventive?.length > 0) ? adminActions.preventive : STEERING_PROTOCOLS.preventive;
    const strategic = (adminActions?.strategic?.length > 0) ? adminActions.strategic : STEERING_PROTOCOLS.strategic;

    const panels = [
        {
            key: 'immediate',
            label: 'Tactical Interventions',
            items: immediate,
            bg: 'bg-white',
            border: 'border-rose-100',
            icon: ShieldCheck,
            color: 'text-rose-600',
            accent: 'bg-rose-50',
            numColor: 'text-rose-400',
        },
        {
            key: 'preventive',
            label: 'Risk Mitigation',
            items: preventive,
            bg: 'bg-white',
            border: 'border-amber-100',
            icon: Zap,
            color: 'text-amber-600',
            accent: 'bg-amber-50',
            numColor: 'text-amber-400',
        },
        {
            key: 'strategic',
            label: 'Structural Governance',
            items: strategic,
            bg: 'bg-white',
            border: 'border-indigo-100',
            icon: TrendingUp,
            color: 'text-indigo-600',
            accent: 'bg-indigo-50',
            numColor: 'text-indigo-400',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    ADMINISTRATIVE <span className="text-indigo-600">STEERING SUITE</span>
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {panels.map((panel) => {
                    const isOpen = expanded === panel.key;
                    const Icon = panel.icon;
                    return (
                        <div
                            key={panel.key}
                            className={`group relative overflow-hidden rounded-[2.5rem] bg-white border-2 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 ${
                                isOpen ? 'border-indigo-500 shadow-xl shadow-indigo-100' : `${panel.border} shadow-sm`
                            }`}
                        >
                            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.03] blur-2xl transform scale-150 transition-transform group-hover:scale-[2] ${panel.color.replace('text-', 'bg-')}`} />

                            <button
                                className="w-full p-8 text-left flex items-start justify-between gap-4"
                                onClick={() => setExpanded(isOpen ? null : panel.key)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-current/10 transition-transform group-hover:scale-110 ${panel.accent} ${panel.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-slate-900 text-xs font-black uppercase tracking-widest">{panel.label}</h4>
                                        <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{panel.items.length} Intelligence Points</p>
                                    </div>
                                </div>
                                <div className={`mt-1 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-300'}`}>
                                    <ChevronUp size={20} />
                                </div>
                            </button>

                            {!isOpen && (
                                <div className="px-8 pb-8">
                                    <div className={`p-4 rounded-2xl border border-dotted ${panel.border} ${panel.accent}/30 relative group/preview`}>
                                        <div className="flex gap-4 text-xs font-bold leading-relaxed text-slate-600 italic">
                                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${panel.accent} ${panel.numColor}`}>1</span>
                                            <div className="line-clamp-2 pr-4">{panel.items[0]}</div>
                                        </div>
                                        {panel.items.length > 1 && (
                                            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] font-black text-slate-300 bg-white px-2 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                                                +{panel.items.length - 1} <span className="hidden group-hover/preview:inline">MORE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isOpen && (
                                <div className="px-8 pb-10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="h-px bg-slate-100 w-full mb-6" />
                                    <ul className="space-y-5">
                                        {panel.items.map((action: string, i: number) => (
                                            <li key={i} className="flex gap-4 text-[11px] font-bold leading-relaxed text-slate-600 group/li">
                                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black ${panel.accent} ${panel.numColor} transition-transform group-hover/li:scale-110`}>
                                                    {i + 1}
                                                </span>
                                                <span className="group-hover/li:text-slate-900 transition-colors">{action}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

