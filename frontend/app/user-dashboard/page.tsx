'use client';
import { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Briefcase,
  Eye,
  Play,
  Zap,
  ArrowRight,
  Plus,
  Filter,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface RecentProject {
  id: string;
  uniqueId: string;
  name: string;
  department: string;
  status: string;
  rawStatus: string;
  deadline: string;
  progress: number;
}

const UserDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, overdue: 0 });

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { window.location.href = '/Login/Signin'; return; }
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decoded: any = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          window.location.href = '/Login/Signin';
          return;
        }
        await fetchProjects(token);
      } catch {
        localStorage.removeItem('token');
        window.location.href = '/Login/Signin';
      }
    };
    init();
  }, []);

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/my-projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      if (data.success && data.data) {
        const projects = data.data;

        const calcProgress = (p: any) => {
          const explicitProgress = parseInt(p.projectProgress || '');
          if (!isNaN(explicitProgress)) {
            return Math.min(Math.max(explicitProgress, 0), 100);
          }
          const status = p.status;
          if (status === 'Draft') return 10;
          if (status === 'Submitted') return 25;
          if (status === 'Under Review') return 50;
          if (status === 'In Progress') return 75;
          if (status === 'Completed') return 100;
          return 0;
        };

        const getTitle = (p: any) => {
          if (p.paymentDetails?.title) return p.paymentDetails.title;
          const titleFields: Record<string, string> = {
            'Drug Discovery': 'titleProject', 'NGS': 'sampleName',
            'Software Development': 'projectName', 'Microbiology': 'sampleName',
            'Biochemistry and Molecular Biology': 'sampleName',
          };
          if (p.formData && p.department) {
            const key = titleFields[p.department];
            if (key && p.formData[key]) return p.formData[key];
          }
          return p.category || 'Untitled Project';
        };

        const mapped: RecentProject[] = projects.map((p: any) => ({
          id: p._id,
          uniqueId: p.uniqueId,
          name: getTitle(p),
          department: p.department,
          rawStatus: p.status,
          status: (p.status || 'draft').toLowerCase().replace(/ /g, '-'),
          deadline: p.submittedAt
            ? new Date(p.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            : 'N/A',
          progress: calcProgress(p),
        }));

        setRecentProjects(mapped);
        setStats({
          total: projects.length,
          active: projects.filter((p: any) => ['In Progress', 'Under Review', 'Submitted'].includes(p.status)).length,
          completed: projects.filter((p: any) => p.status === 'Completed').length,
          overdue: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle };
      case 'in-progress': return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: Play };
      case 'under-review': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Eye };
      case 'submitted': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: Clock };
      default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', icon: FileText };
    }
  };

  const getBarColor = (progress: number) => {
    if (progress === 100) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
    if (progress >= 75) return 'bg-gradient-to-r from-indigo-400 to-indigo-600';
    if (progress >= 50) return 'bg-gradient-to-r from-amber-400 to-amber-500';
    return 'bg-gradient-to-r from-slate-300 to-slate-400';
  };

  const getBarTextColor = (progress: number) => {
    if (progress === 100) return 'text-emerald-600';
    if (progress >= 50) return 'text-indigo-600';
    return 'text-amber-500';
  };

  const filteredProjects = recentProjects.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-2xl animate-spin shadow-xl mb-6" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading Projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Projects', value: stats.total, icon: Briefcase, bg: 'bg-indigo-600', iconBg: 'bg-white/20' },
          { label: 'Active', value: stats.active, icon: Zap, bg: 'bg-teal-600', iconBg: 'bg-white/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, bg: 'bg-emerald-600', iconBg: 'bg-white/20' },
          { label: 'Alerts', value: stats.overdue, icon: AlertTriangle, bg: 'bg-fuchsia-600', iconBg: 'bg-white/20' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 120 }}
            className={`${s.bg} rounded-2xl p-6 shadow-xl shadow-slate-200/50 flex items-center gap-4 group hover:scale-[1.02] transition-all relative overflow-hidden`}
          >
            <div className={`w-12 h-12 ${s.iconBg} text-white rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight leading-none">{s.value}</p>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        ))}
      </div>

      {/* Project List */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">

        {/* Table Header */}
        <div className="px-8 py-6 bg-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md border border-white/10 shadow-lg">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">My Projects</h2>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{filteredProjects.length} records found</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto relative z-10">
            {/* Search */}
            <div className="relative group flex-1 sm:flex-none w-full sm:w-60">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white placeholder:text-slate-500 focus:ring-4 focus:ring-white/10 focus:bg-white/10 outline-none transition-all"
              />
            </div>
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-11 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white focus:ring-4 focus:ring-white/10 outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Status</option>
                <option value="draft" className="bg-slate-900">Draft</option>
                <option value="submitted" className="bg-slate-900">Submitted</option>
                <option value="under-review" className="bg-slate-900">Under Review</option>
                <option value="in-progress" className="bg-slate-900">In Progress</option>
                <option value="completed" className="bg-slate-900">Completed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/30 mx-6 my-6 rounded-[2rem] border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
              <FileText className="w-9 h-9 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Projects Found</h3>
            <p className="text-slate-400 font-bold text-sm mb-8">
              {searchTerm ? 'Try adjusting your search.' : 'Create your first project to get started.'}
            </p>
            {!searchTerm && (
              <Link
                href="/user-dashboard/Project/new-project"
                className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-2xl shadow-slate-200 group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                Create Project
              </Link>
            )}
          </div>
        ) : (
          /* Scrollable table — scrollbar on right side */
          <div className="max-h-[520px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800">
                  {['Project', 'Department', 'Status', 'Submitted', 'Action'].map(col => (
                    <th key={col} className="px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap border-b border-white/5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredProjects.map((project, idx) => {
                    const style = getStatusStyle(project.status);
                    const StatusIcon = style.icon;
                    return (
                      <motion.tr
                        key={project.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors group"
                      >
                        {/* Project */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-100/60">
                              <Briefcase className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate max-w-[200px] group-hover:text-indigo-600 transition-colors">{project.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{project.uniqueId}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-6 py-5">
                          <span className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            {project.department}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${style.bg} ${style.text} ${style.border}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {project.rawStatus}
                          </span>
                        </td>

                        {/* Submitted */}
                        <td className="px-6 py-5">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{project.deadline}</p>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-5">
                          <Link
                            href={`/user-dashboard/Project/${project.id}/view`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all group/btn whitespace-nowrap"
                          >
                            View
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;