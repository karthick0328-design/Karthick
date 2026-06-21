'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
    Activity, Briefcase, CheckSquare, Clock, Mail, Phone,
    Search, Send, User, XCircle, ChevronRight,
    DollarSign, AlertCircle, ArrowLeft, ArrowRight,
    UserPlus, Calendar, CreditCard, CheckCircle, FileText, Download, X, Receipt, Trash2, Plus, Upload, ExternalLink,
    GitBranch, Users, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectActivity {
    _id?: string;
    description: string;
    timestamp: string;
    updatedBy: {
        name: string;
        role: string;
        _id?: string;
        department?: string;
        service?: string;
    };
    remarks?: string;
    visibility?: 'Internal' | 'TL_Reviewed' | 'SM_Reviewed' | 'External';
}

interface Project {
    _id: string;
    uniqueId: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    department: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    teamMembers?: Array<{ _id: string; name: string; role: string; email?: string }>;
    assignedTo?: Array<{ _id: string; name: string; email: string; uniqueId: string }>;
    teamLeadId?: { _id: string; name: string; email: string; uniqueId: string };
    formData?: any;
    activities?: ProjectActivity[];
    reviewerRemarks?: string;
    paymentStatus?: string;
    attachments?: Array<{ path: string; filename: string; mimetype: string }>;
}

interface TLProjectDetailViewProps {
    project: Project;
    onPushProgress: (activityId: string) => void;
    onOpenUploadModal: () => void;
    onOpenProgressModal?: () => void;
    serviceIcon?: React.ReactNode;
}

