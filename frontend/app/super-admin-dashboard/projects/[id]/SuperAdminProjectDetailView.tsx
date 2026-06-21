'use client';

import React from 'react';
import {
    ArrowLeft,
    FolderOpen,
    FileText,
    CheckCircle,
    Receipt,
    UserPlus,
    Activity,
    Briefcase,
    Clock,
    Search,
    Layers,
    CreditCard,
    Mail,
    Plus,
    ExternalLink,
    User,
    GitBranch,
    Send,
    MessageSquare,
    Zap,
    AlertTriangle,
    Users,
    PlayIcon,
    ShoppingCart,
    Quote,
    DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface ProjectDetailViewProps {
    project: any;
    user: any;
    loading: boolean;
    chatMessages: any[];
    messageInput: string;
    setMessageInput: (val: string) => void;
    handleSendMessage: () => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    actions: {
        openQuoteModal: () => void;
        openPaymentFormModal: () => void;
        setShowApprovePaymentModal: (val: boolean) => void;
        handleGenerateReceipt: () => void;
        setShowReceiptModal: (val: boolean) => void;
        setShowEscalateHRModal: (val: boolean) => void;
        setShowAssignModal: (val: boolean) => void;
        setShowProfessionalFeeModal: (val: boolean) => void;
        handleUpdateProfessionalFee: (data: any) => void;
        loadServiceManagers: () => void;
        setShowUploadModal: (val: boolean) => void;
        setShowProgressModal?: (val: boolean) => void;
        setShowCompleteModal?: (val: boolean) => void;
        handleAssignManager?: (managerId: string) => void;
        fetchTLs?: () => void;
        setShowAssignTLModal?: (val: boolean) => void;
        handleAssignTL?: (teamLeadId: string) => void;
        fetchEmployees?: () => void;
        setShowAssignTeamModal?: (val: boolean) => void;
        handleAssignTeam?: () => void;
        selectedTeamMembers?: string[];
        setSelectedTeamMembers?: (val: string[] | ((prev: string[]) => string[])) => void;
        setShowTaskModal?: (val: boolean) => void;
        handleStartTask?: () => void;
        taskNotes?: string;
        setTaskNotes?: (val: string) => void;
        serviceManagers?: any[];
        tls?: any[];
        employees?: any[];
    };
    serviceIcon: React.ReactNode;
    subtitle: string;
    backUrl: string;
}

export default function ProjectDetailView({
    project,
    user,
    loading,
    chatMessages,
    messageInput,
    setMessageInput,
    handleSendMessage,
    messagesEndRef,
    actions,
    serviceIcon,
    subtitle,
    backUrl
}: ProjectDetailViewProps) {

    if (!project) return null;

    const professionalFee = Number(project.professionalFee?.amount || 0);
    const outstandingAmount = (Number(project.quotedAmount || 0) + professionalFee) - Number(project.paymentDetails?.paidAmount || 0);

    // --- PROCUREMENT DATA RESOLUTION ---
    const allProcurement = React.useMemo(() => {
        const list: any[] = [];
        if (project.financialReview?.requested) {
            list.push({
                _id: 'embedded-sm-req',
                _isEmbedded: true,
                source: project.financialReview.requestedBy?.name || 'System Lead',
                isSuperadmin: false,
                productName: project.financialReview.requestReason || 'Strategic Sourcing',
                amount: project.financialReview.requestedAmount || 0,
                status: project.financialReview.status,
                timestamp: project.financialReview.requestedAt || project.updatedAt,
                billUrl: null,
                remarks: project.financialReview.remarks
            });
        }
        if (project.linkedPurchaseOrders) {
            project.linkedPurchaseOrders.forEach((po: any) => {
                const isSuperadmin = po.formData?.isSuperadminPurchase || po.financialReview?.requestedBy?.role === 'superadmin' || po.financialReview?.requestedBy?.role === 'admin';
                list.push({
                    _id: po._id,
                    _isEmbedded: false,
                    source: isSuperadmin ? 'Superadmin Authority' : (po.financialReview?.requestedBy?.name || 'System Lead'),
                    isSuperadmin,
                    productName: po.purchaseDetails?.productName || po.category,
                    amount: po.purchaseDetails?.amountSent || po.financialReview?.requestedAmount || 0,
                    status: po.purchaseDetails?.status || po.status,
                    timestamp: po.updatedAt || po.createdAt,
                    billUrl: po.purchaseDetails?.billUrl
                });
            });
        }
        return list;
    }, [project.financialReview, project.linkedPurchaseOrders, project.updatedAt]);

    const renderProcurement = () => {
        if (allProcurement.length === 0) {
            return (
                <div className="py-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                    <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em]">No procurement activity detected</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {allProcurement.map((item, idx) => {
                    const status = (item.status || 'Pending').toUpperCase();
                    const isApproved = status.includes('APPROV') || status.includes('SETTLE') || status.includes('DELIVER') || status.includes('COMPLET');
                    return (
                        <div key={idx} className={`group/card relative p-8 rounded-3xl border transition-all duration-500 ${item.isSuperadmin ? 'bg-indigo-50/30 border-indigo-100 hover:bg-white hover:border-indigo-400' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-300'}`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform group-hover/card:scale-110 ${item.isSuperadmin ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.isSuperadmin ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
                                                {item.isSuperadmin ? 'Global Acquisition' : 'Dept Operational Requirement'}
                                            </span>
                                            {item._isEmbedded && (
                                                <span className="px-3 py-1 bg-cyan-50 text-cyan-600 text-[10px] font-black rounded-lg border border-cyan-100 uppercase tracking-widest">Embedded</span>
                                            )}
                                        </div>
                                        <h4 className="text-[18px] font-black text-slate-900 tracking-tight mb-1">{item.productName}</h4>
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                            <User size={12} className="text-slate-300" />
                                            Initiator: <span className="text-indigo-600 ml-1">{item.source}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Financial Commitment</p>
                                        <p className={`text-2xl font-black ${isApproved ? 'text-emerald-600' : 'text-slate-900'}`}>₹{Number(item.amount).toLocaleString()}</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                        {status}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const allActivities = React.useMemo(() => {
        let combined = [...(project.activities || [])].map(a => ({ ...a, timestamp: a.timestamp || a.createdAt }));

        // --- BRIDGE: Merge Parent Activities ---
        if (project.parentProjectContext && Array.isArray(project.parentProjectContext.activities)) {
            project.parentProjectContext.activities.forEach((a: any) => {
                combined.push({
                    ...a,
                    timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
                    description: `[Core Project] ${a.description || 'System Update'}`,
                    updatedBy: a.updatedBy || { name: 'Core Subsystem', role: 'Admin' }
                });
            });
        }

        // --- BRIDGE: Merge Linked Purchase Activities ---
        if (project.linkedPurchaseOrders && Array.isArray(project.linkedPurchaseOrders)) {
            project.linkedPurchaseOrders.forEach((po: any) => {
                if (po.activities && Array.isArray(po.activities)) {
                    po.activities.forEach((a: any) => {
                        const isSA = po.formData?.isSuperadminPurchase || po.financialReview?.requestedBy?.role === 'superadmin' || po.financialReview?.requestedBy?.role === 'admin';
                        combined.push({
                            ...a,
                            timestamp: a.timestamp || a.createdAt || po.createdAt,
                            description: `[${isSA ? 'Superadmin Direct' : 'Operational Purchase'}] ${a.description}`,
                            updatedBy: a.updatedBy || { name: 'Acquisition Node', role: 'Superadmin' }
                        });
                    });
                }
            });
        }

        allProcurement.forEach((item) => {
            combined.push({
                description: `[${item.isSuperadmin ? 'Superadmin' : 'Operational Request'}] Procurement Fulfillment: ${item.productName}`,
                remarks: `Identified source: ${item.source}. Tracking status: ${item.status}`,
                timestamp: item.timestamp,
                attachments: item.billUrl ? [{ filename: 'Purchase bill', path: item.billUrl }] : [],
                updatedBy: { name: item.source, role: 'Superadmin' }
            });
        });

        if (project.financialReview?.requested) {
            combined.push({
                description: `Operational Budget Sync: ${project.financialReview.requestReason || 'Strategic Resource'}`,
                remarks: `Budgeted Allocation: ₹${(project.financialReview.requestedAmount || 0).toLocaleString()}. Approved: ₹${(project.financialReview.approvedAmount || 0).toLocaleString()}`,
                timestamp: project.updatedAt,
                updatedBy: { name: 'Portfolio Administrator', role: 'System' }
            });
        }

        return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [project.activities, project.parentProjectContext, project.linkedPurchaseOrders, allProcurement, project.financialReview, project.updatedAt]);

    const isEmployeeActivity = (a: any) => {
        const role = a.updatedBy?.role?.toLowerCase();
        const description = a.description || '';
        return role === 'employee' || role === 'specialist worker' || description.includes('[Employee Update]');
    };

    const employeeUpdates = allActivities.filter(a => isEmployeeActivity(a));
    const remainingActivities = allActivities.filter(a => !isEmployeeActivity(a));

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
                {activity.attachments && activity.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {activity.attachments.map((file: any, fIdx: number) => {
                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                            const fullUrl = `${baseUrl}/${file.path || ''}`.replace(/\\/g, '/');
                            return (
                                <a key={fIdx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
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
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="max-w-full mx-auto space-y-8 animate-in fade-in duration-500">

                {/* --- NAVIGATION & HEADER --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60">
                    <div className="flex items-center gap-5">
                        <Link href={backUrl} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                                    {project.category || 'Initiative'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                                    {project.department || 'General'}
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                {project.formData?.projectTitle || project.uniqueId}
                                {project.formData?.projectTitle && <span className="text-slate-300 font-medium pb-1">/ {project.uniqueId}</span>}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-white p-2 rounded-2xl border border-gray-200/60 shadow-sm gap-1">
                            {(project.paymentStatus === 'Pending' || project.paymentStatus === 'Quote Sent' || project.paymentStatus === 'Payment Form Created') && (
                                <button onClick={actions.openQuoteModal} className="px-5 py-2.5 text-indigo-600 text-[13px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={15} /> {project.quotedAmount ? 'Update Quote' : 'Set Quote'}
                                </button>
                            )}
                            {project.quotedAmount && ['Quote Sent', 'Payment Form Created', 'Pending'].includes(project.paymentStatus) && (
                                <button onClick={actions.openPaymentFormModal} className="px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    <FileText size={15} /> Create Bill
                                </button>
                            )}
                        </div>
                        {['Awaiting Approval', 'Awaiting Balance Approval', 'User Submitted Payment'].includes(project.paymentStatus) && (
                            <button onClick={() => actions.setShowApprovePaymentModal(true)} className="px-6 py-3 bg-emerald-600 text-white text-[13px] font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-200">
                                <CheckCircle size={15} /> Approve Fund
                            </button>
                        )}
                        {['Payment Form Created', '50% Paid', 'Full Paid', 'Official Receipt Issued'].includes(project.paymentStatus) && (
                            <button onClick={() => actions.setShowReceiptModal(true)} className="px-5 py-3 bg-violet-600 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-200">
                                <Receipt size={15} /> {project.receipt?.data ? 'Revise Bill' : 'Generate Bill'}
                            </button>
                        )}
                        <button onClick={() => actions.setShowProfessionalFeeModal(true)} className={`px-5 py-3 rounded-xl border text-[13px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${project.professionalFee?.amount ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}>
                            <Briefcase size={15} /> {project.professionalFee?.amount ? 'Expert Fee' : 'Add Fee'}
                        </button>
                        {['Official Receipt Issued', 'Full Paid', 'Pending'].includes(project.paymentStatus || '') && !project.assignedTo?.length && (
                            <button onClick={() => { actions.loadServiceManagers(); actions.setShowAssignModal(true); }} className="px-5 py-3 bg-slate-900 text-white text-[13px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest flex items-center gap-2">
                                <UserPlus size={15} /> Assign SM
                            </button>
                        )}
                        {project.workflowStep >= 2 && !project.teamLeadId && actions.setShowAssignTLModal && (
                            <button onClick={() => { actions.fetchTLs?.(); actions.setShowAssignTLModal?.(true); }} className="px-5 py-3 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100">
                                <UserPlus size={15} /> Assign TL
                            </button>
                        )}
                        {project.workflowStep >= 3 && (!project.teamMembers || project.teamMembers.length === 0) && actions.setShowAssignTeamModal && (
                            <button onClick={() => { actions.fetchEmployees?.(); actions.setShowAssignTeamModal?.(true); }} className="px-5 py-3 bg-violet-600 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-100">
                                <Users size={15} /> Assign Team
                            </button>
                        )}
                        {project.status === 'Under Review' && project.workflowStep >= 4 && actions.setShowTaskModal && (
                            <button onClick={() => actions.setShowTaskModal?.(true)} className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[13px] font-black rounded-xl hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100">
                                <PlayIcon size={18} fill="currentColor" /> Start Task
                            </button>
                        )}
                        {actions.setShowProgressModal && (
                            <button onClick={() => actions.setShowProgressModal?.(true)} className="px-5 py-3 bg-emerald-600 text-white text-[13px] font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-200">
                                <Activity size={15} /> Update Progress
                            </button>
                        )}
                        {actions.setShowCompleteModal && (
                            <button onClick={() => actions.setShowCompleteModal?.(true)} className="px-5 py-3 bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-[13px] font-black rounded-xl hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100">
                                <CheckCircle size={15} /> Complete Project
                            </button>
                        )}
                    </div>
                </div>

                {/* --- STATS OVERVIEW --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Quoted', value: project.quotedAmount, icon: DollarSign, color: 'indigo', status: 'Primary' },
                        { label: 'Funds Received', value: project.paymentDetails?.paidAmount, icon: CheckCircle, color: 'emerald', status: 'Secured' },
                        { label: 'Outstanding', value: outstandingAmount, icon: Clock, color: 'rose', status: 'Pending' }
                    ].map((stat, i) => (
                        <div key={i} className="group bg-white p-7 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                            <div className="flex flex-col h-full justify-between relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-md bg-${stat.color}-50 text-${stat.color}-600 border border-${stat.color}-100`}>
                                        {stat.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                    <p className="text-3xl font-black text-slate-900 tabular-nums">₹{Number(stat.value || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-7 rounded-[2.5rem] shadow-xl shadow-indigo-200 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
                        <div className="flex flex-col h-full justify-between relative z-10 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                                    <Receipt size={20} />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-md bg-white/20 border border-white/30 backdrop-blur-sm">Active</span>
                            </div>
                            <div>
                                <p className="text-[12px] font-bold text-indigo-100 uppercase tracking-[0.2em] mb-1">Economic Model</p>
                                <p className="text-3xl font-black">{project.gst || 18}% <span className="text-lg opacity-70">GST</span></p>
                                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">Taxation Protocol 3.0</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* LEFT COLUMN: Main Console */}
                    <div className="lg:col-span-8 space-y-10">


                        {/* 2. Technical Specifications */}
                        <div className="bg-white rounded-[2.5rem] border border-blue-100 shadow-2xl overflow-hidden group">
                            <div className="p-8 border-b border-blue-50 bg-blue-50/20 flex items-center gap-5">
                                <div className="p-4 bg-blue-600 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500">
                                    <Layers size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.25em]">Technical Specifications</h3>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Structural parameters and research metadata
                                    </div>
                                </div>
                            </div>
                            <div className="p-12 space-y-8">
                                {(project as any).parentProjectContext && (
                                    <div className="border-2 border-dashed border-indigo-200 rounded-[2rem] p-8 bg-indigo-50/40 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                                                <Search size={28} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Bridged Main Context</p>
                                                <h4 className="text-[20px] font-black text-slate-900 tracking-tight">{(project as any).parentProjectContext.formData?.projectTitle || (project as any).parentProjectContext.uniqueId}</h4>
                                            </div>
                                        </div>
                                        <Link href={`/super-admin-dashboard/projects/${(project as any).parentProjectContext.uniqueId}`} className="px-8 py-4 bg-white border-2 border-indigo-100 text-indigo-600 text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-xl">
                                            Switch to Source
                                        </Link>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Core Project Specs */}
                                    {project.parentProjectContext?.formData && Object.entries(project.parentProjectContext.formData).map(([key, value]) => {
                                        if (['services', 'remarks', 'description', 'projectDescription', 'id', '_id', 'referenceId', 'isSuperadminPurchase', 'projectTitle'].includes(key) || !value) return null;
                                        return (
                                            <div key={`parent-${key}`} className="p-8 bg-indigo-50/30 border border-indigo-100 rounded-[2rem] hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between min-h-[130px] group/spec">
                                                <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-indigo-100">Core Asset</span>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800 leading-tight tracking-tight">{String(value)}</p>
                                            </div>
                                        );
                                    })}

                                    {/* Acquisition Specs */}
                                    {Object.entries(project.formData || {}).map(([key, value]) => {
                                        if (['services', 'remarks', 'description', 'projectDescription', 'id', '_id', 'referenceId', 'isSuperadminPurchase', 'projectTitle'].includes(key) || !value) return null;
                                        return (
                                            <div key={`current-${key}`} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between min-h-[130px]">
                                                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-blue-100">Acquisition Spec</span>
                                                </div>
                                                <p className="text-[16px] font-black text-slate-800 leading-tight tracking-tight">{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 3. Procurement Lifecycle */}
                        <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-2xl overflow-hidden group">
                            <div className="p-8 border-b border-emerald-50 bg-emerald-50/20 flex items-center gap-5">
                                <div className="p-4 bg-emerald-600 rounded-2xl text-white group-hover:rotate-45 transition-transform duration-700">
                                    <ShoppingCart size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.25em]">Joined Procurement Lifecycle</h3>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Multi-source acquisition & compliance ledger
                                    </div>
                                </div>
                            </div>
                            <div className="p-10">{renderProcurement()}</div>
                        </div>


                        {/* 5. Operational Audit */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden group">
                            <div className="p-8 border-b border-rose-100 bg-rose-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-rose-600 rounded-2xl shadow-xl text-white">
                                        <Activity size={24} />
                                    </div>
                                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-[0.25em]">Operational Updates & Audit Trail</h3>
                                </div>
                            </div>
                            <div className="p-12 space-y-12">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between text-[12px] font-black uppercase tracking-[0.4em]">
                                        <span className="text-slate-400 italic">Project Integrity</span>
                                        <span className="text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
                                            {project.status === 'Completed' ? '100%' : '44%'}
                                        </span>
                                    </div>
                                    <div className="h-6 bg-slate-100 rounded-[2rem] overflow-hidden p-1.5 border border-slate-200/50">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 via-indigo-600 to-violet-800 rounded-[2rem]" style={{ width: project.status === 'Completed' ? '100%' : '44%' }} />
                                    </div>
                                </div>
                                <div className="space-y-14">
                                    <div className="space-y-8">
                                        <div className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] flex items-center gap-3"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Employee Protocol Logs</div>
                                        {employeeUpdates.map((a, i) => renderActivity(a, i))}
                                    </div>
                                    <div className="space-y-8">
                                        <div className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em] flex items-center gap-3"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Administrative Audit Records</div>
                                        {remainingActivities.map((a, i) => renderActivity(a, i))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Project Chat */}
                        <div className="bg-white rounded-[2rem] border border-fuchsia-100 shadow-xl flex flex-col h-[550px] overflow-hidden group">
                            <div className="p-5 border-b border-fuchsia-100 bg-fuchsia-50/30 flex items-center gap-4">
                                <div className="p-2 bg-fuchsia-600 rounded-lg text-white"><Mail size={16} /></div>
                                <h3 className="text-[12px] font-black text-fuchsia-900 uppercase tracking-widest">Project Chat</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-7 space-y-5 bg-white custom-scrollbar no-scrollbar">
                                {[...chatMessages].reverse().map((msg, idx) => {
                                    const isMe = (msg.senderId?._id || msg.senderId) === (user?.id || user?._id);
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-slate-50 text-slate-700 rounded-2xl rounded-tl-none border border-slate-200'} p-4 space-y-1.5`}>
                                                <div className="flex items-center justify-between gap-5 mb-1 text-[10px] font-black uppercase tracking-widest">
                                                    <span className={isMe ? 'text-indigo-100' : 'text-indigo-600'}>{msg.senderId?.name || 'Staff'}</span>
                                                    <span className="opacity-50">{new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-[14px] font-medium leading-relaxed">{msg.content}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-5 bg-slate-50 border-t border-slate-100">
                                <div className="flex gap-4 p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Secure message..." className="flex-1 px-4 py-2.5 text-[14px] outline-none font-semibold" />
                                    <button onClick={handleSendMessage} disabled={!messageInput.trim()} className="w-10 h-10 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 disabled:opacity-20 transition-all flex items-center justify-center shrink-0 shadow-md">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sidebar */}
                    <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-right duration-500">

                        {/* 1. Archival Vault */}
                        <div className="bg-white rounded-[2rem] border border-orange-100 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-orange-100 bg-orange-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-600 rounded-lg text-white"><FileText size={16} /></div>
                                    <h3 className="text-[12px] font-black text-orange-900 uppercase tracking-widest">Vault Attachments</h3>
                                </div>
                                <button onClick={() => actions.setShowUploadModal(true)} className="w-8 h-8 bg-white rounded-lg border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"><Plus size={16} /></button>
                            </div>
                            <div className="p-6">
                                {project.attachments?.length > 0 ? (
                                    <div className="space-y-3">{project.attachments.map((file: any, idx: number) => {
                                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                                        const fullUrl = `${baseUrl}/${file.path || ''}`.replace(/\\/g, '/');
                                        return (
                                            <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 transition-all group/item">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={14} className="text-slate-400 group-hover/item:text-indigo-600" />
                                                    <p className="text-[12px] font-bold text-slate-700 truncate">{file.filename}</p>
                                                </div>
                                                <ExternalLink size={12} className="text-slate-300" />
                                            </a>
                                        );
                                    })}</div>
                                ) : (
                                    <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center"><p className="text-[12px] font-black text-slate-300 uppercase tracking-widest">Vault Empty</p></div>
                                )}
                            </div>
                        </div>

                        {/* 2. Stakeholder Profile */}
                        <div className="bg-white rounded-[2rem] border border-teal-100 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-teal-100 bg-teal-50/30 flex items-center gap-3">
                                <div className="p-2 bg-teal-600 rounded-lg text-white"><User size={16} /></div>
                                <h3 className="text-[12px] font-black text-teal-900 uppercase tracking-widest">Stakeholder Profile</h3>
                            </div>
                            <div className="p-6 space-y-3">
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-teal-100">{project.userId?.name?.charAt(0) || 'U'}</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Full Name</p>
                                        <p className="text-[14px] font-black text-slate-900 truncate leading-none">{project.userId?.name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100"><Mail size={15} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                                        <p className="text-[12px] font-bold text-slate-700 truncate leading-none">{project.userId?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Transactional Context */}
                        <div className="bg-white rounded-[2rem] border border-indigo-100 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-indigo-100 bg-indigo-50/30 flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white"><CreditCard size={16} /></div>
                                <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">Transactional Context</h3>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 leading-none">Method</p>
                                    <p className="text-[13px] font-black text-slate-800 leading-none">{project.paymentDetails?.paymentMethod || 'Default'}</p>
                                </div>
                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 leading-none text-rose-300">Maturity</p>
                                    <p className="text-[13px] font-black text-rose-600 leading-none">{project.paymentDetails?.dueDate ? new Date(project.paymentDetails.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Expert Remuneration */}
                        {project.professionalFee?.amount > 0 && (
                            <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-lg overflow-hidden">
                                <div className="p-5 border-b border-emerald-100 bg-emerald-50/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-600 rounded-lg text-white"><Briefcase size={16} /></div>
                                        <h3 className="text-[12px] font-black text-emerald-900 uppercase tracking-widest">Expert Remuneration</h3>
                                    </div>
                                    <span className="text-[13px] font-black text-emerald-700">₹{Number(project.professionalFee.amount).toLocaleString()}</span>
                                </div>
                                <div className="p-6">
                                    <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-100/50 text-[13px] text-slate-600 italic">"{project.professionalFee.description || 'Deliverables scope.'}"</div>
                                </div>
                            </div>
                        )}

                        {/* 5. Team Topology */}
                        <div className="bg-white rounded-[2rem] border border-violet-100 shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-violet-100 bg-violet-50/50 flex items-center gap-4">
                                <div className="p-2.5 bg-violet-600 rounded-lg text-white"><GitBranch size={20} /></div>
                                <h3 className="text-[14px] font-black text-violet-900 uppercase tracking-widest">Project Team Topology</h3>
                            </div>
                            <div className="p-8">
                                <div className="relative pl-8 space-y-10">
                                    <div className="absolute left-[13px] top-8 bottom-8 w-1 bg-cyan-100/50" />
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-violet-500 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest leading-none">Primary Manager</p>
                                            <p className="text-[15px] font-black text-slate-800">{project.assignedTo?.[0]?.name || 'Unassigned'}</p>
                                            <div className="flex flex-wrap gap-1">{(project.assignedTo?.[0]?.services || [project.assignedTo?.[0]?.department || 'Strategic']).map((s: string, i: number) => (<span key={i} className="text-[9px] font-black text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded uppercase tracking-tighter">{s}</span>))}</div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-slate-400 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Lead Operator</p>
                                            <p className="text-[15px] font-black text-slate-800">{project.teamLeadId?.name || 'Awaiting Allocation'}</p>
                                            <div className="flex flex-wrap gap-1">{(project.teamLeadId?.services || [project.teamLeadId?.department || 'Execution']).map((s: string, i: number) => (<span key={i} className="text-[9px] font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{s}</span>))}</div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10" />
                                        <div className="space-y-4">
                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">Field Assets</p>
                                            <div className="space-y-3">
                                                {project.teamMembers?.length > 0 ? project.teamMembers.slice(0, 3).map((m: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:border-emerald-200 transition-all">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[14px] shadow-sm">{m.name?.charAt(0)}</div>
                                                        <div className="overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[13px] font-bold text-slate-800 truncate">{m.name}</p>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">#{m.uniqueId || 'EMP-X'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )) : <p className="text-[12px] font-medium text-slate-400 italic">No field assets assigned.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- MODAL PLACES --- */}
                {/* ... Modal components go here ... */}

            </div>
        </div>
    );
}
