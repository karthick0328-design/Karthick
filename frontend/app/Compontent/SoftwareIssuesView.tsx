'use client';

import React, { useState, useEffect } from 'react';
import { 
    Bug, Plus, Search, Filter, AlertCircle, CheckCircle2, 
    Clock, MoreVertical, Paperclip, ChevronRight, X,
    LayoutGrid, List, SlidersHorizontal, Download, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Props {
    roleName: string;
}

export default function SoftwareIssuesView({ roleName }: Props) {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('list');
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [issueType, setIssueType] = useState('Bug');
    const [priority, setPriority] = useState('Medium');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        try {
            const resp = await api.get('software-issues');
            if (resp.data.success) setIssues(resp.data.data);
        } catch (error) {
            console.error('Failed to fetch issues');
            toast.error('Could not load system issues');
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('issueType', issueType);
            formData.append('priority', priority);
            attachments.forEach(file => formData.append('attachments', file));

            const resp = await api.post('software-issues', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (resp.data.success) {
                toast.success('Strategy issue reported. IT team notified.');
                setIsModalOpen(false);
                fetchIssues();
                setTitle(''); setDescription(''); setAttachments([]);
            } else {
                toast.error(resp.data.message || 'Transmission failed');
            }
        } catch (err) { 
            toast.error('System synchronization error'); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPriorityColor = (p: string) => {
        switch(p) {
            case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/10';
            case 'High': return 'text-orange-600 bg-orange-50 border-orange-100 ring-orange-500/10';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100 ring-amber-500/10';
            default: return 'text-slate-600 bg-slate-50 border-slate-100 ring-slate-500/10';
        }
    };

    const getStatusIcon = (s: string) => {
        switch(s) {
            case 'Resolved': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'In Progress': return <Clock size={14} className="text-indigo-500 animate-pulse" />;
            default: return <AlertCircle size={14} className="text-sky-500" />;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Executive Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-rose-50 rounded-full -mr-40 -mt-40 opacity-30 group-hover:scale-110 transition-transform duration-1000"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-[1.5rem] shadow-xl shadow-rose-200 group-hover:rotate-12 transition-transform duration-500">
                            <Bug size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Technical <span className="text-rose-600">Compliance</span></h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">{roleName}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-4 mt-8 lg:mt-0 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5 px-3">
                        <button 
                            onClick={() => setViewLayout('list')}
                            className={`p-2 rounded-xl transition-all ${viewLayout === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            suppressHydrationWarning
                        >
                            <List size={18} />
                        </button>
                        <button 
                            onClick={() => setViewLayout('grid')}
                            className={`p-2 rounded-xl transition-all ${viewLayout === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            suppressHydrationWarning
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 hover:shadow-2xl hover:shadow-rose-200 transition-all flex items-center gap-3"
                        suppressHydrationWarning
                    >
                        <Plus size={18} /> Report Strategic Issue
                    </button>
                </div>
            </div>

            {/* Filter & Search Dashboard */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search system vulnerabilities, titles, or authors..."
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium text-slate-700"
                        suppressHydrationWarning
                    />
                </div>
                <button 
                    className="px-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-3 font-bold text-sm"
                    suppressHydrationWarning
                >
                    <SlidersHorizontal size={20} />
                    Filter Catalog
                </button>
                <button 
                    className="p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm text-slate-500 hover:text-indigo-600 transition-all"
                    suppressHydrationWarning
                >
                    <Download size={20} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Scanning System Catalog...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-24 text-center border border-slate-100 shadow-xl shadow-slate-200/20">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Systems Fully Optimized</h3>
                        <p className="text-slate-400 font-medium h-max mb-8">No critical or non-critical issues reported in this service sector.</p>
                        <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                            Initiate New Report
                        </button>
                    </div>
                ) : viewLayout === 'list' ? (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/30 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-6">Identity</th>
                                        <th className="px-8 py-6">Subject Matter</th>
                                        <th className="px-8 py-6 text-center">Category</th>
                                        <th className="px-8 py-6 text-center">Criticality</th>
                                        <th className="px-8 py-6 text-center">Phase</th>
                                        <th className="px-8 py-6 text-right">Synchronization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {issues.map((issue: any, idx) => (
                                        <motion.tr 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={issue._id} 
                                            className="group hover:bg-slate-50/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    #{issue._id.slice(-6).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 max-w-md">
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{issue.title}</span>
                                                    <span className="text-xs text-slate-400 font-medium line-clamp-1">{issue.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider">
                                                    {issue.issueType}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ring-1 ${getPriorityColor(issue.priority)}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${issue.priority === 'Critical' ? 'bg-rose-600' : 'bg-current'}`}></div>
                                                    {issue.priority}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 shadow-sm rounded-xl text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                                    {getStatusIcon(issue.status)}
                                                    {issue.status || 'Active'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[12px] font-black text-slate-800">
                                                        {mounted ? new Date(issue.createdAt).toLocaleDateString() : 'Loading...'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {mounted ? new Date(issue.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                                    </span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                         {issues.map((issue: any, idx) => (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={issue._id} 
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/20 group hover:shadow-2xl transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                                    <Bug size={64} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ring-1 ${getPriorityColor(issue.priority)}`}>
                                            {issue.priority}
                                        </span>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Paperclip size={16} />
                                            {issue.attachments?.length || 0}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{issue.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-8 line-clamp-2 h-10">{issue.description}</p>
                                    
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-50 rounded-lg">{getStatusIcon(issue.status)}</div>
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{issue.status || 'Active'}</span>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </motion.div>
                         ))}
                    </div>
                )}
            </div>

            {/* Premium Entry Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Report <span className="text-rose-600">Issue</span></h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Strategic Technical Audit</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-100 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Report Subject</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        placeholder="Clear, strategic summary of the technical defect..."
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none font-bold text-slate-800" 
                                        required 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Classification</label>
                                        <select 
                                            value={issueType} 
                                            onChange={(e) => setIssueType(e.target.value)} 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold text-slate-800 appearance-none focus:ring-4 focus:ring-indigo-500/5"
                                        >
                                            <option value="Bug">Technical Defect (Bug)</option>
                                            <option value="UI Issue">Design Inconsistency</option>
                                            <option value="Performance Issue">Latency / Optimization</option>
                                            <option value="Feature Request">Efficiency Request</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Strategic Priority</label>
                                        <select 
                                            value={priority} 
                                            onChange={(e) => setPriority(e.target.value)} 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold text-slate-800 appearance-none focus:ring-4 focus:ring-indigo-500/5"
                                        >
                                            <option value="Low">Optimization (Low)</option>
                                            <option value="Medium">Standard (Medium)</option>
                                            <option value="High">Operations Critical (High)</option>
                                            <option value="Critical">Immediate Action (Critical)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Contextual Description</label>
                                    <textarea 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)} 
                                        placeholder="Detailed analysis of the issue and expected behavior..."
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none font-bold text-slate-800 min-h-[160px] focus:ring-4 focus:ring-indigo-500/5" 
                                        required 
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg shadow-indigo-100/50">
                                            <Paperclip size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Attach Technical Dossier</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Documents, logs, or screenshots</p>
                                        </div>
                                        <input type="file" multiple onChange={(e) => { if (e.target.files) setAttachments(Array.from(e.target.files)); }} className="hidden" />
                                    </label>

                                    <div className="flex gap-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsModalOpen(false)} 
                                            className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="bg-slate-900 hover:bg-rose-600 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-200 transition-all flex items-center gap-2"
                                        >
                                            {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                            Authorize Submission
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

