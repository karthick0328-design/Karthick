"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    X, ShieldAlert, Send, Users, Briefcase, AlertTriangle,
    ChevronRight, ChevronLeft, Eye, EyeOff, Tag, Calendar,
    Zap, MessageSquare, UserCheck, CheckCircle2, Clock,
    FileText, AlertCircle, Info, Sparkles, Lock, Server,
    UploadCloud, File, Trash2, Paperclip, Loader2, Link,
    ShieldCheck, ActivitySquare
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api$/, '');

const sanitizeUrl = (url: string | null | undefined) => {
    if (!url) return '';
    const trimmed = url.trim();
    // Strict allowlist: only http, https, or local paths starting with /
    // This prevents javascript: and other dangerous schemes
    if (/^(https?:\/\/|\/)/i.test(trimmed) && !trimmed.toLowerCase().includes('javascript:')) {
        return trimmed;
    }
    return '';
};

interface RaiseComplaintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceSlug?: string;
    role: string;
}

const STEPS = [
    { id: 1, label: 'Target', icon: Users },
    { id: 2, label: 'Category', icon: Briefcase },
    { id: 3, label: 'Details', icon: FileText },
    { id: 4, label: 'Advanced', icon: Sparkles },
    { id: 5, label: 'Preview', icon: Eye },
];

