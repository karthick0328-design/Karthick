'use client';

import React from 'react';
import {
    Clock,
    PlayCircle,
    CheckCircle,
    ClipboardList,
    Search,
    Download,
    Calendar,
    ChevronRight,
    Users,
    CodeXml,
    UserPlus,
    MessageCircle,
    TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TLDashboardViewProps {
    department: string;
    projects: any[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    activeTab: string;
    setActiveTab: (val: any) => void;
    stats: {
        total: number;
        underReview: number;
        inProgress: number;
        completed: number;
    };
    onOpenModal: (mode: any, project: any) => void;
    onExportCSV: () => void;
    serviceIcon: React.ReactNode;
    projectRoute: string; // e.g., 'software-development'
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Under Review': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const getDeadlineStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    if (diffDays <= 2) return { label: 'Critical', color: 'text-orange-600 bg-orange-50 border-orange-100' };
    if (diffDays <= 5) return { label: 'Approaching', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: 'On Track', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
};

export default function TLDashboardView({
    department,
    projects,
    loading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    stats,
    onOpenModal,
    onExportCSV,
    serviceIcon,
    projectRoute
}: TLDashboardViewProps) {
    const router = useRouter();

    if (loading && projects.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100 rotate-3 hover:rotate-0 transition-transform duration-500">
                            {serviceIcon}
                        </div>
                        {department} <span className="text-indigo-600">Lead Matrix</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Coordinate engineering workflows and development sprints</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'To Review', value: stats.underReview, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100', secondaryBg: 'bg-purple-50' },
                    { label: 'Active Sprints', value: stats.inProgress, icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', secondaryBg: 'bg-blue-50' },
                    { label: 'Deployment Ready', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', secondaryBg: 'bg-emerald-50' },
                    { label: 'Total Managed', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-100', secondaryBg: 'bg-indigo-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500 hover:-translate-y-1">
                        <div className={`absolute right-0 top-0 w-24 h-24 ${stat.secondaryBg} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-700`}></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-3 ${stat.bg} rounded-xl ${stat.color} shadow-inner transition-transform group-hover:rotate-6`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/30">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 w-full md:w-auto">
                        {[
                            { id: 'all', label: 'All Projects' },
                            { id: 'pending', label: 'To Review' },
                            { id: 'active', label: 'In Progress' },
                            { id: 'completed', label: 'Completed' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300 uppercase tracking-wider flex-1 md:flex-none ${activeTab === tab.id
                                    ? 'bg-white shadow-md text-indigo-600'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search entities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all text-sm font-medium"
                            />
                        </div>
                        <button
                            onClick={onExportCSV}
                            className="p-3.5 bg-white text-slate-600 border border-slate-200 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                            title="Export Manifest"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {projects.length === 0 ? (
                        <div className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                                    <Search className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">No entities detected</h3>
                                <p className="text-sm text-slate-400 mt-2 font-medium">Try adjusting your filters or search term</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Identification</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Entity</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phase</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Matrix Status</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Engineering</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projects.map((project, idx) => {
                                    const deadline = getDeadlineStatus(project.paymentDetails?.dueDate);
                                    return (
                                        <tr
                                            key={project._id}
                                            className="hover:bg-slate-50/50 transition-all duration-300 cursor-pointer group"
                                            onClick={() => router.push(`/tl-dashboard/service/${projectRoute}/project/${project._id}`)}
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                                                        <CodeXml className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm tracking-tight">{project.uniqueId}</p>
                                                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[180px] mt-0.5">
                                                            {project.formData?.titleProject || project.category || 'Standard Task'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                                                        {project.userId.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">{project.userId.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{project.userId.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(project.status)} shadow-sm`}>
                                                    {project.status.replace('-', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>{new Date(project.submittedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {project.status !== 'Completed' && deadline && (
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider w-fit ${deadline.color} shadow-sm`}>
                                                            <Clock className="w-3 h-3" />
                                                            <span>{deadline.label}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {project.teamMembers && project.teamMembers.length > 0 ? (
                                                    <div className="flex -space-x-3 group/avatars">
                                                        {project.teamMembers.slice(0, 3).map((member: any, i: number) => (
                                                            <div key={i} className="inline-block h-9 w-9 rounded-xl ring-2 ring-white bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm transition-transform duration-300 group-hover/avatars:-translate-x-1" title={member.name}>
                                                                {member.name.charAt(0)}
                                                            </div>
                                                        ))}
                                                        {project.teamMembers.length > 3 && (
                                                            <div className="inline-block h-9 w-9 rounded-xl ring-2 ring-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                                                                +{project.teamMembers.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 text-slate-300">
                                                        <Users className="w-4 h-4 opacity-50" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Vacant</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {project.status === 'Under Review' && (
                                                        <button
                                                            onClick={() => onOpenModal('start', project)}
                                                            className="p-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                                            title="Start Task"
                                                        >
                                                            <PlayCircle className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {project.status === 'In Progress' && (
                                                        <button
                                                            onClick={() => onOpenModal('complete', project)}
                                                            className="p-2.5 bg-white border border-slate-200 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                                                            title="Complete Project"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {(project.status === 'Under Review' || project.status === 'In Progress') && (!project.teamMembers || project.teamMembers.length === 0) && (
                                                        <button
                                                            onClick={() => onOpenModal('assign-team', project)}
                                                            className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                                            title="Assign Team"
                                                        >
                                                            <UserPlus className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    {project.teamMembers && project.teamMembers.length > 0 && (
                                                        <button
                                                            onClick={() => router.push(`/chat?projectId=${project._id}`)}
                                                            className="p-2.5 bg-white border border-slate-200 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all shadow-sm"
                                                            title="Open Team Chat"
                                                        >
                                                            <MessageCircle className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => router.push(`/tl-dashboard/service/${projectRoute}/project/${project._id}`)}
                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
