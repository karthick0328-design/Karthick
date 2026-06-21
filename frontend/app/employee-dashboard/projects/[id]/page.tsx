'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    ArrowLeft,
    Calendar,
    FileText,
    Users,
    Activity,
    MessageSquare,
    AlertCircle,
    ShieldAlert,
    Send,
    Briefcase,
    Clock,
    CheckCircle2,
    DollarSign,
    ChevronRight,
    ClipboardList,
    Plus,
    ExternalLink,
    GitBranch,
    UserPlus,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
    _id: string;
    uniqueId: string;
    department: string;
    category: string;
    status: string;
    formData: any;
    remarks: string;
    submittedAt: string;
    createdAt: string;
    assignedTo: any[];
    teamLeadId?: any;
    teamMembers?: any[];
    activities: any[];
    paymentStatus: string;
    messages?: any[];
    attachments?: { path: string; filename: string; mimetype: string }[];
}

const ProjectDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('details');

    const fetchProject = async () => {
        if (!id) return;
        try {
            const response = await api.get(`/api/projects/${id}`);
            if (response.data.success) {
                setProject(response.data.data);
            } else {
                setError(response.data.message || 'Failed to load project');
            }
        } catch (err: any) {
            console.error('Error fetching project:', err);
            if (err.response?.status === 403) {
                setError('Access Denied');
            } else if (err.response?.status === 404) {
                setError(err.response?.data?.message || 'Project not found or route unavailable.');
            } else {
                setError(err.response?.data?.message || 'An error occurred while fetching the project.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchProject();
    }, [id]);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Loading details...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="bg-amber-50 p-4 rounded-full mb-4 text-amber-500">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                <p className="text-slate-500 mb-6">{error || 'Project not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const getStatusColors = (status: string) => {
        const styles = {
            Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
            Submitted: 'bg-amber-50 text-amber-700 border-amber-100',
            Draft: 'bg-slate-50 text-slate-700 border-slate-100',
        };
        return styles[status as keyof typeof styles] || 'bg-indigo-50 text-indigo-700 border-indigo-100';
    };

    const TabButton = ({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) => {
        const isActive = activeTab === value;
        return (
            <button
                onClick={() => setActiveTab(value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-semibold text-sm ${isActive
                    ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
            >
                <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {label}
            </button>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-2 text-sm font-medium group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Projects
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Overview</h1>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-mono font-bold border border-slate-200">
                            ID: {project.uniqueId}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm">
                        Export Report
                    </button>
                </div>
            </div>

            {/* Main Project Card */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between gap-10">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                                <Briefcase size={28} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                                    {project.formData?.compoundName || project.category}
                                </h2>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-slate-500 font-medium mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-400" />
                                        <span>Initiated on {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                    </div>
                                    {project.formData?.timeline && (
                                        <div className="flex items-center gap-1.5 text-rose-600">
                                            <Calendar size={14} />
                                            <span>Due on {new Date(project.formData.timeline).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                                <div className="flex">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColors(project.status)}`}>
                                        {project.status}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                                <p className="text-slate-900 font-semibold">{project.department}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                                <p className="text-slate-900 font-semibold">{project.category}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Health Index</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                    <p className="text-slate-900 font-bold">Stable</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 min-w-[280px] border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Financial Summary</span>
                            <DollarSign size={16} className="text-slate-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{project.paymentStatus || 'Pending'}</p>
                            <p className="text-xs font-medium text-slate-500 mt-1">Payment Reconciliation Status</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <div className="flex justify-between items-center text-xs font-bold\">
                                <span className="text-slate-500">Budget Utilization</span>
                                <span className="text-emerald-600">Under Budget</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 space-y-6">
                    {/* Minimalist Tabs */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/50">
                        <TabButton value="details" label="Specifications" icon={FileText} />
                        <TabButton value="activity" label="Activity" icon={Activity} />
                        <TabButton value="messages" label="Team Discussions" icon={MessageSquare} />
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'details' && (
                                <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        {project.formData && Object.entries(project.formData).map(([key, value]) => {
                                            if (key === 'services' || typeof value === 'object' || key === 'compoundName') return null;
                                            return (
                                                <div key={key} className="group pb-4 border-b border-slate-50">
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </p>
                                                    <p className="text-lg font-semibold text-slate-800 tracking-tight">{String(value)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {project.formData?.services && Array.isArray(project.formData.services) && (
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Included Services</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {project.formData.services.map((service: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 text-indigo-700 rounded-lg text-sm font-semibold border border-indigo-100">
                                                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                                                        {service}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Initial Project Attachments */}
                                    {project.attachments && project.attachments.length > 0 && (
                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <FileText size={12} className="text-indigo-400" />
                                                Initial Project Attachments
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {project.attachments.map((file, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${file.path.replace(/\\/g, '/')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                                                <FileText size={13} className="text-slate-400 group-hover:text-indigo-500" />
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">{file.filename}</span>
                                                        </div>
                                                        <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {project.remarks && (
                                        <div className="space-y-4 pt-6 border-t border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Remarks</h4>
                                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100/80">
                                                <p className="text-slate-600 leading-relaxed font-medium">
                                                    "{project.remarks}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm">
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                        <h3 className="text-lg font-bold text-slate-900">Project Activity Log</h3>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase border border-emerald-100">
                                            <Activity size={12} />
                                            Staff View Only
                                        </div>
                                    </div>

                                    {project.activities && project.activities.filter(a => a.updatedBy?.role === 'employee').length > 0 ? (
                                        <div className="relative space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                                            {project.activities
                                                .filter(activity => activity.updatedBy?.role === 'employee')
                                                .map((activity: any, idx: number) => (
                                                    <div key={idx} className="relative pl-10">
                                                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 shadow-sm z-10 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                                                                <h4 className="font-bold text-slate-900">
                                                                    {activity.action || activity.description}
                                                                </h4>
                                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                    {new Date(activity.timestamp).toLocaleString(undefined, {
                                                                        dateStyle: 'medium',
                                                                        timeStyle: 'short'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                                    {activity.updatedBy?.name?.charAt(0) || 'E'}
                                                                </div>
                                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                                    Updated by {activity.updatedBy?.name || 'Authorized Member'}
                                                                </p>
                                                            </div>
                                                            {activity.remarks && (
                                                                <p className="text-sm text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 italic leading-relaxed font-medium">
                                                                    "{activity.remarks}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                <Activity size={24} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-slate-900 font-bold">No Records Found</h4>
                                            <p className="text-slate-500 text-sm font-medium mt-1">No employee-led activity has been synchronized yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'messages' && (
                                <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center shadow-sm">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                                        <MessageSquare size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Project Communications</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium leading-relaxed">
                                        Coordinate with team members and leads. All messages are encrypted and archived for project record.
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        <button
                                            onClick={() => router.push(`/chat?projectId=${project._id}`)}
                                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                        >
                                            Join Discussion
                                        </button>
                                        <button
                                            onClick={() => router.push('/chat')}
                                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                                        >
                                            View Archive
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="xl:col-span-4 space-y-8">
                    {/* Operational Hierarchy Module */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Hierarchy</h3>
                            <GitBranch size={16} className="text-indigo-500" />
                        </div>

                        <div className="relative pl-6 space-y-8">
                            {/* Vertical Line */}
                            <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-100" />

                            {/* Manager */}
                            <div className="relative">
                                <div className="absolute -left-[20px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 z-10" />
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Service Manager</p>
                                    {project.assignedTo && project.assignedTo.length > 0 ? (
                                        project.assignedTo.map((member: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                                    {member.name?.charAt(0) || 'M'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 truncate">{member.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">Level 01</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 opacity-50">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                                                <User size={12} className="text-slate-300" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 italic">No Manager</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Lead */}
                            <div className="relative">
                                <div className="absolute -left-[20px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-purple-500 z-10" />
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Team Lead</p>
                                    {project.teamLeadId ? (
                                        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                            <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                                                {project.teamLeadId.name?.charAt(0) || 'L'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{project.teamLeadId.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">Level 02</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 opacity-50">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                                                <User size={12} className="text-slate-300" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 italic">No Lead</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="relative">
                                <div className="absolute -left-[20px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-500 z-10" />
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Personnel</p>
                                    {project.teamMembers && project.teamMembers.length > 0 ? (
                                        <div className="space-y-2">
                                            {project.teamMembers.map((member: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors rounded-xl group/m">
                                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xs uppercase border border-emerald-200 group-hover/m:rotate-6 transition-transform shrink-0">
                                                        {member.name?.charAt(0) || 'P'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate group-hover/m:text-emerald-700 transition-colors">{member.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{member.role || 'Member'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 opacity-50">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                                                <Users size={12} className="text-slate-300" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 italic">No Personnel</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Optional Action Button - Only for Lead/Manager if they access this view, but keeping the Plus logic if relevant */}
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">Hierarchy Verified System</p>
                        </div>
                    </div>

                    {/* Quick Stats / Health */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Project Integrity</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center text-xs font-bold mb-2">
                                    <span className="text-slate-400 uppercase">Synchronized Logs</span>
                                    <span className="text-indigo-400 text-[10px]">VERIFIED</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default ProjectDetailsPage;
