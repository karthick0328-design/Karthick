'use client';

import React from 'react';
import {
    DollarSign,
    FileText,
    CheckCircle,
    UserPlus,
    Clock,
    Search,
    Filter,
    ArrowRight,
    Beaker,
    ClipboardList,
    AlertCircle,
    X,
    Calendar,
    Download,
    Loader2,
    Activity,
    CheckSquare,
    Bell,
    ChevronRight,
    User,
    TrendingUp,
    LayoutDashboard
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ServiceDashboardViewProps {
    department: string;
    projects: any[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    activeTab: string;
    setActiveTab: (val: any) => void;
    stats: {
        total: number;
        pendingQuotes: number;
        awaitingApproval: number;
        readyToAssign: number;
    };
    onSendPaymentWarning: (e: React.MouseEvent, project: any) => void;
    backUrl?: string;
    serviceIcon: React.ReactNode;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Quote Sent': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Payment Form Created': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'Awaiting Approval':
        case 'Awaiting Balance Approval': return 'bg-orange-100 text-orange-700 border-orange-200';
        case '50% Paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Full Paid': return 'bg-green-100 text-green-700 border-green-200';
        case 'Official Receipt Issued': return 'bg-purple-100 text-purple-700 border-purple-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export default function ServiceDashboardView({
    department,
    projects,
    loading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    stats,
    onSendPaymentWarning,
    serviceIcon
}: ServiceDashboardViewProps) {
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
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                            {serviceIcon}
                        </div>
                        {department} <span className="text-indigo-600">Sales Portal</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Manage revenue pipeline and client onboarding</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Pipeline</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Pending Quotes', value: stats.pendingQuotes, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100', secondaryBg: 'bg-amber-50' },
                    { label: 'Awaiting Auth', value: stats.awaitingApproval, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', secondaryBg: 'bg-orange-50' },
                    { label: 'Ready to Assign', value: stats.readyToAssign, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', secondaryBg: 'bg-emerald-50' },
                    { label: 'Total Volume', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-100', secondaryBg: 'bg-indigo-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={`absolute right-0 top-0 w-24 h-24 ${stat.secondaryBg} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 ${stat.bg} rounded-lg ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className="font-semibold text-slate-600 text-sm">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                            {i === 3 && (
                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-600 font-medium">+12%</span> this month
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1 w-full md:w-auto">
                        {[
                            { id: 'all', label: 'All Projects' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'active', label: 'Active' },
                            { id: 'completed', label: 'Completed' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 md:flex-none ${activeTab === tab.id
                                    ? 'bg-white shadow-sm text-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64 group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {projects.length === 0 ? (
                        <div className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Search className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="font-medium">No projects found</p>
                                <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search term</p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Financials</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projects.map((project, idx) => (
                                    <tr
                                        key={project._id}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/manager-dashboard/department/sale/service/${department.toLowerCase().replace(/ /g, '-')}/project/${project._id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{project.uniqueId}</p>
                                                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                                                        {project.formData?.titleProject || 'New Request'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {project.userId?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700 leading-none">{project.userId?.name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{project.userId?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(project.paymentStatus)}`}>
                                                {project.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-slate-900">
                                                    ₹{(project.paymentDetails?.amount || project.quotedAmount || 0).toLocaleString()}
                                                </p>
                                                <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                                    Paid: ₹{(project.paymentDetails?.paidAmount || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-[11px]">
                                                <div className="flex items-center gap-1.5 text-slate-500 italic">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </div>
                                                {project.paymentDetails?.dueDate && (
                                                    <div className="flex items-center gap-1.5 text-orange-600 font-bold">
                                                        <Clock className="w-3 h-3" />
                                                        Due: {new Date(project.paymentDetails.dueDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {(project.paymentStatus === 'Pending' || project.paymentStatus === 'Quote Sent' || project.paymentStatus === 'Payment Form Created') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/manager-dashboard/department/sale/service/${department.toLowerCase().replace(/ /g, '-')}/project/${project._id}?action=quote`);
                                                        }}
                                                        className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                                        title={project.quotedAmount ? 'Update Quote' : 'Generate Quote'}
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {project.paymentStatus !== 'Full Paid' && project.paymentStatus !== 'Official Receipt Issued' && (
                                                    <button
                                                        onClick={(e) => onSendPaymentWarning(e, project)}
                                                        className="p-2 bg-white border border-slate-200 text-amber-600 rounded-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                                                        title="Send Reminder"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/manager-dashboard/department/sale/service/${department.toLowerCase().replace(/ /g, '-')}/project/${project._id}`);
                                                    }}
                                                    className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
