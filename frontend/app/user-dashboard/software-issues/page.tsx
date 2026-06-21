'use client';

import { useState, useEffect } from 'react';
import SidebarUser from '../../user-compontent/sidebar';
import Header from '../../user-compontent/header';
import { Bug, Plus, Search, Filter, AlertCircle, Clock, CheckCircle, Eye, X, MessageSquare, Tag, Terminal, Paperclip, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateURL } from '@/lib/validation';

// SEC-FIX: Build a safe, validated attachment URL to prevent DOM-based XSS (CWE-79)
const buildAttachmentUrl = (filename: string): string | null => {
    if (typeof filename !== 'string' || !filename.trim()) return null;
    // Whitelist: only allow alphanumeric, underscores, hyphens, dots
    const safe = filename.replace(/[^a-zA-Z0-9._\-]/g, '');
    if (!safe) return null;
    try {
        const url = `http://localhost:5000/uploads/issues/${encodeURIComponent(safe)}`;
        return validateURL(url);
    } catch {
        return null;
    }
};

export default function UserSoftwareIssues() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Form inputs
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [issueType, setIssueType] = useState('Bug');
    const [priority, setPriority] = useState('Medium');
    const [attachments, setAttachments] = useState<File[]>([]);

    const fetchIssues = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/software-issues', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Filter locally to just their issues based on user ID logic, or assume API handles it
                setIssues(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch issues');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchIssues();
    }, []);

    const handleViewDetails = (issue: any) => {
        setSelectedIssue(issue);
        setIsDetailModalOpen(true);
    };

    if (!mounted) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('issueType', issueType);
            formData.append('priority', priority);
            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            const res = await fetch('http://localhost:5000/api/software-issues', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Issue reported successfully!');
                setIsModalOpen(false);
                fetchIssues();
                setTitle('');
                setDescription('');
                setAttachments([]);
            } else {
                toast.error(data.message || 'Failed to report issue');
            }
        } catch (error) {
            toast.error('Server error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <SidebarUser isSidebarOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            <div className={`transition-all duration-300 ease-in-out flex-1 ${sidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} user={{ name: '', role: 'User' }} />
                
                <main className="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                                    <Bug size={24} />
                                </div>
                                Software Issues
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium ml-14">Report bugs or request new features</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            suppressHydrationWarning
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold tracking-wide shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                        >
                            <Plus size={20} /> Report New Issue
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 text-lg">My Reports</h2>
                            <div className="flex gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search my issues..." 
                                        suppressHydrationWarning
                                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Issue ID</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Title</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Type</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Priority</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Status</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Date</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">Loading your reports...</td></tr>
                                    ) : issues.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">You haven't reported any issues yet.</td></tr>
                                    ) : (
                                        issues.map((issue: any) => (
                                            <tr key={issue._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs text-slate-400">#{issue._id.slice(-6).toUpperCase()}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{issue.title}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{issue.issueType}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                                                        issue.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                                                        issue.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                                        issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {issue.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                        issue.status === 'Resolved' || issue.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' :
                                                        issue.status === 'Testing' ? 'bg-purple-100 text-purple-700' :
                                                        issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                                                        'bg-sky-100 text-sky-700'
                                                    }`}>
                                                        {issue.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(issue.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleViewDetails(issue)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-semibold text-xs flex items-center justify-end gap-2 ml-auto"
                                                    >
                                                        <Eye size={16} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Issue Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Report a Software Issue</h2>
                                <p className="text-slate-500 font-medium">Please provide details to help us fix the problem.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* ... same form fields ... */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Issue Title</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Brief summary of the issue..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Issue Type</label>
                                    <select 
                                        value={issueType}
                                        onChange={(e) => setIssueType(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium appearance-none"
                                    >
                                        <option value="Bug">Bug Report</option>
                                        <option value="UI Issue">UI/Design Issue</option>
                                        <option value="Performance Issue">Performance Issue</option>
                                        <option value="Security Issue">Security Issue</option>
                                        <option value="Feature Request">Feature Request</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Priority Level</label>
                                    <select 
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium appearance-none"
                                    >
                                        <option value="Low">Low - Not urgent</option>
                                        <option value="Medium">Medium - Regular priority</option>
                                        <option value="High">High - Impedes work</option>
                                        <option value="Critical">Critical - System broken</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Detailed Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explain how to reproduce the bug or describe the feature clearly..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium min-h-[120px]"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Attachments (Screenshot/Log files - optional)</label>
                                <input 
                                    type="file" 
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) setAttachments(Array.from(e.target.files));
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">
                                    Submit Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue Detail Modal */}
            {isDetailModalOpen && selectedIssue && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${
                                    selectedIssue.priority === 'Critical' ? 'bg-rose-50 text-rose-600' :
                                    selectedIssue.priority === 'High' ? 'bg-orange-50 text-orange-600' :
                                    'bg-indigo-50 text-indigo-600'
                                }`}>
                                    <Bug size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg leading-tight">{selectedIssue.title}</h3>
                                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-0.5">#{selectedIssue._id.slice(-8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-transparent hover:border-slate-100 shadow-sm hover:shadow-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 text-left">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <Tag size={14} /> Type
                                    </div>
                                    <div className="text-slate-800 font-bold">{selectedIssue.issueType}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <AlertCircle size={14} /> Priority
                                    </div>
                                    <div className={`font-bold ${
                                        selectedIssue.priority === 'Critical' ? 'text-rose-600' :
                                        selectedIssue.priority === 'High' ? 'text-orange-600' :
                                        'text-indigo-600'
                                    }`}>{selectedIssue.priority}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <Clock size={14} /> Status
                                    </div>
                                    <div className="text-slate-800 font-bold">{selectedIssue.status}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <Terminal size={14} /> Date Reported
                                    </div>
                                    <div className="text-slate-800 font-bold">{new Date(selectedIssue.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                                </div>
                            </div>

                            <div className="mb-8 text-left">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Tag size={14} /> Description
                                </h4>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-600 leading-relaxed min-h-[100px]">
                                    {selectedIssue.description || "No description provided."}
                                </div>
                            </div>

                            {/* Activity & Messages Section */}
                            <div className="mt-8 text-left border-t border-slate-100 pt-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} /> Admin Feedback & Activity
                                </h4>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {[
                                        ...(selectedIssue.activityLogs || []).map((l: any) => ({ ...l, type: 'activity' })),
                                        ...(selectedIssue.comments || []).map((c: any) => ({ ...c, type: 'comment' }))
                                    ].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((item: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-2xl border ${
                                            item.type === 'activity' 
                                            ? 'bg-emerald-50/50 border-emerald-100' 
                                            : 'bg-indigo-50/40 border-indigo-200 shadow-sm'
                                        }`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1 rounded-md ${item.type === 'activity' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                        {item.type === 'activity' ? <CheckCircle size={12} /> : <MessageSquare size={12} />}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${item.type === 'activity' ? 'text-emerald-700' : 'text-indigo-600'}`}>
                                                        {item.type === 'activity' ? 'Status Update' : 'Support Message'}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                                    {new Date(item.date || item.createdAt).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className={`text-sm leading-relaxed ${item.type === 'activity' ? 'text-emerald-900 font-bold' : 'text-slate-800 font-semibold'}`}>
                                                {item.type === 'activity' ? item.action : item.text}
                                            </p>
                                        </div>
                                    ))}
                                    {(!selectedIssue.activityLogs?.length && !selectedIssue.comments?.length) && (
                                        <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                            <div className="p-3 bg-white rounded-full w-fit mx-auto shadow-sm mb-3">
                                                <MessageSquare size={20} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-bold">Waiting for admin feedback...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div className="mt-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Paperclip size={14} /> Attachments
                                </h4>
                                {selectedIssue.attachments && selectedIssue.attachments.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedIssue.attachments.map((file: string, index: number) => {
                                            const attachUrl = buildAttachmentUrl(file);
                                            if (!attachUrl) return null;
                                            return (
                                            <a 
                                                key={index} 
                                                href={attachUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="group relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-400 transition-all cursor-zoom-in"
                                            >
                                                <img 
                                                    src={validateURL(attachUrl)} 
                                                    alt={`Attachment ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg text-white">
                                                        <Eye size={20} />
                                                    </div>
                                                </div>
                                            </a>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <ImageIcon className="text-slate-300 mb-2" size={32} />
                                        <p className="text-slate-400 text-sm font-medium">No screenshots attached</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-8 py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
