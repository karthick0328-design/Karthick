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
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  TrendingUp,
  Monitor,
  Database,
  Server,
  Wallet,
  MessageSquare,
  AlertTriangle,
  History as HistoryIcon,
  CheckSquare,
  Loader2,
  Search,
  X
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function ProjectComplaintsPage() {
  const [complaints, setComplaints] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedComplaint, setSelectedComplaint] = React.useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/project-service-complaints/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const allComplaints = (response.data.data || []).flatMap((report: any) => 
          (report.complaints || []).map((complaint: any) => ({
            ...complaint,
            projectName: report.projectName || report.projectSummary?.projectName,
            reportId: report._id
          }))
        );
        setComplaints(allComplaints);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (complaintId: string, status: string) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/project-service-complaints/complaint/${complaintId}/status`,
        { status, resolutionNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedComplaint(null);
      setResolutionNotes('');
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('Failed to update complaint status');
    } finally {
      setIsUpdating(false);
    }
  };

  const activeCount = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const criticalCount = complaints.filter(c => c.severity === 'High' || c.severity === 'Critical').length;

  const complaintMetrics = [
    { title: 'Active Complaints', value: activeCount.toString(), change: '+0', status: 'up', icon: AlertTriangle, color: 'rose' },
    { title: 'Total Reported', value: complaints.length.toString(), change: '+0', status: 'up', icon: Activity, color: 'emerald' },
    { title: 'Critical Escalations', value: criticalCount.toString(), change: '+0', status: 'up', icon: ShieldAlert, color: 'indigo' },
    { title: 'Resolution Rate', value: complaints.length > 0 ? `${Math.round((complaints.filter(c => c.status === 'Resolved').length / complaints.length) * 100)}%` : '0%', change: '+0', status: 'up', icon: CheckSquare, color: 'amber' },
  ];

  const filteredComplaints = complaints.filter(c => 
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.againstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.raisedByName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-rose-500 text-white shadow-lg shadow-rose-200';
      case 'high': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
  };

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 ring-2 ring-amber-50">
            <ShieldAlert size={10} className="text-amber-400" />
            <span>Satisfaction Vector Sync</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               Complaint Engine
               <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Global service anomaly monitoring and resolution throughput</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-5 py-4 bg-amber-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-slate-900 transition-all flex items-center gap-2 group">
            <Download size={14} className="group-hover:translate-y-1 transition-transform" /> Anomaly Export XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {complaintMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['amber', 'emerald', 'purple', 'red'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="Global Satisfaction"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-amber-500 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Anomaly Monitoring Matrix</h3>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Live Resolution Cycle Analytics</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                <input 
                  type="text" 
                  placeholder="Scan Anomaly Feed..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72" 
                />
              </div>
              <div className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                Live Sync Active
              </div>
            </div>
        </div>

        <div className="p-10 pt-4 space-y-10 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
               <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-rose-600" size={40} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Aggregating Resolution Data Vectors...</p>
               </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black">Complaint / Project</th>
                    <th className="pb-4 px-4 font-black">Raised By / Against</th>
                    <th className="pb-4 px-4 font-black text-center">Severity Node</th>
                    <th className="pb-4 px-6 font-black text-right">Resolution Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((row, idx) => (
                    <tr key={row._id || idx} className="group hover:-translate-y-1 transition-all duration-300">
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent group-hover:border-rose-100 transition-all">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-slate-900 uppercase line-clamp-2">{row.description}</span>
                            <span className="text-[9px] font-bold text-slate-400 tracking-widest truncate">{row.projectName || 'Awaiting Sync'}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent transition-all">
                        <div className="flex flex-col gap-1 text-[10px] font-black">
                            <span className="text-slate-600">FROM: {row.raisedByName || 'Internal System'}</span>
                            <span className="text-rose-500">AGAINST: {row.againstName || 'Process Agent'}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center">
                         <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${getPriorityColor(row.severity)}`}>
                            {row.severity || 'Medium'}
                         </span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full border shadow-sm ${row.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50'}`}>
                              {row.status?.toUpperCase() || 'OPEN'}
                          </span>
                          <button 
                            onClick={() => setSelectedComplaint(row)}
                            className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all shadow-sm active:scale-95 group-hover:rotate-12"
                          >
                             <ShieldAlert size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-[32px] hover:bg-slate-50 transition-all hover:text-amber-600 shadow-sm ring-8 ring-transparent hover:ring-amber-100">
              Access Full Global Satisfaction & Complaint History Archive
          </button>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-600" />
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                    <ShieldAlert size={12} />
                    <span>Resolution Logic Unit</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Resolve Anomaly</h4>
                </div>
                <button onClick={() => setSelectedComplaint(null)} className="p-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="bg-slate-50 p-8 rounded-[32px] space-y-5 border border-slate-100 shadow-inner">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Complaint</label>
                  <p className="text-sm font-black text-slate-900 leading-tight">{selectedComplaint.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporter Identification</label>
                    <p className="text-[10px] font-bold text-slate-600 truncate">{selectedComplaint.raisedByName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Status</label>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{selectedComplaint.status}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resolution Audit Trail</label>
                  <textarea 
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter detailed resolution engineering notes..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-[28px] p-6 text-[11px] font-medium outline-none focus:ring-4 focus:ring-rose-100 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(selectedComplaint._id, 'Resolved')}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />}
                    Finalize Resolution
                  </button>
                  <button 
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(selectedComplaint._id, 'Investigating')}
                    className="flex-1 py-4 bg-white text-slate-900 border border-slate-200 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Set Investigating
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
