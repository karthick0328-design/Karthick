'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Beaker, Calendar, CheckCircle2, Clock, FileText, PlayCircle,
    Search, Activity, Microscope, Briefcase, AlertCircle,
    ArrowRight, X, Send, TrendingUp, Sparkles, Star, Paperclip
} from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ProjectFormData {
    titleProject?: string;
    targetProtein?: string;
    assayType?: string;
    screeningMethod?: string;
    expectedOutcome?: string;
    timeline?: string;
    services?: string[];
    [key: string]: any;
}

interface ActivityItem {
    description: string;
    timestamp: string;
    updatedBy: { _id: string; name: string; role: string };
    statusChange?: string;
    remarks?: string;
}

interface Project {
    _id: string;
    uniqueId: string;
    userId: { _id: string; name: string; email: string; uniqueId: string };
    department: string;
    status: string;
    workflowStep: number;
    formData: ProjectFormData;
    assignedTo?: { _id: string; name: string; email: string }[];
    teamLeadId?: string;
    createdAt: string;
    updatedAt: string;
    activities?: ActivityItem[];
}

// --- Premium Modal ------------------------------------------------------------
const PremiumModal = ({
    isOpen, onClose, title, subtitle, icon: Icon, accentColor, children
}: {
    isOpen: boolean; onClose: () => void; title: string; subtitle?: string;
    icon?: any; accentColor?: string; children: React.ReactNode;
}) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(8,8,20,0.7)', backdropFilter: 'blur(8px)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className={`relative px-6 py-5 bg-gradient-to-r ${accentColor || 'from-indigo-600 to-purple-600'}`}>
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                {Icon && <div className="p-2 bg-white/20 rounded-xl"><Icon size={22} className="text-white" /></div>}
                                <div>
                                    <h2 className="text-lg font-bold text-white">{title}</h2>
                                    {subtitle && <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
                                <X size={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                    <div className="p-6">{children}</div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// --- Completion Modal ---------------------------------------------------------
const CompletionModal = ({ isOpen, onClose, onConfirm, projectTitle }: {
    isOpen: boolean; onClose: () => void; onConfirm: (notes: string) => void; projectTitle: string;
}) => {
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (notes.trim().length < 10) { setError('Notes must be at least 10 characters.'); return; }
        onConfirm(notes.trim()); setNotes(''); setError('');
    };
    return (
        <PremiumModal isOpen={isOpen} onClose={onClose} title="Mark as Complete" subtitle={projectTitle}
            icon={CheckCircle2} accentColor="from-emerald-500 to-teal-600">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Completion Notes <span className="text-red-400">*</span></label>
                    <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(''); }}
                        placeholder="Describe key outcomes, milestones achieved, and any final observations... (min 10 chars)"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl resize-none h-32 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" required />
                    {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-700 font-semibold text-sm transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Confirm Complete
                    </button>
                </div>
            </form>
        </PremiumModal>
    );
};

// --- Update Task Modal --------------------------------------------------------
const UpdateTaskModal = ({ isOpen, onClose, onSubmit, projectTitle }: {
    isOpen: boolean; onClose: () => void; onSubmit: (notes: string, files: File[]) => void; projectTitle: string;
}) => {
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (notes.trim().length < 10) { setError('Progress notes must be at least 10 characters'); return; }
        onSubmit(notes.trim(), files); setNotes(''); setFiles([]); setError(''); onClose();
    };
    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(Array.from(e.target.files).slice(0, 5));
    };
    return (
        <PremiumModal isOpen={isOpen} onClose={onClose} title="Update Progress" subtitle={projectTitle}
            icon={Send} accentColor="from-blue-500 to-indigo-600">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Progress Update <span className="text-red-400">*</span></label>
                    <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setError(''); }}
                        placeholder="Describe what you've completed, current status, or any blockers encountered... (min 10 chars)"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl resize-none h-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required />
                    {error && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Paperclip size={14} className="text-gray-400" /> Attach Files <span className="text-gray-400 font-normal text-xs">(optional, max 5)</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                        <Paperclip size={20} className="text-gray-300 group-hover:text-blue-400 mb-1 transition-colors" />
                        <span className="text-xs text-gray-400 group-hover:text-blue-500 font-medium transition-colors">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to browse files'}</span>
                        <input type="file" multiple accept="*" onChange={handleFiles} className="hidden" />
                    </label>
                    {files.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={12} className="text-blue-400 flex-shrink-0" />
                                        <span className="text-xs font-medium text-gray-700 truncate">{f.name}</span>
                                    </div>
                                    <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-700 font-semibold text-sm transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                        <Send size={16} /> Submit Update
                    </button>
                </div>
            </form>
        </PremiumModal>
    );
};

