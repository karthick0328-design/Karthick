'use client';

import { useState, useEffect } from 'react';
import { Bug, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeeSoftwareIssues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
            if (data.success) setIssues(data.data);
        } catch (error) {
            console.error('Failed to fetch issues');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIssues(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('issueType', issueType);
            formData.append('priority', priority);
            attachments.forEach(file => formData.append('attachments', file));

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
                setTitle(''); setDescription(''); setAttachments([]);
            } else {
                toast.error(data.message || 'Failed to report issue');
            }
        } catch { toast.error('Server error'); }
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Bug size={24} /></div>
                        Software Issues
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium ml-14">Report bugs or request features</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                    <Plus size={20} /> Report Issue
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-slate-800 text-lg">My Reports</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-bold border-b border-slate-100">ID</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Title</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Type</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Priority</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Status</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Date</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : issues.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No issues reported yet.</td></tr>
                            ) : (
                                issues.map((issue: any) => (
                                    <tr key={issue._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400">#{issue._id.slice(-6).toUpperCase()}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{issue.title}</td>
                                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{issue.issueType}</span></td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${issue.priority === 'Critical' ? 'bg-rose-100 text-rose-700' : issue.priority === 'High' ? 'bg-orange-100 text-orange-700' : issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{issue.priority}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${issue.status === 'Resolved' || issue.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>{issue.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(issue.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-800">Report a Software Issue</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                                    <select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                                        <option value="Bug">Bug</option>
                                        <option value="UI Issue">UI Issue</option>
                                        <option value="Performance Issue">Performance</option>
                                        <option value="Feature Request">Feature Request</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
                                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium min-h-[120px]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Attachments</label>
                                <input type="file" multiple onChange={(e) => { if (e.target.files) setAttachments(Array.from(e.target.files)); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
