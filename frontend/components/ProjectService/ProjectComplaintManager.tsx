"use client";

import React, { useState, useEffect } from 'react';
import {
    RefreshCw, ShieldCheck, Layout, ShieldAlert,
    Briefcase, Zap, Activity, Plus, Bell, TrendingUp,
    Clock, CheckCircle2, AlertCircle, BarChart2,
    FileDown, Search, Filter, ArrowUpRight
} from 'lucide-react';
import ProjectComplaintReport from './ComplaintReport';
import RaiseComplaintModal from './RaiseComplaintModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const RISK_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
    CRITICAL: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', label: 'CRITICAL' },
    ELEVATED: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: 'ELEVATED' },
    STABLE: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'STABLE' },
};

export default function ProjectComplaintManager({ role, serviceSlug }: { role: string; serviceSlug?: string }) {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [previewReport, setPreviewReport] = useState<any>(null);
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Roles that can raise complaints
    const canAccessIntelligence = ['admin', 'head', 'manager'].includes((role || '').toLowerCase());
    const canRaise = ['employee', 'tl', 'manager', 'head'].includes((role || '').toLowerCase());

    const fetchReports = async () => {
        try {
            setLoading(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                console.error("[Complaint Manager] No token found in localStorage");
                toast.error("Authentication required. Please log in again.");
                return;
            }

            const res = await api.get('/project-service-complaints/reports');
            if (res.data.success) {
                let data = res.data.data;
                if (serviceSlug) {
                    const ns = serviceSlug.replace(/-/g, ' ').toLowerCase();
                    data = data.filter((r: any) =>
                        r.projectSummary?.projectName?.toLowerCase().includes(ns) ||
                        r.projectName?.toLowerCase().includes(ns)
                    );
                }
                setReports(data);
                if (selectedReport) {
                    const updated = data.find((r: any) => r._id === selectedReport._id);
                    if (updated) setSelectedReport(updated);
                }
            }
        } catch (error: any) {
            console.error("[Complaint Manager] API Error:", error.response || error);
            if (error.response?.status === 401) {
                toast.error("Session expired or unauthorized. Please re-login.");
            } else {
                toast.error(error.response?.data?.message || "Failed to fetch compliance reports");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [serviceSlug]);

    // Aggregate stats
    const totalComplaints = reports.reduce((s, r) => s + (r.complaintSummary?.total || 0), 0);
    const openComplaints = reports.reduce((s, r) => s + (r.complaintSummary?.open || 0), 0);
    const resolvedComplaints = reports.reduce((s, r) => s + (r.complaintSummary?.resolved || 0), 0);
    const criticalCount = reports.filter(r => r.complaintSummary?.riskSummary === 'CRITICAL').length;

    const exportIntelligence = (singleReport?: any) => {
        const dataToExport = singleReport ? [singleReport] : reports;
        if (dataToExport.length === 0) {
            toast.error("No intelligence data to extract.");
            return;
        }
        const timestamp = new Date().toISOString().split('T')[0];
        const headers = "Project ID,Project Name,Total Complaints,Open,Resolved,Risk Level\n";
        const body = dataToExport.map(r => 
            `${r.projectSummary?.projectId || ''},${(r.projectSummary?.projectName || '').replace(/,/g, ' ')},${r.complaintSummary?.total || 0},${r.complaintSummary?.open || 0},${r.complaintSummary?.resolved || 0},${r.complaintSummary?.riskSummary || 'STABLE'}`
        ).join("\n");
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + body);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `INTEL_${singleReport ? singleReport.projectSummary?.projectId : 'GLOBAL'}_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(singleReport ? "Project Intelligence Extracted" : "Global Intelligence Extraction Success");
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = (r.projectSummary?.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (r.projectSummary?.projectId || r.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRisk = filterRisk ? (r.complaintSummary?.riskSummary === filterRisk) : true;
        return matchesSearch && matchesRisk;
    });

    // isAdmin definition removed from here

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <ShieldCheck className="absolute inset-0 m-auto text-indigo-400 w-6 h-6" />
            </div>
            <p className="text-slate-500 font-black text-sm uppercase tracking-widest">Loading Compliance Registry...</p>
        </div>
    );

    return (
        <div className="p-1 space-y-8 animate-in fade-in duration-500">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                        <ShieldCheck className="text-indigo-600 w-8 h-8" />
                        SERVICE COMPLAINT HUB
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500 text-sm font-bold">Project-Based Employee Performance & Compliance System</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {canAccessIntelligence && (
                        <button
                            onClick={exportIntelligence}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                        >
                            <FileDown size={14} /> Extract Intel
                        </button>
                    )}
                    {view === 'detail' && (
                        <button
                            onClick={() => setView('list')}
                            className="px-5 py-2.5 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center gap-2">
                            <Layout size={14} /> Registry
                        </button>
                    )}
                    {canRaise && (
                        <button
                            onClick={() => setShowRaiseModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all">
                            <Plus size={14} /> Raise Complaint
                        </button>
                    )}
                </div>
            </div>

            {/* ── Advanced Search & Intelligence Filters ──────────────── */}
            {view === 'list' && (
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Universal Intelligent Search (Project, ID, Personnel...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-indigo-400 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${
                                showAdvancedFilters ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <Filter size={16} /> Advanced Audit {showAdvancedFilters ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {showAdvancedFilters && (
                        <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white space-y-4 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <Zap className="text-indigo-400" size={18} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Risk Categorization Filters</span>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                {['ALL', 'CRITICAL', 'ELEVATED', 'STABLE'].map(risk => (
                                    <button
                                        key={risk}
                                        onClick={() => setFilterRisk(risk === 'ALL' ? null : risk)}
                                        className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                                            (risk === 'ALL' && !filterRisk) || filterRisk === risk
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {risk}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Stats Bar ──────────────────────────────────── */}
            {view === 'list' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: BarChart2, label: 'Total Complaints', value: totalComplaints, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                        { icon: Bell, label: 'Open', value: openComplaints, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                        { icon: CheckCircle2, label: 'Resolved', value: resolvedComplaints, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                        { icon: AlertCircle, label: 'Critical Projects', value: criticalCount, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.bg} border-2 ${stat.border} rounded-2xl p-4 flex items-center gap-3`}>
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={18} />
                            </div>
                            <div>
                                <div className={`text-2xl font-black ${stat.color} tracking-tighter leading-none`}>{stat.value}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Content ────────────────────────────────────── */}
            {view === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Raise Complaint CTA Card — always visible for eligible roles */}
                    {(canRaise && !searchQuery && !filterRisk) && (
                        <div
                            onClick={() => setShowRaiseModal(true)}
                            className="group relative bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] border-2 border-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center p-8 text-center min-h-[260px]">
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Plus size={28} className="text-white" />
                                </div>
                                <h3 className="text-white font-black text-lg tracking-tight mb-1">Raise a Complaint</h3>
                                <p className="text-indigo-200 text-xs font-bold leading-relaxed max-w-[160px]">
                                    Submit a formal complaint against a team member
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all">
                                    <ShieldAlert size={12} /> Start Report
                                </div>
                            </div>
                        </div>
                    )}

                    {filteredReports.length === 0 ? (
                        <div className={`${(canRaise && !searchQuery && !filterRisk) ? 'col-span-full md:col-span-2 lg:col-span-2' : 'col-span-full'} border-4 border-dashed border-slate-200 p-16 rounded-[3rem] text-center bg-slate-50/50`}>
                            <ShieldAlert className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">No Compliance Matches Found</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2 font-bold text-sm">
                                Adjust your Intelligent Search or filters to locate specific project units.
                            </p>
                        </div>
                    ) : (
                        filteredReports.map(report => {
                            const risk = RISK_CONFIG[report.complaintSummary?.riskSummary] || RISK_CONFIG['STABLE'];
                            const urgentCount = (report.complaints || []).filter((c: any) => c.isUrgent).length;
                            return (
                                <div
                                    key={report._id}
                                    className="group relative bg-white rounded-[2.5rem] border-2 border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10 hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden"
                                    onClick={() => { setSelectedReport(report); setView('detail'); }}>

                                    {/* Top accent line */}
                                    <div className={`h-1 w-full ${risk.bg.replace('bg-', 'bg-').replace('-50', '-400')}`} />

                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                                                <Briefcase size={20} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {urgentCount > 0 && (
                                                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-200">
                                                        <Zap size={8} /> {urgentCount} URGENT
                                                    </span>
                                                )}
                                                <span className={`${risk.bg} ${risk.text} border ${risk.border} px-2.5 py-0.5 rounded-full text-[9px] font-black`}>
                                                    {risk.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-1">
                                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Project Unit</div>
                                            <div className="text-lg font-black text-slate-800 tracking-tighter truncate flex items-center justify-between group/title">
                                                {report.projectSummary?.projectId || '—'}
                                                {canAccessIntelligence && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/title:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setPreviewReport(report); }}
                                                            className="p-1 px-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase"
                                                        >
                                                            Preview
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); exportIntelligence(report); }}
                                                            className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase"
                                                        >
                                                            Export
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-slate-400 font-bold text-xs mb-5 truncate">{report.projectSummary?.projectName}</p>

                                        {/* Metrics */}
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                                            <div className="text-center">
                                                <div className="text-xl font-black text-slate-800">{report.complaintSummary?.total || 0}</div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase">Total</div>
                                            </div>
                                            <div className="text-center border-x border-slate-200">
                                                <div className="text-xl font-black text-amber-500">{report.complaintSummary?.open || 0}</div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase">Open</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xl font-black text-emerald-500">{report.complaintSummary?.resolved || 0}</div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase">Resolved</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <Zap size={12} className="text-slate-400" />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Audit Active</span>
                                            </div>
                                            <div className="p-2.5 bg-slate-900 text-white rounded-xl group-hover:bg-indigo-600 transition-colors shadow-md">
                                                <Activity size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <ProjectComplaintReport data={selectedReport} onUpdate={fetchReports} role={role} />
            )}

            {/* ── Raise Complaint Modal ──────────────────────── */}
            <RaiseComplaintModal
                isOpen={showRaiseModal}
                onClose={() => setShowRaiseModal(false)}
                onSuccess={() => { setShowRaiseModal(false); fetchReports(); }}
                serviceSlug={serviceSlug}
                role={role}
            />

            {/* ── Intelligence Preview Drawer ────────────────── */}
            {previewReport && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPreviewReport(null)} />
                    <div className="relative w-full max-w-xl bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right-10 duration-500 border-l border-slate-200">
                        <div className="bg-slate-900 text-white p-8 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black tracking-tightest">INTELLIGENCE PREVIEW</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                    {previewReport.projectSummary?.projectId} • REGISTRY SYNC
                                </p>
                            </div>
                            <button onClick={() => setPreviewReport(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <Plus className="rotate-45 text-white" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Signals</div>
                                    <div className="text-2xl font-black text-slate-900">{previewReport.complaintSummary?.total || 0}</div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Risk Status</div>
                                    <div className={`text-xs font-black uppercase ${
                                        previewReport.complaintSummary?.riskSummary === 'CRITICAL' ? 'text-rose-600' : 'text-emerald-600'
                                    }`}>
                                        {previewReport.complaintSummary?.riskSummary}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Escalations</h4>
                                <div className="space-y-3">
                                    {(previewReport.complaints || []).slice(0, 3).map((c: any, i: number) => (
                                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-4">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5" />
                                            <div>
                                                <div className="text-xs font-black text-slate-800">{c.complaintId}</div>
                                                <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1">{c.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(previewReport.complaints || []).length === 0 && (
                                        <p className="text-[10px] text-center font-bold text-slate-400 italic py-4">
                                            No recent escalations recorded.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <button 
                                    onClick={() => { setSelectedReport(previewReport); setView('detail'); setPreviewReport(null); }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                                >
                                    Open Full Dossier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