// --- Status Badge -------------------------------------------------------------
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'in progress': 'bg-blue-100 text-blue-700 border-blue-200',
        'under review': 'bg-amber-100 text-amber-700 border-amber-200',
        'assigned': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    const s = styles[status.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {status}
        </span>
    );
};

// --- Stat Card ----------------------------------------------------------------
const StatCard = ({ title, value, icon: Icon, gradient, delay }: {
    title: string; value: number; icon: any; gradient: string; delay: number;
}) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
        className="relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden group">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${gradient}`} />
        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-3`}>
            <Icon size={20} className="text-white" />
        </div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">{title}</p>
    </motion.div>
);

// --- Main Component -----------------------------------------------------------
export default function SeniorBiochemistryDashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const router = useRouter();

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projects/employee/assigned-projects');
            if (response.data.success) setProjects(response.data.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = async (projectId: string) => {
        try {
            setActionLoading(projectId);
            await api.post(`/projects/employee/assigned-projects/${projectId}/start-task`, {});
            fetchProjects();
        } catch (error: any) {
            console.error('Error starting task:', error);
            alert(error.response?.data?.message || 'Failed to start task');
        } finally { setActionLoading(null); }
    };

    const handleCompleteTask = (project: Project) => { setSelectedProject(project); setShowCompletionModal(true); };
    const confirmCompleteTask = async (notes: string) => {
        if (!selectedProject) return;
        try {
            setActionLoading(selectedProject._id);
            setShowCompletionModal(false);
            await api.post(`/projects/employee/assigned-projects/${selectedProject._id}/complete`, { completionNotes: notes });
            fetchProjects();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to complete task');
            setShowCompletionModal(true);
        } finally { setActionLoading(null); }
    };

    const handleUpdateTask = (project: Project) => { setSelectedProject(project); setShowUpdateModal(true); };
    const confirmUpdateTask = async (notes: string, files: File[]) => {
        if (!selectedProject) return;
        try {
            setActionLoading(selectedProject._id);
            setShowUpdateModal(false);
            const formData = new FormData();
            formData.append('progressNotes', notes);
            files.forEach(f => formData.append('attachments', f));
            await api.post(`/projects/employee/assigned-projects/${selectedProject._id}/update-progress`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchProjects();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to update task');
            setShowUpdateModal(true);
        } finally { setActionLoading(null); }
    };

    const filteredProjects = projects.filter(p =>
        p.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.formData?.titleProject?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: projects.length,
        inProgress: projects.filter(p => p.status === 'In Progress').length,
        completed: projects.filter(p => p.status === 'Completed').length,
        pending: projects.filter(p => ['Assigned', 'Draft', 'Submitted', 'Under Review'].includes(p.status)).length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 font-sans">
            {/* -- Hero Header -- */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative max-w-7xl mx-auto px-6 py-10">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                                    <Microscope size={28} className="text-cyan-300" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-cyan-300 text-xs font-bold uppercase tracking-widest">Employee Portal</span>
                                        <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white/70 font-semibold flex items-center gap-1">
                                            <Star size={10} className="fill-amber-400 text-amber-400" /> Senior
                                        </span>
                                    </div>
                                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Biochemistry Dashboard</h1>
                                </div>
                            </div>
                            <p className="text-blue-200/80 text-sm font-medium">Manage your assigned research projects and track scientific progress.</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Projects Today</p>
                                <p className="text-white text-2xl font-extrabold">{stats.total}</p>
                            </div>
                            <div className="h-10 w-px bg-white/10 hidden md:block" />
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                                <TrendingUp size={22} className="text-cyan-300" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* -- Stat Cards -- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Assigned" value={stats.total} icon={Briefcase} gradient="from-slate-500 to-slate-700" delay={0.05} />
                    <StatCard title="In Progress" value={stats.inProgress} icon={Activity} gradient="from-blue-500 to-indigo-600" delay={0.1} />
                    <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} gradient="from-emerald-500 to-teal-600" delay={0.15} />
                    <StatCard title="Pending / Assigned" value={stats.pending} icon={Clock} gradient="from-amber-500 to-orange-500" delay={0.2} />
                </div>

                {/* -- Search Bar -- */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="relative max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search by Project ID or title..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </motion.div>

                {/* -- Project Grid -- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {loading ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4">
                                <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                                <p className="text-gray-500 font-medium">Loading your projects...</p>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                    <Beaker size={36} className="text-indigo-300" />
                                </div>
                                <p className="text-gray-800 font-bold text-lg">No projects found</p>
                                <p className="text-gray-400 text-sm mt-1">Check back later for new assignments from your team lead.</p>
                            </div>
                        ) : (
                            filteredProjects.map((project, index) => (
                                <motion.div key={project._id}
                                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.06 }}
                                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group"
                                >
                                    {/* Card top accent */}
                                    <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-500" />

                                    <div className="p-6">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">
                                                    <Beaker size={18} className="text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-indigo-700 transition-colors">
                                                        {project.formData?.titleProject || 'Untitled Compound'}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{project.uniqueId}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={project.status} />
                                        </div>

                                        {/* Client */}
                                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl mb-4 border border-gray-100">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                                                {project.userId?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Client</p>
                                                <p className="text-sm font-bold text-gray-800">{project.userId?.name || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        {/* Details grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {[
                                                { label: 'Target Protein', value: project.formData?.targetProtein },
                                                { label: 'Assay Type', value: project.formData?.assayType },
                                                { label: 'Screening Method', value: project.formData?.screeningMethod },
                                                {
                                                    label: 'Timeline', value: project.formData?.timeline
                                                        ? new Date(project.formData.timeline).toLocaleDateString() : 'TBD',
                                                    icon: Calendar
                                                },
                                            ].map(({ label, value, icon: Icon }) => (
                                                <div key={label} className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
                                                    <div className="flex items-center gap-1">
                                                        {Icon && <Icon size={12} className="text-indigo-400 flex-shrink-0" />}
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{value || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Services */}
                                        {project.formData?.services && project.formData.services.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {project.formData.services.slice(0, 3).map((s: string, i: number) => (
                                                    <span key={i} className="text-[10px] font-bold uppercase px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                                                        {s}
                                                    </span>
                                                ))}
                                                {project.formData.services.length > 3 && (
                                                    <span className="text-[10px] font-bold text-gray-500 px-2 py-1">+{project.formData.services.length - 3} more</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Recent Activity */}
                                        {project.activities && project.activities.length > 0 && (
                                            <div className="mb-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-4 border border-blue-100/50">
                                                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-indigo-400" /> Recent Activity
                                                </h4>
                                                <div className="space-y-2 max-h-28 overflow-y-auto">
                                                    {project.activities
                                                        .filter(a => a.updatedBy?.role === 'employee' || a.statusChange)
                                                        .slice(0, 3)
                                                        .map((act, i) => (
                                                            <div key={i} className="flex gap-2.5 text-xs">
                                                                <div className="w-1 flex-shrink-0 bg-indigo-300 rounded-full mt-1" />
                                                                <div>
                                                                    <p className="text-gray-700 font-medium leading-snug">{act.description}</p>
                                                                    <p className="text-gray-400 text-[10px] mt-0.5">
                                                                        {new Date(act.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} · {act.updatedBy?.name || 'System'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                            {['Assigned', 'Under Review'].includes(project.status) && (
                                                <button onClick={() => handleStartTask(project._id)}
                                                    disabled={actionLoading === project._id}
                                                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50">
                                                    {actionLoading === project._id ? <Activity size={15} className="animate-spin" /> : <PlayCircle size={15} />}
                                                    Start Task
                                                </button>
                                            )}
                                            {project.status === 'In Progress' && (
                                                <>
                                                    <button onClick={() => handleUpdateTask(project)}
                                                        disabled={actionLoading === project._id}
                                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50">
                                                        {actionLoading === project._id ? <Activity size={15} className="animate-spin" /> : <FileText size={15} />}
                                                        Update
                                                    </button>
                                                    <button onClick={() => handleCompleteTask(project)}
                                                        disabled={actionLoading === project._id}
                                                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
                                                        {actionLoading === project._id ? <Activity size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                                        Complete
                                                    </button>
                                                </>
                                            )}
                                            {project.status === 'Completed' && (
                                                <div className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <CheckCircle2 size={15} /> Completed
                                                </div>
                                            )}
                                            <Link href={`/employee-dashboard/projects/${project._id}`}
                                                className="p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl text-gray-400 hover:text-indigo-500 transition-all">
                                                <ArrowRight size={18} />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* -- Modals -- */}
            <CompletionModal isOpen={showCompletionModal} onClose={() => { setShowCompletionModal(false); setSelectedProject(null); }}
                onConfirm={confirmCompleteTask} projectTitle={selectedProject?.formData?.titleProject || selectedProject?.uniqueId || 'Project'} />
            <UpdateTaskModal isOpen={showUpdateModal} onClose={() => { setShowUpdateModal(false); setSelectedProject(null); }}
                onSubmit={confirmUpdateTask} projectTitle={selectedProject?.formData?.titleProject || selectedProject?.uniqueId || 'Project'} />
        </div>
    );
}
