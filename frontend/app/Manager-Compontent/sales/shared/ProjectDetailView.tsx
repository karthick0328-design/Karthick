'use client';

import React from 'react';
import {
    Activity, Briefcase, CheckSquare, Clock, Mail, Phone,
    Search, Send, User, XCircle, ChevronRight,
    DollarSign, AlertCircle, ArrowLeft,
    UserPlus, Calendar, CreditCard, CheckCircle, FileText, Download, X, Receipt, Trash2, Plus, Upload, ExternalLink,
    GitBranch, Users
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

    return (
        <div className="min-h-screen bg-white p-4 md:p-8">
            <div className="max-w-full mx-auto space-y-8 animate-in fade-in duration-500">

                {/* --- NAVIGATION & HEADER --- */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200/60">
                    <div className="flex items-center gap-5">
                        <Link
                            href={backUrl}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </Link>
                        <div>
                            {/* <div className="flex items-center gap-3 mb-2">
                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                                    {project.category}
                                </span>
                                <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                                    {project.department}
                                </span>
                            </div> */}
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                {project.uniqueId}
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-white p-2 rounded-2xl border border-gray-200/60 shadow-sm gap-1">
                            <button
                                onClick={() => actions.setShowEscalateHRModal(true)}
                                className="px-5 py-2.5 text-rose-600 text-[13px] font-black rounded-xl hover:bg-rose-50 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <AlertCircle size={15} /> Escalate
                            </button>

                            <div className="w-px h-6 bg-gray-200 mx-1" />

                            {(project.paymentStatus === 'Pending' || project.paymentStatus === 'Quote Sent' || project.paymentStatus === 'Payment Form Created') && (
                                <button
                                    onClick={actions.openQuoteModal}
                                    className="px-5 py-2.5 text-indigo-600 text-[13px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    <DollarSign size={15} /> {project.quotedAmount ? 'Update Quote' : 'Set Quote'}
                                </button>
                            )}

                            {project.quotedAmount && ['Quote Sent', 'Payment Form Created', 'Pending'].includes(project.paymentStatus) && (
                                <button
                                    onClick={actions.openPaymentFormModal}
                                    className="px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                    <FileText size={15} /> Create Bill
                                </button>
                            )}
                        </div>

                        {['Awaiting Approval', 'Awaiting Balance Approval', 'User Submitted Payment'].includes(project.paymentStatus) && (
                            <button
                                onClick={() => actions.setShowApprovePaymentModal(true)}
                                className="px-6 py-3 bg-emerald-600 text-white text-[13px] font-black rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-200"
                            >
                                <CheckCircle size={15} /> Approve Fund
                            </button>
                        )}

                        {['Payment Form Created', '50% Paid', 'Full Paid', 'Official Receipt Issued'].includes(project.paymentStatus) && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => actions.setShowReceiptModal(true)}
                                    className="px-5 py-3 bg-violet-600 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-violet-200"
                                >
                                    <Receipt size={15} /> {project.receipt?.data ? 'Revise Bill' : 'Generate Bill'}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => actions.setShowProfessionalFeeModal(true)}
                            className={`px-5 py-3 rounded-xl border text-[13px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${project.professionalFee?.amount ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Briefcase size={15} /> {project.professionalFee?.amount ? 'Expert Fee' : 'Add Fee'}
                        </button>

                        {['50% Paid', 'Official Receipt Issued', 'Full Paid', 'Pending'].includes(project.paymentStatus || '') && !project.assignedTo?.length && (
                            <button
                                onClick={() => {
                                    actions.loadServiceManagers();
                                    actions.setShowAssignModal(true);
                                }}
                                className="px-5 py-3 bg-slate-900 text-white text-[13px] font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <UserPlus size={15} /> Assign
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
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`} />
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
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                            <Briefcase size={100} className="text-white" />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                                    <Receipt size={20} className="text-white" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-md bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                    Active
                                </span>
                            </div>
                            <div>
                                <p className="text-[12px] font-bold text-indigo-100 uppercase tracking-[0.2em] mb-1">Economic Model</p>
                                <p className="text-3xl font-black text-white">{project.gst || 18}% <span className="text-lg opacity-70">GST</span></p>
                                <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mt-1">Taxation Protocol 3.0</p>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

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


                        {/* 2. Project Health Detailed Analytics */}
                        <div className="bg-white rounded-[2rem] border border-gray-200/60 shadow-lg overflow-hidden group">
                            <div className="p-5 border-b border-rose-100 bg-rose-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-600 rounded-lg shadow-md text-white group-hover:rotate-12 transition-transform duration-500">
                                        <Activity size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-rose-900 uppercase tracking-widest leading-none">Project Activity</h3>
                                </div>
                                <div className="flex items-center gap-4 bg-white/50 px-3 py-1.5 rounded-full border border-rose-100/50 shadow-sm leading-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Active Pulse</span>
                                    </div>
                                    <div className="w-px h-3 bg-slate-200" />
                                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{project.status}</span>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 text-slate-900">
                                {/* Primary Progress */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em]">
                                        <span className="text-slate-400">Holistic Completion Integrity</span>
                                        <span className="text-indigo-600">
                                            {project.status === 'Completed' ? '100%' : project.paymentStatus === 'Full Paid' ? '85%' : '45%'}
                                        </span>
                                    </div>
                                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-200/50">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-violet-600 transition-all duration-[1500ms] shadow-lg rounded-full"
                                            style={{ width: project.status === 'Completed' ? '100%' : project.paymentStatus === 'Full Paid' ? '85%' : '45%' }}
                                        />
                                    </div>
                                </div>

                                {/* Lower Context */}
                                <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                                            <CreditCard size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Financial State</p>
                                            <p className="text-[13px] font-black text-indigo-700 leading-none">{project.paymentStatus}</p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-100 hidden md:block" />
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm border border-slate-100/50">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Created Date</p>
                                            <p className="text-[13px] font-black text-slate-800 leading-none">{new Date(project.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-slate-100 hidden md:block" />
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-sm border border-orange-100/50">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Transmission</p>
                                            <p className="text-[13px] font-black text-slate-800 leading-none">{new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* 3. Internal Bridge */}
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

                        {/* 1. Archival Vault */}
                        <div className="bg-white rounded-[2rem] border border-orange-100 shadow-lg overflow-hidden group">
                            <div className="p-5 border-b border-orange-100 bg-orange-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-600 rounded-lg text-white">
                                        <FileText size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-orange-900 uppercase tracking-widest">Attachments</h3>
                                </div>
                                <button
                                    onClick={() => actions.setShowUploadModal(true)}
                                    className="w-8 h-8 bg-white rounded-lg border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="p-6">
                                {project.attachments && project.attachments.length > 0 ? (
                                    <div className="space-y-3 max-h-[180px] overflow-y-auto no-scrollbar">
                                        {project.attachments.map((file: any, idx: number) => {
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
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center">
                                        <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest">Vault Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Stakeholder Profile */}
                        <div className="bg-white rounded-[2rem] border border-teal-100 shadow-lg overflow-hidden group">
                            <div className="p-5 border-b border-teal-100 bg-teal-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-teal-600 rounded-lg text-white">
                                        <User size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-teal-900 uppercase tracking-widest">Profile</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                {/* Avatar + Name Row */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300">
                                    <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-teal-100 shrink-0">
                                        {project.userId?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Full Name</p>
                                        <p className="text-[14px] font-black text-slate-900 truncate leading-none">{project.userId?.name || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Email Row */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300">
                                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                                        <Mail size={15} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Email</p>
                                        <p className="text-[12px] font-bold text-slate-700 truncate leading-none">{project.userId?.email || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Phone Row */}
                            </div>
                        </div>

                        {/* 3. Transactional Context */}
                        <div className="bg-white rounded-[2rem] border border-indigo-100 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-indigo-100 bg-indigo-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                        <CreditCard size={16} />
                                    </div>
                                    <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">Transactional Context</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center hover:bg-white hover:border-indigo-200 transition-all duration-300">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 leading-none">Method</p>
                                        <p className="text-[13px] font-black text-slate-800 leading-none truncate">{project.paymentDetails?.paymentMethod || 'Default'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center hover:bg-white hover:border-rose-200 transition-all duration-300">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5 leading-none text-rose-300">Maturity</p>
                                        <p className="text-[13px] font-black text-rose-600 leading-none">
                                            {project.paymentDetails?.dueDate ? new Date(project.paymentDetails.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* 3. Expert Fee */}
                        {project.professionalFee?.amount > 0 && (
                            <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-lg overflow-hidden">
                                <div className="p-5 border-b border-emerald-100 bg-emerald-50/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                                            <Briefcase size={16} />
                                        </div>
                                        <h3 className="text-[12px] font-black text-emerald-900 uppercase tracking-widest">Expert Remuneration</h3>
                                    </div>
                                    <span className="text-[13px] font-black text-emerald-700">₹{Number(project.professionalFee.amount).toLocaleString()}</span>
                                </div>
                                <div className="p-6">
                                    <div className="p-4 bg-amber-50/30 rounded-xl border border-amber-100/50">
                                        <p className="text-[13px] text-slate-600 italic leading-relaxed">
                                            "{project.professionalFee.description || 'Deliverables scope.'}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Team Topology */}
                        <div className="bg-white rounded-[2rem] border border-violet-100 shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-violet-100 bg-violet-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-violet-600 rounded-lg text-white">
                                        <GitBranch size={20} />
                                    </div>
                                    <h3 className="text-[14px] font-black text-violet-900 uppercase tracking-widest">Project Team </h3>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="relative pl-8 space-y-10">
                                    <div className="absolute left-[13px] top-8 bottom-8 w-1 bg-cyan-100/50" />

                                    {/* Project Manager */}
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-violet-500 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-violet-500 uppercase tracking-widest leading-none">Primary Manager</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[15px] font-black text-slate-800">{project.assignedTo?.[0]?.name || 'Unassigned'}</p>
                                                {project.assignedTo?.[0]?.uniqueId && (
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                        #{project.assignedTo?.[0]?.uniqueId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[12px] font-bold text-slate-500 italic capitalize">Strategic Specialist</p>
                                        </div>
                                    </div>

                                    {/* Lead Engineer */}
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-slate-400 shadow-sm z-10" />
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Lead Operator</p>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[15px] font-black text-slate-800">{project.teamLeadId?.name || 'Awaiting Allocation'}</p>
                                                {project.teamLeadId?.uniqueId && (
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                        #{project.teamLeadId?.uniqueId}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[12px] font-bold text-slate-500 italic capitalize">Execution Lead</p>
                                        </div>
                                    </div>

                                    {/* Team Members */}
                                    <div className="relative">
                                        <div className="absolute -left-[24px] top-1.5 w-5 h-5 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10" />
                                        <div className="space-y-4">
                                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">Field Assets</p>
                                            <div className="space-y-3">
                                                {project.teamMembers && project.teamMembers.length > 0 ? (
                                                    project.teamMembers.slice(0, 3).map((m: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group/item hover:bg-white hover:border-emerald-200 transition-all">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[14px] shadow-sm">
                                                                {m.name?.charAt(0)}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[13px] font-bold text-slate-800 truncate">{m.name}</p>
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">#{m.uniqueId || 'EMP-X'}</span>
                                                                </div>
                                                                <p className="text-[11px] font-bold text-slate-400 italic capitalize truncate">Operational Specialist</p>
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
            </div>
        </div>
    );
}
