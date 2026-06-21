'use client';

import React from 'react';
import {
  Briefcase,
  Search,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Download,
  Filter,
  ShieldCheck,
  Loader2,
  Users,
  TrendingUp,
  ArrowUpRight,
  Trash2,
  Edit3,
  Palette
} from 'lucide-react';
import axios from 'axios';

import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import JobApplicationsModal from '../components/JobApplicationsModal';
import ThemeCustomizationModal from '../components/ThemeCustomizationModal';

export default function JobOpeningsPage() {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
  const [selectedJobForApps, setSelectedJobForApps] = React.useState<any>(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = React.useState<any>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements?category=Job Opening`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching job openings:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-cyan-100 ring-2 ring-cyan-50">
            <Briefcase size={10} className="text-cyan-400" />
            <span>Job Openings</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Job Openings
              <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Manage all current job openings and hiring across the company</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="px-6 py-4 bg-white border border-slate-100 text-slate-400 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-cyan-600 transition-all shadow-sm flex items-center gap-2 group"
            >
              <Palette size={18} className="group-hover:rotate-12 transition-transform duration-300" /> Theme
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-4 bg-cyan-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-cyan-100 hover:bg-slate-900 transition-all flex items-center gap-2 group"
            >
              <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Post New Job
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-cyan-600 px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Current Vacancies</h3>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Open Positions: {jobs.length}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
            <input
              type="text"
              placeholder="Search for a job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/50 w-64"
            />
          </div>
        </div>

        <div className="p-10 space-y-10 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-3 py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-cyan-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading job openings...</p>
              </div>
            ) : (
              filteredJobs.map((job, idx) => (
                <div key={job._id || idx} className="group p-8 rounded-[40px] bg-slate-50/50 hover:bg-white border border-transparent hover:border-cyan-100 transition-all shadow-sm hover:shadow-2xl hover:shadow-cyan-100/40 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-indigo-950 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                      <Briefcase size={24} />
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${job.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      {job.status}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight line-clamp-2">{job.jobTitle || job.title}</h4>
                      <p className="text-[10px] font-bold text-cyan-500 mt-1 uppercase tracking-[0.2em]">{(!job.department || job.department === 'Without Department') ? 'General' : job.department}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <MapPin size={12} className="text-cyan-600" /> {job.location || 'Remote'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Users size={12} className="text-cyan-600" /> {job.applicationsCount || 0} Applicants
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Priority</span>
                        <span className={`text-[10px] font-black ${job.priority === 'Urgent' ? 'text-rose-600' : 'text-slate-900'}`}>{job.priority || 'Medium'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedJobForApps(job)}
                          className="px-4 py-2 bg-cyan-50 text-cyan-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
                        >
                          Applicants
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this job opening?')) {
                              try {
                                const token = localStorage.getItem('token');
                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements/${job._id}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                fetchJobs();
                              } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
                            }
                          }}
                          className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedJobForEdit(job);
                            setIsModalOpen(true);
                          }}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-cyan-600 hover:text-white transition-all shadow-sm"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm ring-4 ring-transparent hover:ring-cyan-100">
            View full hiring history and archived jobs
          </button>
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJobForEdit(null);
        }}
        category="Job Opening"
        onSuccess={fetchJobs}
        initialData={selectedJobForEdit}
      />

      {selectedJobForApps && (
        <JobApplicationsModal
          job={selectedJobForApps}
          onClose={() => setSelectedJobForApps(null)}
        />
      )}

      <ThemeCustomizationModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        section="HiringSection"
      />
    </div>
  );
}
