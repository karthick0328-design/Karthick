'use client';

import { useState, useEffect } from 'react';
import SidebarAdmin from '../../adminCompontent/sidebarAdmin';
import Header from '../../adminCompontent/Header';
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

export default function AdminSoftwareIssues() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0 });
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState('');
    const [mounted, setMounted] = useState(false);
    const [staffRemark, setStaffRemark] = useState('');
    const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

    const fetchIssues = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/software-issues', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setIssues(data.data);
                
                // Calculate quick stats locally for admin
                const total = data.data.length;
                let open = 0, active = 0, completed = 0, crit = 0;
                data.data.forEach((i: any) => {
                    if (i.status === 'Open') open++;
                    if (i.status === 'In Progress' || i.status === 'Testing') active++;
                    if (i.status === 'Resolved' || i.status === 'Closed') completed++;
                    if (i.priority === 'Critical') crit++;
                });
                setStats({ total, open, inProgress: active, resolved: completed, critical: crit });
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

    if (!mounted) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>;
    }

    const handleViewDetails = (issue: any) => {
        setSelectedIssue(issue);
        setStatusToUpdate(issue.status);
        setIsDetailModalOpen(true);
    };

    const handleUpdateStatus = async (statusOverride?: string, issueOverride?: any) => {
        const issue = issueOverride || selectedIssue;
        const status = statusOverride || statusToUpdate;

        if (!issue || !status) {
            toast.error('No issue or status selected');
            return;
        }
        
        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/software-issues/${issue._id}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Status updated to ${status} successfully!`);
                
                // If there's a remark (only from modal)
                if (staffRemark.trim() && !issueOverride) {
                    await handleAddRemark();
                }
                
                fetchIssues(); // Refresh the list
                if (!issueOverride) {
                    setIsDetailModalOpen(false);
                }
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (error) {
            toast.error('Server error occurred');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddRemark = async () => {
        if (!staffRemark.trim()) return;
        setIsSubmittingRemark(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/software-issues/${selectedIssue._id}/comments`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: staffRemark })
            });
            const data = await res.json();
            if (data.success) {
                setStaffRemark('');
                return true;
            }
        } catch (error) {
            console.error('Failed to add remark');
        } finally {
            setIsSubmittingRemark(false);
        }
        return false;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            
            <div className={`transition-all duration-300 ease-in-out flex-1 ${sidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                
                <main className="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Bug size={24} />
                                </div>
                                Software Issues
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium ml-14">Track and manage system bugs and reports</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-6 mb-8">
                        {[
                            { label: 'Total Issues', val: stats.total, color: 'text-slate-700', bg: 'bg-white' },
                            { label: 'Open', val: stats.open, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'In Progress', val: stats.inProgress, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Resolved', val: stats.resolved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Critical', val: stats.critical, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center`}>
                                <div className={`text-3xl font-black ${s.color}`}>{loading ? '-' : s.val}</div>
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 text-lg">All Reports</h2>
                            <div className="flex gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="text" placeholder="Search issues..." suppressHydrationWarning className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
                                </div>
                                <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                                    <Filter size={18} />
                                </button>
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
                                        <th className="px-6 py-4 font-bold border-b border-slate-100 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">Loading issues...</td></tr>
                                    ) : issues.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">No software issues reported yet.</td></tr>
                                    ) : (
                                        issues.map((issue: any) => (
                                            <tr key={issue._id} className="hover:bg-slate-50/50 transition-colors group">
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
                                                    <select 
                                                        value={issue.status}
                                                        onChange={(e) => handleUpdateStatus(e.target.value, issue)}
                                                        disabled={updatingStatus}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 outline-none transition-all hover:border-slate-300 focus:ring-2 focus:ring-indigo-500 shadow-sm ${
                                                            issue.status === 'Resolved' || issue.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' :
                                                            issue.status === 'Testing' ? 'bg-purple-50 text-purple-700' :
                                                            issue.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700' :
                                                            'bg-sky-50 text-sky-700'
                                                        }`}
                                                    >
                                                        <option value="Open">Open</option>
                                                        <option value="In Progress">In Progress</option>
                                                        <option value="Testing">Testing</option>
                                                        <option value="Resolved">Resolved</option>
                                                        <option value="Closed">Closed</option>
                                                    </select>
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

            {/* Issue Detail Modal */}
            {isDetailModalOpen && selectedIssue && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
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

                            <div className="mb-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} /> Description
                                </h4>
                                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-600 leading-relaxed min-h-[120px]">
                                    {selectedIssue.description || "No description provided."}
                                </div>
                            </div>

                            {selectedIssue.projectTitle && (
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Bug size={16} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Related Project</div>
                                            <div className="text-sm font-bold text-indigo-900">{selectedIssue.projectTitle}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-white rounded-lg text-indigo-600 font-bold text-[10px] uppercase border border-indigo-100 shadow-sm">
                                        {selectedIssue.projectService}
                                    </div>
                                </div>
                            )}

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

                            {/* Activity & Discussion Section */}
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} /> Activity & Discussion
                                </h4>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Combine activity logs and comments, sort by date */}
                                    {[
                                        ...(selectedIssue.activityLogs || []).map((l: any) => ({ ...l, type: 'activity' })),
                                        ...(selectedIssue.comments || []).map((c: any) => ({ ...c, type: 'comment' }))
                                    ].sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map((item: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-2xl border ${item.type === 'activity' ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50/30 border-indigo-100'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${item.type === 'activity' ? 'text-slate-400' : 'text-indigo-500'}`}>
                                                    {item.type === 'activity' ? 'System Log' : 'Admin Remark'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(item.date || item.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className={`text-sm ${item.type === 'activity' ? 'text-slate-600 italic' : 'text-slate-800 font-medium'}`}>
                                                {item.type === 'activity' ? item.action : item.text}
                                            </p>
                                            {item.user && item.user.name && (
                                                <div className="mt-2 text-[10px] font-bold text-slate-400">
                                                    — {item.user.name}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!selectedIssue.activityLogs?.length && !selectedIssue.comments?.length) && (
                                        <div className="p-6 text-center text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl">
                                            No activity recorded yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Staff Remark Input */}
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <MessageSquare size={14} /> Add Message/Remark
                                </label>
                                <textarea 
                                    value={staffRemark}
                                    onChange={(e) => setStaffRemark(e.target.value)}
                                    placeholder="Add a message for the user regarding this update..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm min-h-[80px]"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
                            <div className="flex-1 flex items-center gap-3">
                                <select 
                                    value={statusToUpdate}
                                    onChange={(e) => setStatusToUpdate(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                >
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Testing">Testing</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-6 py-2.5 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                {selectedIssue.status !== 'Resolved' && (
                                    <button 
                                        onClick={() => handleUpdateStatus('Resolved')}
                                        disabled={updatingStatus}
                                        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} /> Mark Resolved
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleUpdateStatus()}
                                    disabled={updatingStatus}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {updatingStatus ? 'Updating...' : 'Update Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
