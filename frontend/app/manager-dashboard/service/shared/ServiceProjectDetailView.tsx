'use client';

import React from 'react';
import {
    Activity, Briefcase, CheckSquare, Clock, Mail, Phone,
    Search, Send, User, XCircle, ChevronRight,
    DollarSign, AlertCircle, ArrowLeft,
    UserPlus, Calendar, CreditCard, CheckCircle, FileText, Download, X, Receipt, Trash2, Plus, Upload, ExternalLink,
    GitBranch, Users, Bell, Code, Microscope, Beaker, Dna, FlaskConical, PlayIcon, ShieldCheck, Layers
} from 'lucide-react';
import Link from 'next/link';

interface ServiceProjectDetailViewProps {
    project: any;
    user: any;
    loading: boolean;
    chatMessages: any[];
    messageInput: string;
    setMessageInput: (val: string) => void;
    handleSendMessage: () => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    actions: {
        setShowEscalateHRModal: (val: boolean) => void;
        setShowReviewModal?: (val: boolean) => void;
        fetchTLs?: () => void;
        setShowTaskModal?: (val: boolean) => void;
        setShowProgressModal?: (val: boolean) => void;
        setShowCompleteModal?: (val: boolean) => void;
        setShowUploadModal?: (val: boolean) => void;
        handlePushProgress?: (activityId: string) => void;
        setQuotedAmount?: (val: number) => void;
    };
    serviceTitle: string;
    serviceIcon: React.ReactNode;
    breadcrumb: string;
    backUrl: string;
    workflowBar: React.ReactNode;
}

