'use client';

import React from 'react';
import { 
  Projector, 
  Briefcase, 
  Clock, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  TrendingUp,
  MessageSquare,
  Loader2,
  X,
  Upload,
  Paperclip,
  GitBranch
} from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SummaryCard from '../components/SummaryCard';

export default function ProjectStatusPage() {
  const router = useRouter();
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedProject, setSelectedProject] = React.useState<any>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [updateText, setUpdateText] = React.useState('');
  const [updating, setUpdating] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showProgressModal, setShowProgressModal] = React.useState(false);
  const [progressNotes, setProgressNotes] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/projects/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProjects();
  }, []);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedProject?._id) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/projects/${selectedProject._id}/status`, {
        status,
        updates: updateText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setUpdateText('');
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedProject?._id || !progressNotes.trim()) return;

    try {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('progressNotes', progressNotes);
      selectedFiles.forEach(file => formData.append('attachments', file));

      // Use the general update-progress endpoint which we updated for SuperAdmin access
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/department/assigned-projects/${selectedProject._id}/update-progress`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowProgressModal(false);
      setProgressNotes('');
      setSelectedFiles([]);
      fetchProjects();
      alert('Progress synchronized successfully');
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Operational synchronization failed');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ongoingCount = projects.filter(p => p.status === 'In Progress').length;
  const criticalCount = projects.filter(p => p.status === 'On Hold').length;

  const projectMetrics = [
    { title: 'Total Projects', value: projects.length.toString(), change: '+0', status: 'up', icon: Briefcase, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Ongoing Cycle', value: ongoingCount.toString(), change: '+0', status: 'up', icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Critical Risk', value: criticalCount.toString(), change: '+0', status: 'down', icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
    { title: 'Avg Completion', value: '68%', change: '+4.2%', status: 'up', icon: Zap, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <ShieldCheck size={10} className="text-indigo-400" />
            <span>Master Lifecycle Sync</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               Project Status
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed italic">Global project intelligence and individual unit achievement monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input 
               type="text" 
               placeholder="Scan Logic Modules..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-indigo-100 shadow-sm w-72" 
             />
          </div>
          <button className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
            <Download size={14} /> Global Status XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {projectMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'red', 'amber'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="Project Lifecycle"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 space-y-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest italic font-serif">Active Unit Surveillance</h3>
        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Retrieving Global Lifecycle Sync...</p>
             </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-4 px-4 font-black">Lifecycle Module</th>
                  <th className="pb-4 px-4 font-black">Assigned Team</th>
                  <th className="pb-4 px-4 font-black">Service Unit</th>
                  <th className="pb-4 px-4 text-right">Status Profile</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((row, idx) => (
                  <tr 
                    key={row._id || idx} 
                    className="group cursor-pointer hover:bg-indigo-50/20 transition-all"
                    onClick={() => {
                        router.push(`/super-admin-dashboard/projects/${row._id}`);
                    }}
                  >
                    <td className="bg-slate-50/50 py-5 px-6 rounded-l-[24px] border-y border-l border-transparent hover:border-indigo-100 transition-all">
                      <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{row.title}</span>
                          <span className="text-[9px] font-bold text-slate-300">{row.uniqueId || 'BIO-X-00'} | {row.category}</span>
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent transition-all">
                      <div className="flex items-center gap-2">
                          <Users size={14} className="text-indigo-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{row.teamLeadId?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent transition-all max-w-xs">
                       <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 italic">
                          {row.service || row.category} Unit
                       </span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 rounded-r-[24px] text-right border-y border-r border-transparent">
                      <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProject(row);
                                    setShowProgressModal(true);
                                }}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                title="Update Progress"
                              >
                                <Activity size={14} />
                              </button>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${row.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100'} italic`}>
                                  {row.status?.toUpperCase() || 'IN PROGRESS'}
                              </span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-indigo-600">
                             Last Sync: {new Date(row.updatedAt).toLocaleDateString()}
                          </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button className="w-full py-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm">
            Access Full Global Project Lifecycle Archive
        </button>
      </div>

      {/* Update Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Global Lifecycle Synchronization</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Recalibrating {selectedProject.uniqueId}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400"
                >
                   <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                 {/* Project Details */}
                 <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Title</p>
                       <p className="text-sm font-bold text-slate-900">{selectedProject.title || 'N/A'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Department</p>
                       <p className="text-sm font-bold text-slate-900">{selectedProject.department || 'N/A'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Current Status</p>
                       <p className="text-sm font-bold text-slate-900">{selectedProject.status}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Initiated On</p>
                       <p className="text-sm font-bold text-slate-900">{new Date(selectedProject.createdAt).toLocaleDateString()}</p>
                    </div>
                    {selectedProject.category && (
                      <div className="col-span-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Category / Service</p>
                         <p className="text-sm font-bold text-slate-900">{selectedProject.category}</p>
                      </div>
                    )}
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Real-time Implementation Feedback</label>
                    <textarea 
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="Specify critical operational updates for this unit..."
                      className="w-full h-40 bg-slate-50/50 border border-slate-100 rounded-3xl p-6 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none font-mono"
                    />
                 </div>

                 <div className="flex justify-end pt-2">
                    <Link
                        href={`/super-admin-dashboard/projects/${selectedProject._id}`}
                        className="py-3 px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg"
                    >
                        View Full Details
                    </Link>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      disabled={updating}
                      onClick={() => handleUpdateStatus('In Progress')}
                      className="py-5 bg-blue-50 text-blue-700 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-xl hover:shadow-blue-100 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="animate-spin" size={14} /> : <Zap size={16} />} Deploy Ongoing
                    </button>
                    <button 
                      disabled={updating}
                      onClick={() => handleUpdateStatus('Completed')}
                      className="py-5 bg-emerald-50 text-emerald-700 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-xl hover:shadow-emerald-100 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={16} />} Verify Completed
                    </button>
                 </div>
              </div>

              <div className="bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200">
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                     <ClipboardList size={14} className="text-indigo-500" />
                     All status transitions are archived in the Enterprise Audit Engine
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Update Progress Modal */}
      {showProgressModal && selectedProject && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Update Progress</h3>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase italic">{selectedProject.uniqueId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProgressModal(false)}
                  className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Progress Methodology / Notes</label>
                  <textarea 
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Enter technical progress summary and milestone updates..."
                    className="w-full h-32 bg-slate-50/50 border border-slate-100 rounded-3xl p-6 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all resize-none font-mono"
                  />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Supporting Technical Documentation</label>
                   <div className="relative group/upload">
                      <input 
                        type="file" 
                        multiple 
                        onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 group-hover/upload:border-indigo-300 group-hover/upload:bg-indigo-50/30 transition-all">
                        <Paperclip size={24} className="text-slate-300 group-hover/upload:text-indigo-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Technical Assets</p>
                      </div>
                   </div>
                   {selectedFiles.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedFiles.map((f, i) => (
                           <div key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[9px] font-black border border-indigo-100 flex items-center gap-2">
                             <span className="truncate max-w-[120px]">{f.name}</span>
                             <button onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="hover:text-rose-600"><X size={10} /></button>
                           </div>
                        ))}
                      </div>
                   )}
                </div>

                <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setShowProgressModal(false)}
                      className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Abort
                    </button>
                    <button 
                      disabled={isUploading || !progressNotes.trim()}
                      onClick={handleUpdateProgress}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} 
                      {isUploading ? 'Synchronizing...' : 'Deploy Progress'}
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
