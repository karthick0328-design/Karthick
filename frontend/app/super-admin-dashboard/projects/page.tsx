'use client';

import React from 'react';
import {
  Briefcase,
  Search,
  Download,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Activity,
  Layers,
  Users,
  Calendar,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Upload,
  Paperclip,
  CheckSquare,
  X,
  ArrowUpRight
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AllProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId');
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProject, setSelectedProject] = React.useState<any>(null);
  const [updateText, setUpdateText] = React.useState('');
  const [updating, setUpdating] = React.useState(false);
  const [showProgressModal, setShowProgressModal] = React.useState(false);
  const [progressNotes, setProgressNotes] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/projects/all?limit=1000`, {
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Only hide the core internal superadmin project ID, ensuring user/purchase projects remain visible
    const isUserProject = (p.uniqueId || '').toLowerCase() !== 'superadmin' && (p.department || '').toLowerCase() !== 'superadmin';
    const matchesClientId = clientIdFilter ? (String(p.userId?._id || p.userId) === String(clientIdFilter)) : true;

    return matchesSearch && isUserProject && matchesClientId;
  });

  const clientName = React.useMemo(() => {
    if (!clientIdFilter) return null;
    const projectWithClient = projects.find(p => (p.userId?._id === clientIdFilter || p.userId === clientIdFilter));
    return projectWithClient?.userId?.name || 'Stakeholder';
  }, [projects, clientIdFilter]);

  const processedProjects = React.useMemo(() => {
    const realProjects = filteredProjects.filter(p => (p.department || '').toUpperCase().trim() !== 'FINANCIAL');
    const financialProjects = filteredProjects.filter(p => (p.department || '').toUpperCase().trim() === 'FINANCIAL');

    // Create a map to group real projects by their UNIQUE ID to prevent overwriting
    const projectMap = new Map();
    realProjects.forEach(p => {
      const pKey = p.uniqueId;
      const display = p.formData?.projectTitle || p.formData?.titleProject || p.paymentDetails?.title || p.category || p.department || p.uniqueId;
      projectMap.set(pKey, { ...p, displayName: display, allLinkedPurchases: [] });
    });

    const individualPurchases: any[] = [];

    financialProjects.forEach(fp => {
      // Find parent project by comparing titles or linked projectId
      const fpTitle = (fp.formData?.projectTitle || 'FINANCIAL').toUpperCase().trim();
      
      // Attempt to link to a master project in the map
      let parentProject = null;
      for (let p of projectMap.values()) {
        const pTitle = (p.formData?.projectTitle || p.formData?.titleProject || p.paymentDetails?.title || p.department || '').toUpperCase().trim();
        if (pTitle === fpTitle || p._id === fp.projectId) {
          parentProject = p;
          break;
        }
      }

      if (parentProject) {
        parentProject.hasLinkedPurchase = true;
        parentProject.allLinkedPurchases.push(fp);
        if (!parentProject.linkedPurchaseData) parentProject.linkedPurchaseData = fp;
      } else {
        individualPurchases.push({ ...fp, displayName: fp.formData?.projectTitle || 'Purchase Initiative', allLinkedPurchases: [] });
      }
    });

    const result = Array.from(projectMap.values());
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredProjects]);

  const projectMetrics = [
    { title: 'Total Projects', value: processedProjects.length.toString(), change: 'INITIATIVES', status: 'up', icon: Layers, color: 'emerald' },
    { title: 'Active Projects', value: processedProjects.filter(p => p.status === 'In Progress').length.toString(), change: '+2', status: 'up', icon: Activity, color: 'blue' },
    { title: 'Unassigned', value: processedProjects.filter(p => !p.teamLeadId).length.toString(), change: '-1', status: 'down', icon: Clock, color: 'amber' },
    { title: 'Completion Rate', value: '94.2%', change: '+1.2%', status: 'up', icon: CheckCircle, color: 'slate' },
  ];

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 ring-2 ring-blue-50">
            <ShieldCheck size={10} className="text-blue-400" />
            <span>Project Management Hub</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              {clientIdFilter ? `Projects: ${clientName}` : 'All Projects'}
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping" />
              {clientIdFilter && (
                <button 
                  onClick={() => router.push('/super-admin-dashboard/projects')}
                  className="ml-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                >
                  <X size={14} /> Clear Client Filter
                </button>
              )}
            </h2>
              {clientIdFilter ? `View all active projects for this client` : 'Manage and track all active projects across the organization'}
          </div>
        </div>

        <div className="flex items-center gap-4">
            <Download size={18} className="group-hover:translate-y-1 transition-transform" /> Download Report
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {projectMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['emerald', 'purple', 'amber', 'purple'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Briefcase}
              variant={variants[idx % 4]}
              description="Analytics Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
        <div className="bg-blue-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Project List</h3>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Database of all active projects</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72"
              />
            </div>
            <button className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
              Live Updates
            </button>
          </div>
        </div>

        <div className="p-10 pt-4 space-y-10 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading projects...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="pb-4 px-6">Project Info</th>
                    <th className="pb-4 px-6">Service / Client</th>
                    <th className="pb-4 px-6">Assigned To</th>
                    <th className="pb-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedProjects.map((row, idx) => (
                    <tr
                      key={row._id || idx}
                      className="group cursor-pointer hover:bg-emerald-50/20 transition-all font-sans"
                      onClick={() => {
                        router.push(`/super-admin-dashboard/projects/${row._id}`);
                      }}
                    >
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent group-hover:border-emerald-100 transition-all flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-950 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform border border-white/10">
                          <Briefcase size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{row.uniqueId || 'PROJECT-X'}</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.1em]">{new Date(row.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent transition-all">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-white px-4 py-1.5 rounded-full border border-blue-100 shadow-sm shadow-blue-50">
                          {row.displayName}
                        </span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent transition-all text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-slate-900 uppercase tracking-tight">{row.userId?.name || 'Retail Client'}</span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50/50 px-2 py-0.5 rounded-md self-start">{row.teamLeadId?.name || 'No one assigned yet'}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex items-center justify-end gap-5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(row);
                              setShowProgressModal(true);
                            }}
                            className="p-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-slate-100 hover:border-emerald-200 group-hover:rotate-12"
                            title="Update Progress"
                          >
                            <Activity size={16} />
                          </button>
                          <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-6 py-2 rounded-full border shadow-sm ${row.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' :
                            row.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-blue-50 animate-pulse' :
                              'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50'
                            }`}>
                            {row.status}
                          </span>
                          <button className="p-3 text-slate-300 hover:text-emerald-600 transition-colors bg-white rounded-xl border border-slate-100 hover:border-emerald-200 shadow-sm active:scale-90">
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-[0.4em] border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-blue-600 transition-all">
            Full log of all company projects and work history
          </button>
        </div>
      </div>

      {/* Update Progress Modal */}
      {showProgressModal && selectedProject && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-950 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 border border-white/10">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Update project progress</h3>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{selectedProject.uniqueId}</p>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Progress Description</label>
                  <textarea
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Enter latest project updates here..."
                    className="w-full h-32 bg-slate-50/50 border border-slate-100 rounded-[28px] p-6 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-100 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block italic">Files & Attachments</label>
                  <div className="relative group/upload">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center gap-2 group-hover/upload:border-emerald-300 group-hover/upload:bg-emerald-50/30 transition-all">
                      <Paperclip size={24} className="text-slate-300 group-hover/upload:text-emerald-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Files</p>
                    </div>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[9px] font-black border border-emerald-100 flex items-center gap-2">
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
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isUploading || !progressNotes.trim()}
                    onClick={handleUpdateProgress}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={16} />}
                    {isUploading ? 'Saving...' : 'Save Progress'}
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