export default function ServiceProjectDetailView({
    project,
    user,
    loading,
    chatMessages,
    messageInput,
    setMessageInput,
    handleSendMessage,
    messagesEndRef,
    actions,
    serviceTitle,
    serviceIcon,
    breadcrumb,
    backUrl,
    workflowBar
}: ServiceProjectDetailViewProps) {

    if (!project) return null;

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

    // Activity Filtering Logic
    const allActivities = [...(project.activities || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const isEmployeeActivity = (a: any) => {
        const role = a.updatedBy?.role?.toLowerCase();
        const description = a.description || '';
        return role === 'employee' || role === 'specialist worker' || description.includes('[Employee Update]');
    };

    const employeeUpdates = allActivities.filter(a => isEmployeeActivity(a));
    const remainingActivities = allActivities.filter(a => !isEmployeeActivity(a));

    const managerUploadedPaths = new Set();
    if (project.activities) {
        project.activities.forEach((activity: any) => {
            const role = activity.updatedBy?.role?.toLowerCase();
            if (role !== 'user' && activity.attachments) {
                activity.attachments.forEach((file: any) => {
                    if (file.path) managerUploadedPaths.add(file.path);
                });
            }
        });
    }

    const vaultDocuments = (project.attachments || []).filter(
        (file: any) => !managerUploadedPaths.has(file.path)
    );

    const renderActivity = (activity: any, idx: number) => (
        <div key={idx} className="relative pl-8 pb-6 border-l-2 border-slate-100 last:pb-0">
            <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10" />
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-black text-slate-800">{activity.description}</p>
                    <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                        {new Date(activity.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {activity.remarks && (
                    <p className="text-[12px] text-slate-500 font-medium italic mb-3">"{activity.remarks}"</p>
                )}

                {/* Activity Attachments */}
                {activity.attachments && activity.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {activity.attachments.map((file: any, fIdx: number) => {
                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                            const fullUrl = `${baseUrl}/${file.path || ''}`.replace(/\\/g, '/');
                            return (
                                <a
                                    key={fIdx}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                                >
                                    <FileText size={12} />
                                    <span className="truncate max-w-[100px]">{file.filename}</span>
                                </a>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {activity.updatedBy?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            {activity.updatedBy?.name} • {activity.updatedBy?.role}
                        </span>
                    </div>
                    {activity.visibility === 'TL_Reviewed' && actions.handlePushProgress && (
                        <button
                            onClick={() => activity._id && actions.handlePushProgress!(activity._id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-slate-900 transition-all uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-indigo-100"
                        >
                            <Send size={10} /> Publish
                        </button>
                    )}
                    {activity.visibility === 'External' && (
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">
                            <ShieldCheck size={12} /> Client Visible
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header section removed per user request */}

                {/* --- NAVIGATION & ACTION BUTTONS --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 pt-2">
                    <div className="flex items-center gap-5">
                        <Link
                            href={backUrl}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-4 mb-1">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                                    {project.uniqueId}
                                </h1>
                                <div className="px-5 py-2.5 bg-indigo-600 text-white text-[11px] font-black rounded-2xl shadow-lg shadow-indigo-100 uppercase tracking-widest flex items-center gap-2.5 hover:scale-105 transition-all cursor-default group/stat">
                                    <Activity size={15} className="group-hover/stat:rotate-12 transition-transform" />
                                    <span>Current Status: <span className="text-indigo-100 ml-1">{project.status}</span></span>
                                </div>
                            </div>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">{project.category} • {project.department}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => actions.setShowEscalateHRModal(true)}
                            className="px-5 py-3 bg-white text-rose-600 text-[13px] font-black rounded-2xl border border-rose-100 hover:bg-rose-50 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
                        >
                            <AlertCircle size={15} /> Escalate to HR
                        </button>

                        {/* Step 1: Accept Project */}
                        {project.workflowStep === 1 && actions.setShowReviewModal && (
                            <button
                                onClick={() => {
                                    if (actions.setQuotedAmount) actions.setQuotedAmount(project.quotedAmount || 0);
                                    actions.setShowReviewModal!(true);
                                }}
                                className="px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[13px] font-black rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <ShieldCheck size={18} /> Accept Project
                            </button>
                        )}

                        {/* Step 2+: Assign TL Button */}
                        {!project.teamLeadId && project.workflowStep >= 2 && actions.fetchTLs && (
                            <button
                                onClick={actions.fetchTLs}
                                className="px-6 py-3.5 bg-indigo-600 text-white text-[13px] font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <UserPlus size={18} /> Assign TL
                            </button>
                        )}

                        {/* Step 4+: Start Task */}
                        {project.status === 'Under Review' && project.workflowStep >= 4 && actions.setShowTaskModal && (
                            <button
                                onClick={() => actions.setShowTaskModal!(true)}
                                className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[13px] font-black rounded-2xl shadow-xl shadow-blue-100 hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <PlayIcon size={18} className="fill-current" /> Start Task
                            </button>
                        )}

                        {project.status === 'In Progress' && (
                            <div className="flex gap-3">
                                {actions.setShowProgressModal && (
                                    <button
                                        onClick={() => actions.setShowProgressModal!(true)}
                                        className="px-6 py-3.5 bg-white text-indigo-600 border border-indigo-200 text-[13px] font-black rounded-2xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Activity size={18} /> Update Progress
                                    </button>
                                )}
                                {actions.setShowCompleteModal && (
                                    <button
                                        onClick={() => actions.setShowCompleteModal!(true)}
                                        className="px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[13px] font-black rounded-2xl shadow-xl shadow-emerald-100 hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <CheckSquare size={18} /> Complete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- PROFESSIONAL WORKFLOW BAR --- */}
                <div className="animate-in fade-in slide-in-from-top-6 duration-1000 mb-8">
                    <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative group/chain transition-all active:scale-[0.998]">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Layers size={80} className="rotate-12" />
                        </div>

                        {/* Status Header */}
                        <div className="flex items-center justify-between px-10 pt-8 pb-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] leading-none">Operational Protocol</span>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Pipeline Architecture</h3>
                            </div>
                            <div className="px-4 py-2 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{project.status}</span>
                            </div>
                        </div>

                        {/* Workflow Visualization Node */}
                        <div className="px-6">
                            <div className="bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50 my-6 shadow-inner">
                                {workflowBar}
                            </div>
                        </div>

                        {/* Integration Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100/80 divide-x divide-slate-100/80">
                            {[
                                {
                                    label: 'SM APPROVAL',
                                    icon: <ShieldCheck className="text-indigo-500" size={16} />,
                                    status: project.approvals?.serviceManager?.status || 'Pending',
                                    color: project.approvals?.serviceManager?.status === 'Approved' ? 'text-emerald-600' : 'text-slate-400',
                                    bg: project.approvals?.serviceManager?.status === 'Approved' ? 'bg-emerald-50/30' : 'bg-transparent'
                                },
                                {
                                    label: 'FIN APPROVAL',
                                    icon: <DollarSign className="text-amber-500" size={16} />,
                                    status: project.approvals?.financial?.status || 'Awaiting',
                                    color: project.approvals?.financial?.status === 'Approved' ? 'text-emerald-600' : 'text-slate-400'
                                },
                                {
                                    label: 'DEPLOYMENT',
                                    icon: <Calendar className="text-blue-500" size={16} />,
                                    status: new Date(project.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' }),
                                    sub: 'Operational Start',
                                    color: 'text-slate-700'
                                },
                                {
                                    label: 'ARCHETYPE',
                                    icon: <Layers className="text-purple-500" size={16} />,
                                    status: project.category || serviceTitle,
                                    sub: 'Categorical ID',
                                    color: 'text-slate-700'
                                }
                            ].map((node, i) => (
                                <div key={i} className={`p-6 transition-all hover:bg-white/60 group/node ${node.bg || ''}`}>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm group-hover/node:scale-110 transition-transform">
                                                {node.icon}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{node.label}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-black tracking-tight ${node.color} leading-none truncate`}>
                                                    {node.status}
                                                </p>
                                                {node.status === 'Approved' && <CheckCircle className="text-emerald-500" size={14} />}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{node.sub || 'Authentication Node'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* 1. Specifications Card */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden group hover:border-indigo-200 transition-all duration-500">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 text-white group-hover:rotate-6 transition-transform duration-500">
                                        <Search size={18} />
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest leading-none">Specifications</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Metadata</span>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {project.formData && Object.entries(project.formData).map(([key, value]) => {
                                        if (key === 'services' || key === 'remarks' || !value) return null;
                                        return (
                                            <div key={key} className="p-5 bg-[#F8FAFC] rounded-[1.5rem] border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 group-hover:shadow-md transition-all duration-300">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </div>
                                                <p className="text-[15px] font-black text-slate-800 tracking-tight leading-tight">{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                {project.formData?.services && (
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Functional Requirements</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(Array.isArray(project.formData.services) ? project.formData.services : [project.formData.services]).map((s: string, idx: number) => (
                                                <span key={idx} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-xl border border-indigo-100 uppercase tracking-wider shadow-sm hover:scale-105 transition-all">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Project Activity Card */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden group hover:border-emerald-200 transition-all duration-500">
                            <div className="p-6 border-b border-slate-100 bg-emerald-50/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100 text-white group-hover:rotate-6 transition-transform duration-500">
                                        <Activity size={18} />
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest leading-none">Project Activity</h3>
                                </div>
                                <div className="flex items-center gap-4 px-4 py-2 bg-[#F8FAFC] rounded-2xl border border-slate-200 shadow-sm leading-none group-hover:bg-white group-hover:border-emerald-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">Active Pulse</span>
                                    </div>
                                    <div className="w-px h-3 bg-slate-300" />
                                    <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">{project.status}</span>
                                </div>
                            </div>

                            <div className="p-10 space-y-10">
                                {/* Holistic Completion Integrity Bar */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                                        <span className="text-slate-400 flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-emerald-500" />
                                            Holistic Completion Integrity
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-indigo-600 text-lg">
                                                {project.status === 'Completed' ? '100' : project.status === 'In Progress' ? '45' : '15'}
                                            </span>
                                            <span className="text-indigo-300">%</span>
                                        </div>
                                    </div>
                                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-200 hover:border-indigo-100 transition-all">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-indigo-700 transition-all duration-[2000ms] shadow-lg rounded-full"
                                            style={{ width: project.status === 'Completed' ? '100%' : project.status === 'In Progress' ? '45%' : '15%' }}
                                        >
                                            <div className="absolute top-0 right-0 w-8 h-full bg-white/20 skew-x-12 animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Logs List */}
                                <div className="space-y-6">
                                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-8">
                                        {/* Employee Update Section */}
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-3 flex items-center gap-2 sticky top-0 bg-white py-2 z-20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                Employee Update
                                            </div>
                                            {employeeUpdates.length > 0 ? (
                                                employeeUpdates.map((activity, idx) => renderActivity(activity, idx))
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-300 italic pl-4">No employee updates indexed.</p>
                                            )}
                                        </div>

                                        {/* Remaining Activity Section */}
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-3 flex items-center gap-2 sticky top-0 bg-white py-2 z-20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Remaining Activity
                                            </div>
                                            {remainingActivities.length > 0 ? (
                                                remainingActivities.map((activity, idx) => renderActivity(activity, idx))
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-300 italic pl-4">No remaining activities indexed.</p>
                                            )}
                                        </div>

                                        {project.activities?.length === 0 && (
                                            <div className="text-center py-8 opacity-40">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none">No Pulse Detected</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Awaiting operational commencement...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Updated Minimal Footer - Project Pulsation */}
                                <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Global Synchronization Active</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-1 h-3 bg-slate-100 rounded-full" style={{ animation: `pulse 2s infinite ${i * 0.2}s` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Compact Contextual Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Requesting Node Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden group hover:border-emerald-200 transition-all duration-500">
                                <div className="p-4 border-b border-slate-100 bg-emerald-50/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-600 rounded-xl text-white group-hover:rotate-6 transition-transform">
                                            <User size={14} />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Client Details</h3>
                                    </div>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-[1.2rem] border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                                            {project.userId?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[14px] font-black text-slate-900 truncate tracking-tight">{project.userId?.name || 'N/A'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter leading-none">{project.uniqueId}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Client Identity</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-3 bg-[#F8FAFC] rounded-[1.2rem] border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Mail size={16} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[12px] font-bold text-slate-600 truncate">{project.userId?.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vault Documents Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-200/40 overflow-hidden group hover:border-orange-200 transition-all duration-500">
                                <div className="p-4 border-b border-slate-100 bg-orange-50/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-600 rounded-xl text-white group-hover:rotate-6 transition-transform">
                                            <FileText size={14} />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Vault Documents</h3>
                                    </div>
                                    <button
                                        onClick={() => actions.setShowUploadModal && actions.setShowUploadModal(true)}
                                        className="w-8 h-8 bg-white rounded-lg border border-slate-200 text-slate-400 hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="p-5">
                                    {vaultDocuments && vaultDocuments.length > 0 ? (
                                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                            {vaultDocuments.map((file: any, idx: number) => {
const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const filePath = file.path || '';
const relativePath = filePath.includes('uploads') 
    ? 'uploads' + filePath.split('uploads')[1].replace(/\\/g, '/') 
    : filePath.replace(/\\/g, '/');
const fullUrl = `${baseUrl}/${relativePath}`;
                                                return (
                                                    <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-slate-100 rounded-xl hover:bg-white hover:border-orange-200 transition-all group/file">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileText size={14} className="text-orange-600 shrink-0" />
                                                            <p className="text-[11px] font-bold text-slate-700 truncate">{file.filename}</p>
                                                        </div>
                                                        <ExternalLink size={12} className="text-slate-300 group-hover/file:text-orange-500" />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-6 border border-dashed border-slate-200 rounded-xl bg-[#F8FAFC] text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Empty</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* 1. Communication Bridge - Transmission Logs stays in right column */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col h-[600px] overflow-hidden group hover:border-indigo-200 transition-all duration-500">
                            <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-slate-900 rounded-2xl shadow-lg text-white group-hover:rotate-6 transition-transform duration-500">
                                        <Mail size={18} />
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest leading-none">Project Chat</h3>
                                </div>
                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest">
                                    Operational Link Active
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white no-scrollbar">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30 text-center">
                                        <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-400 border border-indigo-100 border-dashed">
                                            <Mail size={32} />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-600 leading-none mb-2">Awaiting Transmissions</p>
                                            <p className="text-[10px] font-bold text-slate-400">Secure channel ready for synchronization</p>
                                        </div>
                                    </div>
                                ) : (
                                    [...chatMessages].reverse().map((msg, idx) => {
                                        const isMe = (msg.senderId?._id || msg.senderId) === (user?.id || user?._id);
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}>
                                                <div className={`max-w-[75%] ${isMe ? 'bg-indigo-600 text-white rounded-3xl rounded-tr-none shadow-xl shadow-indigo-100' : 'bg-[#F8FAFC] text-slate-700 rounded-3xl rounded-tl-none border border-slate-200'} p-5 relative group/msg`}>
                                                    <div className="flex items-center justify-between gap-6 mb-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                                            {msg.senderId?.name || 'Staff Node'}
                                                        </span>
                                                        <span className={`text-[9px] font-bold opacity-50 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                                            {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[14px] font-medium leading-relaxed tracking-tight">{msg.content}</p>
                                                    {isMe && <div className="absolute -right-2 top-0 w-4 h-4 bg-indigo-600 rounded-sm skew-x-12 -z-10" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-6 bg-[#F8FAFC] border-t border-slate-100 mt-auto">
                                <div className="flex gap-4 p-2.5 bg-white rounded-[1.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 focus-within:border-indigo-400 transition-all group/input">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Transmit secure message..."
                                        className="flex-1 px-5 py-3 bg-transparent text-[14px] text-slate-800 outline-none font-semibold placeholder:text-slate-400"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim()}
                                        className="w-12 h-12 bg-indigo-600 text-white rounded-2xl hover:bg-slate-900 hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4. Project Team topology Card */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden group hover:border-violet-200 transition-all duration-500">
                            <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-violet-600 rounded-2xl shadow-lg shadow-violet-100 text-white group-hover:rotate-6 transition-transform duration-500">
                                        <GitBranch size={18} />
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest leading-none">Project Team</h3>
                                </div>
                            </div>
                            <div className="p-10">
                                <div className="relative pl-10 space-y-12">
                                    <div className="absolute left-[17px] top-10 bottom-10 w-1.5 bg-violet-50 rounded-full group-hover:bg-indigo-50 transition-colors" />

                                    {/* Service Manager */}
                                    <div className="relative group/node">
                                        <div className="absolute -left-[32px] top-1 w-7 h-7 rounded-full bg-white border-4 border-indigo-600 shadow-md z-10 group-hover/node:scale-125 transition-transform" />
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Service Manager</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[16px] font-black text-slate-800 tracking-tight">{project.assignedTo?.[0]?.name || 'Unassigned'}</p>
                                                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100 shadow-sm uppercase leading-none">
                                                    {project.assignedTo?.[0]?.uniqueId || project.assignedTo?.[0]?.unique_id || 'ID-ALPHA'}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authority Core • {project.assignedTo?.[0]?.role || 'SM'}</p>
                                        </div>
                                    </div>

                                    {/* Team Lead */}
                                    <div className="relative group/node">
                                        <div className="absolute -left-[32px] top-1 w-7 h-7 rounded-full bg-white border-4 border-slate-300 shadow-md z-10 group-hover/node:scale-125 transition-transform" />
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Operations Lead</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[16px] font-black text-slate-800 tracking-tight">{project.teamLeadId?.name || 'Awaiting Allocation'}</p>
                                                <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm uppercase leading-none">
                                                    {project.teamLeadId?.uniqueId || project.teamLeadId?.unique_id || 'ID-OMEGA'}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Execution Bridge • {project.teamLeadId?.role || 'TL'}</p>
                                        </div>
                                    </div>

                                    {/* Team/Employees */}
                                    <div className="relative group/node">
                                        <div className="absolute -left-[32px] top-1 w-7 h-7 rounded-full bg-white border-4 border-emerald-500 shadow-md z-10 group-hover/node:scale-125 transition-transform" />
                                        <div className="space-y-5">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Specialist Allocation</p>
                                            <div className="space-y-4">
                                                {project.teamMembers && project.teamMembers.length > 0 ? (
                                                    project.teamMembers.map((m: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100 group/avatar hover:bg-white hover:border-emerald-200 hover:shadow-lg transition-all">
                                                            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-[15px] shadow-sm group-hover/avatar:bg-emerald-600 group-hover/avatar:text-white transition-all">
                                                                {m.name?.charAt(0)}
                                                            </div>
                                                            <div className="overflow-hidden space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[14px] font-black text-slate-800 truncate">{m.name}</p>
                                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase">
                                                                        {m.uniqueId || m.unique_id || 'ID-NODE'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{m.role || 'Specialist Worker'}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[12px] font-bold text-slate-300 italic">Nodes not yet indexed.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