const TLProjectDetailView: React.FC<TLProjectDetailViewProps> = ({
    project,
    onPushProgress,
    onOpenUploadModal,
    onOpenProgressModal,
    serviceIcon
}) => {
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const [user, setUser] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                setUser(jwtDecode(token));
            } catch (e) { }
            loadMessages(token);
        }
    }, [project._id]);

    const loadMessages = async (token: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setChatMessages(data.data?.messages || []);
            } else {
                console.error('API Error:', data.message);
                toast.error(data.message || 'Failed to open secure channel');
            }
        } catch (error) {
            console.error('Load messages error:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/projects/${project._id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: messageInput.trim() })
            });
            const data = await response.json();
            if (data.success) {
                setMessageInput('');
                loadMessages(token || '');
                toast.success('Message sent');
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'To Review': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Under Review': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (!project) return null;

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="max-w-full mx-auto space-y-8 animate-in fade-in duration-500">

                {/* --- NAVIGATION & HEADER --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                {project.uniqueId}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {project.status === 'In Progress' && onOpenProgressModal && (
                            <button
                                onClick={onOpenProgressModal}
                                className="px-6 py-3.5 bg-white text-indigo-600 border border-indigo-200 text-[13px] font-black rounded-2xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
                            >
                                <Activity size={18} /> Update Progress
                            </button>
                        )}
                        <span className={`px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border shadow-sm ${getStatusColor(project.status)}`}>
                            {project.status}
                        </span>
                        <span className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 text-[12px] font-black uppercase tracking-[0.2em] rounded-xl border border-slate-200 shadow-sm">
                            <Tag size={12} className="text-slate-400" />
                            {project.department}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">

                    {/* LEFT COLUMN: Main Console */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6 animate-in slide-in-from-left duration-500">

                        {/* 1. Project Specifications */}
                        <div className="bg-white rounded-[2rem] border border-blue-100 shadow-lg overflow-hidden relative group">
                            <div className="p-5 border-b border-blue-100 bg-blue-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm text-white">
                                        <Search size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-widest">Specifications</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {project.formData && Object.entries(project.formData).map(([key, value]) => {
                                        if (key === 'services' || key === 'remarks' || !value) return null;
                                        return (
                                            <div key={key} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="text-[13px] font-bold text-slate-800">{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                {project.formData?.services && (
                                    <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-2">
                                        {(Array.isArray(project.formData.services) ? project.formData.services : [project.formData.services]).map((s: string, idx: number) => (
                                            <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-lg border border-indigo-100/50 uppercase tracking-wider">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* 2. Feedback Log (Optional if present) */}
                         {project.reviewerRemarks && (
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                                    <div className="p-2 bg-rose-600 rounded-lg text-white">
                                        <FileText size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-slate-900 tracking-tight uppercase tracking-wider">Reviewer Pulse</h3>
                                </div>
                                <div className="p-6">
                                    <div className="relative p-7 bg-rose-50/50 rounded-[2rem] border border-rose-100 text-rose-900 text-sm font-black italic shadow-inner">
                                        <div className="absolute top-2 left-3 text-4xl text-rose-200/50 font-serif leading-none">"</div>
                                        <p className="relative z-10 pl-4">{project.reviewerRemarks}</p>
                                        <div className="absolute bottom-2 right-3 text-4xl text-rose-200/50 font-serif leading-none rotate-180">"</div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* 3. Internal Bridge (Project Chat) */}
                        <div className="bg-white rounded-[2rem] border border-fuchsia-100 shadow-xl flex flex-col h-[550px] overflow-hidden group">
                            <div className="p-5 border-b border-fuchsia-100 bg-fuchsia-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-fuchsia-600 rounded-lg shadow-md text-white">
                                        <Mail size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-fuchsia-900 uppercase tracking-widest">Project Chat</h3>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-7 space-y-5 bg-white custom-scrollbar no-scrollbar">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                                        <Mail size={48} className="text-indigo-200" />
                                        <p className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-400">Idle Transmission</p>
                                    </div>
                                ) : (
                                    [...chatMessages].reverse().map((msg, idx) => {
                                        const isMe = (msg.senderId?._id || msg.senderId) === (user?.id || user?._id);
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-2xl rounded-tl-none border border-slate-200'} p-4 space-y-1.5`}>
                                                    <div className="flex items-center justify-between gap-5 mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-indigo-100' : 'text-indigo-600'}`}>
                                                            {msg.senderId?.name || 'Staff'}
                                                        </span>
                                                        <span className={`text-[10px] font-bold opacity-50 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                                            {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[14px] font-medium leading-relaxed">{msg.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-5 bg-slate-50 border-t border-slate-100">
                                <div className="flex gap-4 p-2 bg-white rounded-xl border border-slate-200 shadow-sm focus-within:border-indigo-300 transition-all">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Secure message..."
                                        className="flex-1 px-4 py-2.5 bg-transparent text-[14px] text-slate-800 outline-none font-semibold"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim()}
                                        className="w-10 h-10 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 disabled:opacity-20 transition-all flex items-center justify-center shrink-0 shadow-md"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* RIGHT COLUMN: Sidebar */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 animate-in slide-in-from-right duration-500">

                        {/* 1. Project Parameters / Vault (Replaces standard attachments view per user request) */}
                        <div className="bg-white rounded-[2rem] border border-orange-100 shadow-lg overflow-hidden group">
                            <div className="p-5 border-b border-orange-100 bg-orange-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-600 rounded-lg text-white">
                                        <FileText size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-orange-900 uppercase tracking-widest">Project Parameters</h3>
                                </div>
                                <button
                                    onClick={onOpenUploadModal}
                                    className="w-8 h-8 bg-white rounded-lg border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                    title="Upload File"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="p-6">
                                {(() => {
                                    const managerUploadedPaths = new Set();
                                    (project.activities || []).forEach((activity: any) => {
                                        const role = activity.updatedBy?.role;
                                        // Assume any role other than 'user' is staff/manager
                                        if (role && role.toLowerCase() !== 'user') {
                                            (activity.attachments || []).forEach((att: any) => {
                                                if (att.path) managerUploadedPaths.add(att.path);
                                            });
                                        }
                                    });

                                    const userAttachments = (project.attachments || []).filter((file: any) => {
                                        return file.path && !managerUploadedPaths.has(file.path);
                                    });

                                    if (userAttachments.length > 0) {
                                        return (
                                            <div className="space-y-3 max-h-[180px] overflow-y-auto no-scrollbar">
                                                {userAttachments.map((file: any, idx: number) => {
                                                    const fullUrl = `${API_BASE_URL}/${file.path || ''}`.replace(/\\/g, '/');
                                                    return (
                                                        <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 transition-all group/item">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <FileText size={14} className="text-slate-400 group-hover/item:text-indigo-600" />
                                                                <p className="text-[12px] font-bold text-slate-700 truncate">{file.filename}</p>
                                                            </div>
                                                            <ExternalLink size={12} className="text-slate-300" />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center">
                                            <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest">No Client Uploads Present</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* 2. Stakeholder Profile */}
                        <div className="bg-white rounded-[2rem] border border-teal-100 shadow-lg overflow-hidden group">
                            <div className="p-5 border-b border-teal-100 bg-teal-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-600 rounded-lg text-white">
                                        <User size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-teal-900 uppercase tracking-widest">Client Profile</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300">
                                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-teal-100 shrink-0">
                                        {project.userId?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Full Name</p>
                                        <p className="text-[14px] font-black text-slate-900 truncate leading-none">{project.userId?.name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300">
                                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                                        <Mail size={15} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                                        <p className="text-[12px] font-bold text-slate-700 truncate leading-none">{project.userId?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Team Topology */}
                        <div className="bg-white rounded-[2rem] border border-violet-100 shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-violet-100 bg-violet-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-violet-600 rounded-lg text-white">
                                        <GitBranch size={20} />
                                    </div>
                                    <h3 className="text-[14px] font-black text-violet-900 uppercase tracking-widest">Project Team</h3>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="relative pl-8 space-y-10">
                                    <div className="absolute left-[13px] top-8 bottom-8 w-1 bg-cyan-100/50" />

                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-violet-500 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest leading-none">Primary Manager</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[15px] font-black text-slate-800">{project.assignedTo?.[0]?.name || 'Unassigned'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-slate-400 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Lead Operator</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[15px] font-black text-slate-800">{project.teamLeadId?.name || 'Awaiting Allocation'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10" />
                                        <div className="space-y-4">
                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">Field Assets</p>
                                            <div className="space-y-3">
                                                {project.teamMembers && project.teamMembers.length > 0 ? (
                                                    project.teamMembers.map((m: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:border-emerald-200 transition-all">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[14px] shadow-sm">
                                                                {m.name?.charAt(0)}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[13px] font-bold text-slate-800 truncate">{m.name}</p>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-400 italic capitalize truncate">{m.email || 'Operational Specialist'}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[12px] font-medium text-slate-400 italic">No field assets assigned.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* BOTTOM ROW: Transmission Log */}
                <div className="grid grid-cols-1 mt-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className="px-10 py-7 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                                    <Activity size={22} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-wider">Transmission Log</h3>
                            </div>
                            <span className="text-[10px] font-black px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 uppercase tracking-widest">Personnel Only</span>
                        </div>

                        <div className="p-10">
                            {(() => {
                                const assignedIds = (project.teamMembers || []).map((m: any) => m._id || m.id);
                                const filtered = (project.activities || [])
                                    .filter((a) => {
                                        const isEmployee = a.updatedBy?.role === 'employee';
                                        const isAssigned = assignedIds.includes(a.updatedBy?._id);
                                        const isNotFinance =
                                            !(a.updatedBy?.department || '').toLowerCase().includes('finance') &&
                                            !(a.updatedBy?.role || '').toLowerCase().includes('finance');
                                        return isEmployee && isAssigned && isNotFinance;
                                    })
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                                if (filtered.length === 0) return (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 space-y-4">
                                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                            <Activity size={32} className="text-indigo-100" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-lg font-black text-slate-900 tracking-tight">Idle State Detected</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Awaiting initial personnel telemetry</p>
                                        </div>
                                    </div>
                                );

                                return (
                                    <div className="relative space-y-6">
                                        <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-200" />

                                        {filtered.map((activity, idx) => (
                                            <div key={idx} className="relative flex gap-6 group/log">
                                                <div className="relative z-10 flex-shrink-0 w-20 flex flex-col items-center">
                                                     <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center font-bold text-slate-500 group-hover/log:border-indigo-500 group-hover/log:text-indigo-600 group-hover/log:shadow-md transition-all">
                                                         {activity.updatedBy?.name.charAt(0)}
                                                     </div>
                                                     <span className="mt-3 text-[10px] font-bold text-slate-500">
                                                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                     </span>
                                                     <span className="text-[9px] font-medium text-slate-400">
                                                        {new Date(activity.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                     </span>
                                                </div>

                                                <div className="flex-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all">
                                                    <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{activity.updatedBy?.name}</p>
                                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">{activity.updatedBy?.role}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {activity.visibility === 'Internal' && activity.updatedBy?.role === 'employee' ? (
                                                                <button
                                                                    onClick={() => activity._id && onPushProgress(activity._id)}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                                                                >
                                                                    Authorize Dispatch
                                                                    <ArrowRight size={12} />
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    {activity.visibility && activity.visibility !== 'Internal' ? (
                                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                                            <CheckCircle size={12} />
                                                                            Pushed ({activity.visibility === 'External' ? 'Client' : 'Manager'})
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                                            <Clock size={12} />
                                                                            Internal
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{activity.description}</p>

                                                    {activity.remarks && (
                                                        <div className="mt-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                                            <div className="flex items-start gap-3">
                                                                <FileText size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                                                                <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                                                                    "{activity.remarks}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TLProjectDetailView;
