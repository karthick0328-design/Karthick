'use client';

import React from 'react';
import { 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
  Bug,
  Code,
  Loader2,
  MessageSquare,
  Send,
  X,
  History as HistoryIcon,
  ChevronRight,
  User,
  Hash
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function SoftwareIssuesPage() {
  const [issues, setIssues] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedIssue, setSelectedIssue] = React.useState<any>(null);
  const [commentText, setCommentText] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/software-issues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setIssues(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching software issues:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchIssues();
  }, []);

  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/software-issues/${issueId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchIssues();
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue({ ...selectedIssue, status });
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
      alert('Failed to update issue status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIssue) return;

    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/software-issues/${selectedIssue._id}/comments`,
        { text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setSelectedIssue(response.data.data);
        setCommentText('');
        fetchIssues();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const criticalCount = issues.filter(i => i.priority === 'Critical' || i.priority === 'High').length;
  const pendingPatchCount = issues.filter(i => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Testing').length;

  const issueMetrics = [
    { title: 'Critical Anomalies', value: criticalCount.toString(), change: '+2.4%', status: 'up', icon: ShieldAlert, color: 'rose' },
    { title: 'Active Resolvers', value: pendingPatchCount.toString(), change: '+12%', status: 'up', icon: Zap, color: 'amber' },
    { title: 'Total Intercepts', value: issues.length.toString(), change: '+0', status: 'neutral', icon: Activity, color: 'indigo' },
    { title: 'Integrity Rate', value: issues.length > 0 ? `${Math.round((issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length / issues.length) * 100)}%` : '100%', change: '+5.0%', status: 'up', icon: ShieldCheck, color: 'emerald' },
  ];

  const filteredIssues = issues.filter(i => 
    i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.issueType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.reportedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityStyle = (priority: string) => {
    const p = priority?.toLowerCase() || '';
    if (p.includes('critical') || p.includes('high')) return 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-50';
    if (p.includes('medium')) return 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-50';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50';
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('resolved') || s.includes('closed')) return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50';
    if (s.includes('progress') || s.includes('testing')) return 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 ring-2 ring-slate-50">
            <Activity size={10} className="text-slate-400 animate-pulse" />
            <span>Infrastructure Integrity Surveillance</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               System Health
               <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">High-fidelity monitoring of architectural anomalies and software vulnerabilities</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-5 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all flex items-center gap-2 group">
            <Download size={18} className="group-hover:translate-y-1 transition-transform" /> Integrity Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {issueMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['red', 'amber', 'purple', 'emerald'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="System Intelligence"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group text-sans">
        <div className="bg-slate-900 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Anomaly Registry</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Live Intercept & Resolution Feed</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Identify Anomaly..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-slate-500 text-white placeholder:text-slate-600 w-72" 
                />
              </div>
              <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Live Sync
              </button>
            </div>
        </div>

        <div className="p-10 pt-4 space-y-10 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
               <div className="py-24 flex flex-col items-center justify-center gap-6 text-center">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Retrieving Global Integrity Logs...</p>
               </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4 font-sans">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="pb-4 px-6">Problem Context</th>
                    <th className="pb-4 px-6 text-center">Protocol Class</th>
                    <th className="pb-4 px-6 text-center">Lifecycle Status</th>
                    <th className="pb-4 px-6 text-right">Priority Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((row, idx) => (
                    <tr key={row._id || idx} className="group hover:scale-[1.01] transition-all cursor-crosshair" onClick={() => setSelectedIssue(row)}>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent group-hover:border-indigo-100 transition-all flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform border border-white/10">
                            <Hash size={20} className="opacity-40" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none group-hover:text-amber-600 transition-colors">{row.title}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{row.projectTitle || 'GLOBAL_INFRA'}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent transition-all text-center">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm text-[9px] font-black text-slate-500 uppercase tracking-widest">
                           <Code size={12} className="opacity-40 text-indigo-400" />
                           {row.issueType || 'SYSTEM_CORE'}
                        </span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent text-center">
                        <span className={`px-5 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ring-4 ring-transparent group-hover:ring-white transition-all ${getStatusStyle(row.status)}`}>
                           {row.status || 'ANALYSIS'}
                        </span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex items-center justify-end gap-5">
                          <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-5 py-2 rounded-xl border ${getPriorityStyle(row.priority)}`}>
                            {row.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                          <button className="w-12 h-12 flex items-center justify-center bg-white text-slate-300 border border-slate-100 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm group-hover:rotate-12 hover:shadow-xl active:scale-90">
                             <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-[0.4em] border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-slate-900 transition-all">
              Global Infrastructure Integrity Synchronized Audit & Registry
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[85vh] relative">
             <div className="absolute top-0 left-0 w-full h-2 bg-rose-600" />
             <div className="p-10 border-b border-slate-50 flex justify-between items-start shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    <Bug size={14} className="animate-bounce" />
                    <span>LIFECYCLE_PROTOCOL</span>
                  </div>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedIssue.title}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedIssue.projectTitle} • {selectedIssue.issueType}</p>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="p-3 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm active:scale-95">
                  <X size={24} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                <div className="grid grid-cols-2 gap-6">
                    <div className={`p-8 rounded-[32px] border-2 flex flex-col gap-3 transition-all ${getPriorityStyle(selectedIssue.priority)}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Priority Tier</span>
                        <p className="text-xl font-black uppercase tracking-tight">{selectedIssue.priority} ALERT</p>
                    </div>
                    <div className={`p-8 rounded-[32px] border-2 flex flex-col gap-3 transition-all ${getStatusStyle(selectedIssue.status)}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Protocol State</span>
                        <p className="text-xl font-black uppercase tracking-tight">{selectedIssue.status}</p>
                    </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Description Intelligence</h5>
                  <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{selectedIssue.description || 'NO_CONTEXT_DATA'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Lifecycle Transition Matrix</h5>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {['Open', 'In Progress', 'Testing', 'Resolved'].map((stat) => (
                        <button 
                          key={stat}
                          onClick={() => handleUpdateStatus(selectedIssue._id, stat)}
                          disabled={isUpdating || selectedIssue.status === stat}
                          className={`h-14 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 border-2 ${selectedIssue.status === stat ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-100 hover:border-indigo-100'} disabled:opacity-50 active:scale-95`}
                        >
                          {stat}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-8">
                   <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Communication Intercepts</h5>
                   <div className="space-y-6">
                      {selectedIssue.comments?.map((comment: any, i: number) => (
                        <div key={i} className={`flex flex-col gap-4 p-8 rounded-[32px] border-2 shadow-sm relative transition-all ${comment.user?._id === selectedIssue.reportedBy?._id ? 'bg-indigo-50/30 border-indigo-50 ml-auto max-w-[85%]' : 'bg-white border-slate-50 max-w-[85%]'}`}>
                           <div className="flex justify-between items-center text-[10px] font-black">
                              <span className="text-slate-900 uppercase flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${comment.user?._id === selectedIssue.reportedBy?._id ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                                  {comment.user?.name || 'OBSERVER_NODE'}
                              </span>
                              <span className="text-slate-400 opacity-60">{new Date(comment.date).toLocaleDateString()}</span>
                           </div>
                           <p className="text-sm font-bold text-slate-600 leading-relaxed">{comment.text}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <form onSubmit={handleAddComment} className="p-8 bg-slate-50 border-t border-slate-100 shrink-0">
                <div className="relative max-w-xl mx-auto">
                   <input 
                     type="text" 
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     placeholder="Inject secure communication packet..."
                     className="w-full bg-white border border-slate-200 rounded-[24px] py-5 pl-8 pr-20 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-lg"
                   />
                   <button 
                     type="submit"
                     disabled={isUpdating || !commentText.trim()}
                     className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-slate-900 text-white rounded-[18px] shadow-xl hover:bg-rose-600 transition-all flex items-center justify-center disabled:opacity-50 active:scale-90"
                   >
                     <Send size={18} />
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