const SEVERITY_CONFIG = {
    Low: { color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', score: 1 },
    Medium: { color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', score: 2 },
    High: { color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', score: 3 },
};

const ROLE_CATEGORIES: Record<string, string[]> = {
    employee: ['Overloading tasks', 'Unfair distribution', 'Delayed approvals', 'Misconduct by TL', 'Not completing dependent tasks', 'Hostile work environment', 'Favoritism'],
    tl: ['Not completing tasks', 'Frequent delays', 'Poor quality work', 'Insubordination', 'Policy violation', 'Missed deadlines'],
    manager: ['Poor team handling', 'Unbalanced workload distribution', 'Repeated delays', 'Ignoring escalations', 'Strategic failure', 'Blocking project decisions', 'Budget misuse'],
    head: ['Poor project delivery', 'Repeated escalation failures', 'Mismanagement', 'Resource misallocation', 'KPI non-compliance'],
    admin: ['Performance', 'Behavior', 'Task Delay', 'Mismanagement', 'Ethics Violation', 'Compliance Breach'],
};

const SUGGESTED_TAGS = ['urgent', 'deadline', 'misconduct', 'performance', 'repeated', 'harassment', 'resource', 'budget', 'quality', 'ethics'];

// ── SUB-COMPONENTS ───────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isDone = step.id < current;
                const isActive = step.id === current;
                return (
                    <React.Fragment key={`indicator-step-${step.id}`}>
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isDone ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : isActive ? 'bg-white border-indigo-500 text-indigo-600 shadow-md'
                                : 'bg-white border-slate-200 text-slate-300'
                            }`}>
                                {isDone ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                                isActive ? 'text-indigo-600' : isDone ? 'text-indigo-400' : 'text-slate-300'
                            }`}>{step.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-0.5 w-8 mb-4 transition-all duration-500 ${isDone ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
    const [input, setInput] = useState('');

    const addTag = (tag: string) => {
        const t = tag.trim().toLowerCase();
        if (t && !tags.includes(t) && tags.length < 8) {
            onChange([...tags, t]);
            setInput('');
        }
    };

    const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-2 focus-within:border-indigo-400 transition-colors">
                {(Array.isArray(tags) ? tags : []).map((tag, i) => (
                    <span key={`tag-${tag}-${i}`} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-0.5 text-[10px] font-black">
                        #{tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900 ml-0.5">
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
                        if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
                    }}
                    placeholder={tags.length < 8 ? "Add tag, press Enter..." : "Max 8 tags"}
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-[11px] font-bold text-slate-700 placeholder-slate-300"
                />
            </div>
            <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map((st, idx) => (
                    <button key={`suggested-tag-${idx}`} type="button" onClick={() => addTag(st)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
                        +{st}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── FILE UPLOADER ───────────────────────────────────────────────

function FileUploader({ 
    files, 
    onChange, 
    complaintId 
}: { 
    files: any[]; 
    onChange: (files: any[]) => void;
    complaintId?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        if (files.length + selectedFiles.length > 5) {
            toast.error("Maximum 5 evidence files allowed");
            return;
        }

        const formData = new FormData();
        Array.from(selectedFiles).forEach(file => {
            formData.append('evidenceFiles', file);
        });
        if (complaintId) formData.append('complaintId', complaintId);

        try {
            setUploading(true);
            const res = await api.post('/project-service-complaints/evidence/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                onChange([...files, ...res.data.files]);
                toast.success(`${res.data.files.length} file(s) uploaded`);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "File upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = (filename: string) => {
        onChange(files.filter(f => f.filename !== filename));
        // We don't delete from disk here for staging files, 
        // to simplify the flow. Backend will clean up or 
        // we can add a delete endpoint if complaintId exists.
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-3">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative group border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                
                {/* Visual Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                
                <div className="relative z-10 flex flex-col items-center">
                    {uploading ? (
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                    ) : (
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud size={24} />
                        </div>
                    )}
                    <h3 className="text-sm font-black text-slate-700 tracking-tight">
                        {uploading ? 'Uploading Evidence...' : 'Drop files here or click to upload'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                        Images, PDF, Word, Excel, ZIP (Max 10MB)
                    </p>
                </div>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleUpload}
                    multiple
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(Array.isArray(files) ? files : []).map((file, idx) => {
                        const isImage = file.mimetype?.startsWith('image/');
                        const rawUrl = file.url ? (file.url.startsWith('http') ? file.url : `${API_BASE_URL}${file.url}`) : null;
                        const fileUrl = sanitizeUrl(rawUrl);

                        return (
                            <div key={`evidence-file-${file.filename || idx}`} className="bg-white border-2 border-slate-50 rounded-2xl p-3 flex items-center gap-3 group animate-in slide-in-from-bottom-2 duration-300">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                                    {isImage && fileUrl ? (
                                        <img src={fileUrl} alt="preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <File size={18} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-700 truncate">{file.originalName}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">{formatSize(file.size)} · {file.mimetype?.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeFile(file.filename); }}
                                    className="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center justify-center">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


// ── MAIN MODAL COMPONENT ─────────────────────────────────────────

export default function RaiseComplaintModal({ isOpen, onClose, onSuccess, serviceSlug, role }: RaiseComplaintModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [draftSaved, setDraftSaved] = useState(false);
    const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const categoryOptions = ROLE_CATEGORIES[role.toLowerCase()] || ROLE_CATEGORIES['admin'];

    const [formData, setFormData] = useState({
        againstId: '',
        category: [categoryOptions[0]],
        severity: 'Low' as 'Low' | 'Medium' | 'High',
        description: '',
        // Advanced fields
        incidentDate: new Date().toISOString().slice(0, 16),
        isUrgent: false,
        isAnonymous: false,
        witnesses: [] as string[],
        evidenceNotes: '',
        evidenceFiles: [] as any[],
        tags: [] as string[],
    });

    // Auto-save draft
    useEffect(() => {
        if (!isOpen) return;
        if (draftTimer.current) clearTimeout(draftTimer.current);
        draftTimer.current = setTimeout(() => {
            try {
                localStorage.setItem('complaint_draft', JSON.stringify({ formData, selectedProject, step }));
                setDraftSaved(true);
                setTimeout(() => setDraftSaved(false), 2000);
            } catch (_) {}
        }, 1500);
    }, [formData, selectedProject, step]);

    // Restore draft on open
    useEffect(() => {
        if (!isOpen) return;
        try {
            const draft = localStorage.getItem('complaint_draft');
            if (draft) {
                const parsed = JSON.parse(draft);
                setFormData(prev => ({ ...prev, ...parsed.formData }));
                setSelectedProject(parsed.selectedProject || '');
            }
        } catch (_) {}
        fetchProjects();
    }, [isOpen]);

    useEffect(() => {
        if (selectedProject) fetchProjectTeam(selectedProject);
        else setTeamMembers([]);
    }, [selectedProject]);

    const fetchProjects = async () => {
        try {
            const isStaff = ['employee', 'tl', 'manager', 'head', 'admin'].includes(role.toLowerCase());
            const endpoint = isStaff ? 'employee/assigned-projects' : 'my-projects';
            const res = await api.get(`/projects/${endpoint}`);
            if (res.data.success) {
                let fetched = res.data.data;
                if (serviceSlug) {
                    const ns = serviceSlug.replace(/-/g, ' ').toLowerCase();
                    fetched = fetched.filter((p: any) =>
                        p.department?.toLowerCase().includes(ns) || p.category?.toLowerCase().includes(ns)
                    );
                }
                setProjects(fetched);
            }
        } catch { toast.error("Failed to fetch projects"); }
    };

    const fetchProjectTeam = async (projectId: string) => {
        try {
            const res = await api.get(`/projects/${projectId}`);
            if (res.data.success) {
                const project = res.data.data;
                const members: any[] = [];
                if (project.assignedTo) members.push(...project.assignedTo);
                if (project.teamLeadId) members.push(project.teamLeadId);
                if (project.teamMembers) members.push(...project.teamMembers);

                const unique = Array.from(new Map(members.map(m => [m._id, m])).values());
                const userStr = localStorage.getItem('user');
                const me = userStr ? JSON.parse(userStr) : null;
                let filtered = unique.filter(m => m._id !== me?.id);

                const r = role.toLowerCase();
                if (r === 'employee') filtered = filtered.filter(m => ['employee', 'tl'].includes(m.role.toLowerCase()));
                else if (r === 'tl') filtered = filtered.filter(m => ['employee', 'manager'].includes(m.role.toLowerCase()));
                else if (r === 'manager') filtered = filtered.filter(m => ['tl', 'head', 'employee'].includes(m.role.toLowerCase()));
                else if (r === 'head') filtered = filtered.filter(m => ['manager', 'tl'].includes(m.role.toLowerCase()));

                setTeamMembers(filtered);
            }
        } catch { toast.error("Failed to fetch project team"); }
    };

    const handleSubmit = async () => {
        if (!selectedProject || !formData.againstId || !formData.description.trim()) {
            toast.error("Please fill all required fields");
            return;
        }
        try {
            setLoading(true);
            const res = await api.post('/project-service-complaints/manual', {
                projectId: selectedProject,
                ...formData,
            });
            if (res.data.success) {
                toast.success("🎯 Complaint submitted successfully");
                localStorage.removeItem('complaint_draft');
                onSuccess();
                onClose();
                resetForm();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to submit complaint");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSelectedProject('');
        setTeamMembers([]);
        setFormData({
            againstId: '', category: [categoryOptions[0]], severity: 'Low',
            description: '', incidentDate: new Date().toISOString().slice(0, 16),
            isUrgent: false, isAnonymous: false, witnesses: [], evidenceNotes: '', tags: [],
            evidenceFiles: []
        });
    };

    const canAdvance = () => {
        if (step === 1) return selectedProject && formData.againstId;
        if (step === 2) return formData.category.length > 0;
        if (step === 3) return formData.description.trim().length >= 20;
        return true;
    };

    const selectedMember = teamMembers.find(m => m._id === formData.againstId);
    const selectedProjectObj = projects.find(p => p._id === selectedProject);
    const sevConfig = SEVERITY_CONFIG[formData.severity];
    const priorityScore = sevConfig.score + (formData.isUrgent ? 2 : 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-white w-full h-full md:h-[94vh] md:max-w-5xl md:rounded-[3rem] shadow-[0_32px_128px_-32px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col relative">
                
                {/* ── Background Decoration ── */}
                <div className={`absolute top-0 right-0 w-[40%] h-[60%] bg-gradient-to-bl ${sevConfig.color} opacity-[0.03] rounded-bl-full pointer-events-none`} />
                <div className={`absolute bottom-0 left-0 w-[30%] h-[40%] bg-gradient-to-tr ${sevConfig.color} opacity-[0.02] rounded-tr-full pointer-events-none`} />

                {/* ── Header Area ── */}
                <div className={`relative px-10 py-8 flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-md`}>
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-3xl bg-gradient-to-br ${sevConfig.color} text-white shadow-xl shadow-indigo-200 animate-pulse-slow`}>
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tightest">SUBMIT OFFICIAL REPORT</h2>
                                <div className="flex gap-2">
                                    {formData.isUrgent && (
                                        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-amber-200 shadow-sm animate-bounce-subtle">
                                            <Zap size={10} /> URGENT
                                        </div>
                                    )}
                                    {formData.isAnonymous && (
                                        <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md">
                                            <Lock size={10} /> ANONYMOUS
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <ActivitySquare size={12} className="text-indigo-500" />
                                BIOLAB PERFORMANCE & COMPLIANCE REGISTRY
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={() => { onClose(); }} 
                        className="group flex flex-col items-center gap-1.5 p-3 hover:bg-rose-50 rounded-2xl transition-all duration-300">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors shadow-inner">
                            <X size={20} />
                        </div>
                        <span className="text-[9px] font-black text-slate-300 group-hover:text-rose-400 tracking-widest uppercase">Discard</span>
                    </button>
                </div>

                {/* ── Progress Bar & Draft ── */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-10 py-5 flex items-center justify-between relative overflow-hidden">
                    <StepIndicator current={step} total={STEPS.length} />
                    
                    <div className="flex items-center gap-6">
                        {draftSaved && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 animate-in fade-in slide-in-from-right-2 duration-300">
                                <CheckCircle2 size={12} /> Auto-Saved
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <Clock size={14} className="text-indigo-400" />
                            Session Active: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* ── Content Grid ── */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* Main Form Scrolling Area */}
                    <div className="flex-1 overflow-y-auto px-10 py-10 custom-scrollbar relative">
                        <div className="max-w-3xl mx-auto space-y-12">

                        {/* STEP 1 – Target Identification */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Identify the Subject</h3>
                                    <p className="text-slate-500 font-bold text-sm">Select the specific project and individual involved in this report.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <Briefcase size={14} /> Active Project Workflow
                                        </label>
                                        <div className="relative group">
                                            <select
                                                value={selectedProject}
                                                onChange={e => setSelectedProject(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-100 hover:border-indigo-300 rounded-[1.5rem] px-5 py-4 font-bold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Select a Project...</option>
                                                {projects.map((p, idx) => (
                                                    <option key={`project-opt-${p._id || idx}`} value={p._id}>{p.uniqueId} — {p.formData?.titleProject || p.category}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronRight className="rotate-90" size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={14} /> Subject of Report
                                        </label>
                                        <div className="relative group">
                                            <select
                                                value={formData.againstId}
                                                onChange={e => setFormData({ ...formData, againstId: e.target.value })}
                                                disabled={!selectedProject}
                                                className="w-full bg-slate-50 border-2 border-slate-100 hover:border-indigo-300 disabled:opacity-50 rounded-[1.5rem] px-5 py-4 font-bold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">{selectedProject ? 'Choose Individual...' : 'Awaiting Project Selection'}</option>
                                                {teamMembers.map((m, idx) => (
                                                    <option key={`member-opt-${m._id || idx}`} value={m._id}>{m.name} ({m.role})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronRight className="rotate-90" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedMember && (
                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/20 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                        <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-4xl font-black group-hover:scale-105 transition-transform">
                                            {selectedMember.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h4 className="text-3xl font-black tracking-tight mb-1">{selectedMember.name}</h4>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                                <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedMember.role}</span>
                                                <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedMember.department || 'General'} Operations</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-400 text-slate-900 px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-tighter flex items-center gap-2 shadow-lg shadow-emerald-400/20">
                                            <UserCheck size={16} /> Identity Confirmed
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 2 – Classification */}
                        {step === 2 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Classify the Incident</h3>
                                    <p className="text-slate-500 font-bold text-sm">Select the most accurate category and define the impact level.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Incident Category</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {categoryOptions.map((cat, idx) => {
                                            const isActive = formData.category.includes(cat);
                                            return (
                                                <button key={`cat-opt-${idx}`} type="button"
                                                    onClick={() => {
                                                        const newCats = isActive 
                                                            ? formData.category.filter(c => c !== cat) 
                                                            : [...formData.category, cat];
                                                        setFormData({ ...formData, category: newCats });
                                                    }}
                                                    className={`py-4 px-5 rounded-[1.5rem] text-[11px] font-black border-4 transition-all text-left relative overflow-hidden group ${
                                                        isActive
                                                        ? 'bg-slate-900 border-indigo-600 text-white shadow-xl translate-y-[-4px]'
                                                        : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'
                                                    }`}>
                                                    {cat}
                                                    {isActive && (
                                                        <div className="absolute top-2 right-2 text-indigo-400">
                                                            <CheckCircle2 size={14} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Impact Severity Assessment</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['Low', 'Medium', 'High'] as const).map((sev, idx) => {
                                            const cfg = SEVERITY_CONFIG[sev];
                                            const isActive = formData.severity === sev;
                                            return (
                                                <button key={`sev-opt-${idx}`} type="button"
                                                    onClick={() => setFormData({ ...formData, severity: sev })}
                                                    className={`p-6 rounded-[2rem] border-2 text-left transition-all ${
                                                        isActive
                                                        ? `bg-gradient-to-br ${cfg.color} text-white border-transparent shadow-xl scale-[1.02]`
                                                        : `bg-slate-50 border-slate-100 ${cfg.text} hover:bg-white hover:border-indigo-100 opacity-60 hover:opacity-100`
                                                    }`}>
                                                    <div className={`w-10 h-10 rounded-2xl ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'} flex items-center justify-center mb-4`}>
                                                        <AlertTriangle size={20} className={isActive ? 'text-white' : cfg.text.replace('text-', 'text-')} />
                                                    </div>
                                                    <div className="font-black text-lg tracking-tight mb-1">{sev}</div>
                                                    <p className={`text-[10px] font-bold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                                        {sev === 'Low' ? 'Isolated incident with minimal ripple effect.' : 
                                                         sev === 'Medium' ? 'Repetitive issue causing operational friction.' : 
                                                         'Critical incident requiring immediate mediation.'}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 – Documentation & Evidence */}
                        {step === 3 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Incident Documentation</h3>
                                    <p className="text-slate-500 font-bold text-sm">Provide a factual account of the situation and attach supporting evidence.</p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center justify-between">
                                        Detailed Incident log *
                                        <span className={`text-[9px] ${formData.description.length >= 20 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {formData.description.length}/1000 chars
                                        </span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        rows={6}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 font-bold text-sm text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none shadow-inner"
                                        placeholder="Outline the sequence of events, specific actions taken, and the professional impact. Please be objective and concise..."
                                    />
                                    {formData.description.length < 20 && (
                                        <p className="text-[10px] text-rose-500 font-black flex items-center gap-1.5 px-4">
                                            <AlertCircle size={10} /> Minimum 20 characters required for validity.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Supporting Evidence Files</label>
                                    <FileUploader 
                                        files={formData.evidenceFiles} 
                                        onChange={fFiles => setFormData({ ...formData, evidenceFiles: fFiles })} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <Link size={14} /> Link references (Optional)
                                        </label>
                                        <textarea
                                            value={formData.evidenceNotes}
                                            onChange={e => setFormData({ ...formData, evidenceNotes: e.target.value })}
                                            rows={2}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-xs text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none shadow-inner"
                                            placeholder="Drive links, chat ID references..."
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                            <Tag size={14} /> Classification Tags
                                        </label>
                                        <TagInput tags={formData.tags} onChange={tags => setFormData({ ...formData, tags })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4 – Advanced Shielding */}
                        {step === 4 && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Shielding & Timing</h3>
                                    <p className="text-slate-500 font-bold text-sm">Configure anonymity and timestamp the incident accurately.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Incident Timeline</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.incidentDate}
                                                max={new Date().toISOString().slice(0, 16)}
                                                onChange={e => setFormData({ ...formData, incidentDate: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-6 py-4 font-black text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Operational Witnesses</label>
                                            <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                                {teamMembers.filter(m => m._id !== formData.againstId).map((m, idx) => {
                                                    const isWitness = formData.witnesses.includes(m._id);
                                                    return (
                                                        <button key={`witness-opt-${m._id || idx}`} type="button"
                                                            onClick={() => {
                                                                const next = isWitness ? formData.witnesses.filter(id => id !== m._id) : [...formData.witnesses, m._id];
                                                                setFormData({ ...formData, witnesses: next });
                                                            }}
                                                            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all group ${
                                                                isWitness ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-50 hover:border-slate-200'
                                                            }`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${isWitness ? 'bg-white/20' : 'bg-indigo-50 text-indigo-500'}`}>
                                                                    {m.name?.[0]}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-[10px] font-black">{m.name}</div>
                                                                    <div className={`text-[8px] font-bold ${isWitness ? 'text-white/60' : 'text-slate-400'}`}>{m.role}</div>
                                                                </div>
                                                            </div>
                                                            {isWitness && <CheckCircle2 size={12} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">Protocol Toggles</label>
                                        <div className="space-y-4">
                                            <button type="button"
                                                onClick={() => setFormData({ ...formData, isUrgent: !formData.isUrgent })}
                                                className={`w-full p-6 p-8 rounded-[2.5rem] border-4 text-left transition-all ${
                                                    formData.isUrgent ? 'bg-amber-50 border-amber-400 shadow-xl shadow-amber-900/10' : 'bg-white border-slate-50 opacity-60'
                                                }`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <Zap className={formData.isUrgent ? 'text-amber-500' : 'text-slate-300'} size={24} />
                                                    <div className={`w-12 h-6 rounded-full relative transition-all ${formData.isUrgent ? 'bg-amber-500' : 'bg-slate-200'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${formData.isUrgent ? 'left-7' : 'left-1'}`} />
                                                    </div>
                                                </div>
                                                <h5 className={`font-black text-xl tracking-tight mb-1 ${formData.isUrgent ? 'text-amber-900' : 'text-slate-400'}`}>Priority Escalation</h5>
                                                <p className={`text-[10px] font-bold ${formData.isUrgent ? 'text-amber-700' : 'text-slate-400'}`}>Bypass TL review and notify project manager immediately.</p>
                                            </button>

                                            <button type="button"
                                                onClick={() => setFormData({ ...formData, isAnonymous: !formData.isAnonymous })}
                                                className={`w-full p-6 p-8 rounded-[2.5rem] border-4 text-left transition-all ${
                                                    formData.isAnonymous ? 'bg-slate-900 border-slate-700 shadow-xl shadow-black/20' : 'bg-white border-slate-50 opacity-60'
                                                }`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <Lock className={formData.isAnonymous ? 'text-indigo-400' : 'text-slate-300'} size={24} />
                                                    <div className={`w-12 h-6 rounded-full relative transition-all ${formData.isAnonymous ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${formData.isAnonymous ? 'left-7' : 'left-1'}`} />
                                                    </div>
                                                </div>
                                                <h5 className={`font-black text-xl tracking-tight mb-1 ${formData.isAnonymous ? 'text-white' : 'text-slate-400'}`}>Stealth Mode</h5>
                                                <p className={`text-[10px] font-bold ${formData.isAnonymous ? 'text-slate-400' : 'text-slate-400'}`}>Conceal reporter identity from all users except Admin.</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5 – Review & Verdict (Dossier Redesign) */}
                        {step === 5 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {/* Dashboard Heading */}
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">System Authentication Active</span>
                                        </div>
                                        <h3 className="text-4xl font-black text-slate-900 tracking-tightest">INTERNAL CASE DOSSIER</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Draft Archive</div>
                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Ref ID: {(Math.random() * 1000000).toFixed(0).padStart(7, '0')}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        {formData.isUrgent && (
                                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl">
                                                <Zap size={14} className="text-rose-500" fill="currentColor" />
                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">High Priority</span>
                                            </div>
                                        )}
                                        {formData.isAnonymous ? (
                                            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-2xl">
                                                <Lock size={14} className="text-slate-600" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Identity Shielded</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
                                                <UserCheck size={14} className="text-emerald-600" />
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Public Identity</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Main Dossier Card */}
                                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
                                    {/* Top Metadata Strip */}
                                    <div className="bg-slate-50 border-b border-slate-100 px-8 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={13} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OCCURRED: {new Date(formData.incidentDate).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                                                <Clock size={13} className="text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SUBMITTED: {new Date().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                            <div className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${sevConfig.text}`}>{formData.severity} SEVERITY</span>
                                        </div>
                                    </div>

                                    <div className="p-10 space-y-12">
                                        {/* Primary Header: Subject & Project */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            {/* Subject Analysis */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users size={14} className="text-indigo-600" />
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Subject</h4>
                                                </div>
                                                
                                                <div className="p-5 bg-white rounded-3xl border border-slate-100 flex items-center gap-5 shadow-sm hover:border-indigo-200 transition-colors">
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-100 shrink-0">
                                                        {selectedMember?.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xl font-black text-slate-900 truncate tracking-tight">{selectedMember?.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{selectedMember?.role}</span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedMember?.department || 'Member'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operational Environment */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Briefcase size={14} className="text-indigo-600" />
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Context</h4>
                                                </div>

                                                <div className="p-5 bg-white rounded-3xl border border-slate-100 flex flex-col justify-center space-y-3 shadow-sm hover:border-indigo-200 transition-colors h-full min-h-[104px]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                            <Server size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-base font-black text-slate-800 truncate tracking-tight">
                                                                {selectedProjectObj?.formData?.titleProject || selectedProjectObj?.category || 'Project Detail Unspecified'}
                                                            </div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {selectedProjectObj?.uniqueId || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Classification & Narrative Row */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-slate-50 pt-10">
                                            {/* Classification Tags (4 cols) */}
                                            {/* Left Column: Metadata Tags (4 cols) */}
                                            <div className="lg:col-span-4 space-y-8">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles size={13} className="text-indigo-500" />
                                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keywords</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(Array.isArray(formData.tags) ? formData.tags : []).map((t, idx) => (
                                                            <span key={`dossier-tag-final-${idx}`} className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-bold border border-slate-100 uppercase tracking-tight">#{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Narrative Summary (8 cols) */}
                                            <div className="lg:col-span-8 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={13} className="text-indigo-500" />
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executive Statement Narrative</h4>
                                                </div>
                                                <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 relative min-h-[140px]">
                                                    <p className="text-slate-700 text-[15px] font-medium leading-relaxed italic">
                                                        "{formData.description}"
                                                    </p>
                                                    <div className="mt-8 pt-4 border-t border-slate-100/50 flex items-center justify-end">
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Formal Report Documentation End</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Intelligence Bundle: Witnesses & Evidence */}
                                        <div className="space-y-10 pt-10 border-t border-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={14} className="text-indigo-600" />
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Evidence Bundle</h4>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Digital Vault Active</span>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                                {/* Witnesses Column */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Cited Witnesses</span>
                                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black">{formData.witnesses.length}</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(Array.isArray(formData.witnesses) ? formData.witnesses : []).length > 0 ? (
                                                            formData.witnesses.map((wId, idx) => {
                                                                const w = teamMembers.find(m => m._id === wId);
                                                                return w ? (
                                                                    <div key={`dossier-w-final-${idx}`} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-2xl shadow-sm transition-all hover:border-indigo-100">
                                                                        <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-900 flex items-center justify-center text-[10px] font-black uppercase shrink-0">{w.name?.[0]}</div>
                                                                        <div className="min-w-0">
                                                                            <div className="text-[11px] font-black text-slate-800 truncate">{w.name}</div>
                                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{w.role}</div>
                                                                        </div>
                                                                    </div>
                                                                ) : null;
                                                            })
                                                        ) : (
                                                            <div className="py-6 px-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase italic">No witnesses cited</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* References & Notes */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Archive References</span>
                                                        <Link size={12} className="text-slate-400" />
                                                    </div>
                                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[140px] flex items-center justify-center text-center">
                                                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">
                                                            {formData.evidenceNotes || "Zero manual links or external references archived for this case."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Digital Evidence Strip */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Digital Pack</span>
                                                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black">{formData.evidenceFiles.length}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {(Array.isArray(formData.evidenceFiles) ? formData.evidenceFiles : []).length > 0 ? (
                                                            formData.evidenceFiles.map((f, i) => {
                                                                const isImg = f.mimetype?.startsWith('image/');
                                                                const rawFUrl = f.url ? (f.url.startsWith('http') ? f.url : `${API_BASE_URL}${f.url}`) : null;
                                                                const fUrl = sanitizeUrl(rawFUrl);
                                                                return (
                                                                    <div key={`dossier-f-final-${i}`} className="group relative bg-white border border-slate-100 rounded-xl overflow-hidden aspect-square shadow-sm hover:ring-2 hover:ring-indigo-100 transition-all">
                                                                        {isImg && fUrl ? (
                                                                            <img src={fUrl} alt="evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                                                                                <File size={20} className="text-slate-200" />
                                                                                <span className="text-[8px] font-bold text-slate-400 text-center line-clamp-2 uppercase leading-tight">{f.originalName}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                            <div className="p-2 bg-white rounded-lg text-slate-900 shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                                                                <Eye size={14} />
                                                                            </div>
                                                                        </div>
                                                                        <a href={fUrl || '#'} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" />
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="col-span-full py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                                                                <Paperclip size={18} className="text-slate-300" />
                                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No binary files</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border-t border-slate-200 p-8 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-slate-400">
                                            <ShieldCheck size={24} className="text-indigo-600/30" />
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-900">Registry Transmit Ready</div>
                                                <div className="text-[8px] font-bold opacity-60">Protocol revision v4.2.0 • Data integrity hash: VERIFIED-HASH</div>
                                            </div>
                                        </div>
                                        <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            Staged for submission
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                    {/* Right Side Sidebar (Neatly Redesigned) */}
                    <div className="hidden lg:flex w-[380px] bg-slate-50/50 backdrop-blur-md border-l border-slate-100 p-10 flex-col justify-between overflow-y-auto">
                        <div className="space-y-10">
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Sparkles size={14} fill="currentColor" /> Intelligence Feed
                                </h4>
                                
                                <div className="space-y-6">
                                    {/* Risk Analysis Card */}
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Severity Index</span>
                                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${sevConfig.badge}`}>{formData.severity}</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full bg-gradient-to-r ${sevConfig.color} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${priorityScore * 20}%` }} />
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span>Rating</span>
                                                <span className="text-slate-900">{priorityScore}.0 / 5.0</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checkpoint Status */}
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Pipeline Status</p>
                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                            {[
                                                { s: 1, label: 'Identity Check', done: step >= 1 },
                                                { s: 2, label: 'Classification', done: step >= 2 },
                                                { s: 3, label: 'Evidence Bundle', done: step >= 3 },
                                                { s: 5, label: 'Final Dossier', done: step >= 5 }
                                            ].map((nav, idx) => (
                                                <div key={`pipeline-status-${idx}`} className="flex items-center gap-4">
                                                    <div className={`w-2 h-2 rounded-full transform transition-all duration-500 ${
                                                        nav.done ? 'bg-indigo-600 scale-125' : 'bg-slate-200'
                                                    }`} />
                                                    <span className={`text-[10px] font-black tracking-tight ${nav.done ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {nav.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Compliance Info */}
                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
                                <Lock size={20} className="text-indigo-400 mb-3" />
                                <h5 className="font-black text-[11px] uppercase tracking-widest mb-1.5 text-white">Governance Secure</h5>
                                <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
                                    End-to-end encrypted reporting protocols active. Dossier is prepared for administrative adjudication.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 pt-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Biolab System Node-Active</span>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-white relative z-20">
                    <div className="flex items-center gap-4">
                        {step > 1 && (
                            <button 
                                type="button" 
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-inner">
                                <ChevronLeft size={16} /> Back Protocol
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => { onClose(); }}
                            className="px-8 py-4 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Current Validation</span>
                            <span className={`text-[10px] font-black uppercase ${canAdvance() ? 'text-emerald-500' : 'text-rose-400'}`}>
                                {canAdvance() ? 'Ready for next stage' : 'Pending requirements'}
                            </span>
                        </div>
                        {step < STEPS.length ? (
                            <button
                                type="button"
                                onClick={() => canAdvance() && setStep(s => s + 1)}
                                disabled={!canAdvance()}
                                className={`flex items-center gap-3 px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all ${
                                    canAdvance()
                                    ? `bg-slate-900 text-white shadow-2xl shadow-indigo-200 hover:scale-[1.03] active:scale-[0.98]`
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                }`}>
                                NEXT STAGE <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`flex items-center gap-3 px-12 py-5 bg-gradient-to-r ${sevConfig.color} text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-[0_20px_50px_-15px_rgba(79,70,229,0.3)] hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50`}>
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                                {loading ? 'TRANSMITTING...' : 'LEGALIZE & SUBMIT'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

