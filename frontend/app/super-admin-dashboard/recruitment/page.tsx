'use client';

import React from 'react';
import { 
  ClipboardList, 
  ArrowUpRight, 
  Search, 
  Users, 
  Calendar,
  Filter,
  Download,
  Briefcase,
  Layers,
  CheckCircle,
  Clock,
  Cpu,
  UserPlus,
  Loader2,
  Trash2,
  Edit3,
  Palette,
  Plus,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import SummaryCard from '../components/SummaryCard';

import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import ThemeCustomizationModal from '../components/ThemeCustomizationModal';

export default function RecruitmentPage() {
  const [data, setData] = React.useState<any>({ vacancies: [], applications: [] });
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
  const [selectedVacancyForEdit, setSelectedVacancyForEdit] = React.useState<any>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const decoded: any = jwtDecode(token);
            setUserRole(decoded.role?.toLowerCase());
        } catch (e) {
            console.error('Error decoding token', e);
        }
    }
  }, []);

  const fetchRecruitment = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/recruitment-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRecruitment();
  }, []);

  const recruitmentStats = [
    { title: 'Open Vacancies', value: data.vacancies.length.toString(), change: '+0', status: 'up', icon: Briefcase, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Total Applicants', value: data.applications.length.toString(), change: '+0', status: 'up', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'New Applications', value: data.applications.filter((a: any) => a.status === 'pending').length.toString(), change: '+0', status: 'up', icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { title: 'Offers Extended', value: data.applications.filter((a: any) => a.status === 'offered').length.toString(), change: '+0', status: 'up', icon: CheckCircle, color: 'bg-rose-50 text-rose-600' },
  ];

  const filteredVacancies = data.vacancies.filter((v: any) => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <UserPlus size={10} className="text-indigo-400" />
            <span>Hiring Dashboard</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4 italic font-serif">
               Hiring
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed italic">Manage job vacancies and review new applications.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input 
               type="text" 
               placeholder="Search for a job..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-indigo-100 shadow-sm w-64 italic" 
             />
          </div>
          {userRole === 'superadmin' && (
            <button 
                onClick={() => setIsThemeModalOpen(true)}
                className="p-4 bg-white border-2 border-slate-100 text-indigo-600 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100/10 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
                <Palette size={18} />
                Change Theme
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2 hover:-translate-y-1 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            Post New Job
          </button>
        </div>
      </div>

      <ThemeCustomizationModal 
        isOpen={isThemeModalOpen} 
        onClose={() => setIsThemeModalOpen(false)} 
        section="HiringSection" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {recruitmentStats.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'amber', 'red'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="Talent Acquisition"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl p-10 space-y-12">
        <div className="flex items-center justify-between border-b border-slate-50 pb-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-serif">Current Job Openings</h3>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100 italic shadow-sm shadow-indigo-50">{data.vacancies.length} active positions</div>
        </div>

        <div className="overflow-x-auto px-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
               <Loader2 className="animate-spin text-indigo-600" size={48} />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse italic">Loading job openings...</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  <th className="pb-4 px-6 font-black">Job Title</th>
                  <th className="pb-4 px-4 font-black">Department</th>
                  <th className="pb-4 px-4 font-black">Posted On</th>
                  <th className="pb-4 px-4 font-black">Application Deadline</th>
                  <th className="pb-4 px-6 font-black text-center">Status</th>
                  <th className="pb-4 px-6 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVacancies.map((row: any, idx: number) => (
                  <tr key={row._id || idx} className="group cursor-pointer">
                    <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-indigo-100 transition-all font-black text-xs text-slate-900 italic uppercase">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-950 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                              <Briefcase size={16} />
                          </div>
                          {row.title}
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{(!row.department || row.department === 'Without Department') ? 'General' : row.department}</span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(row.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                      <span className="text-[10px] font-black text-indigo-600 uppercase italic transition-all group-hover:translate-x-1 inline-block">
                         {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : 'Always Open'}
                      </span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border shadow-sm ${row.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' : 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-50'} italic`}>
                          {row.status || 'Open'}
                      </span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVacancyForEdit(row);
                                setIsModalOpen(true);
                            }}
                            className="p-2 bg-white text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if(confirm('Are you sure you want to delete this vacancy?')) {
                                    try {
                                        const token = localStorage.getItem('token');
                                        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements/${row._id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        fetchRecruitment();
                                    } catch (err: any) { alert(err.response?.data?.message || 'Failed to delete'); }
                                }
                            }}
                            className="p-2 bg-white text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-slate-100"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVacancies.length === 0 && (
                    <tr>
                        <td colSpan={4} className="py-20 text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] italic">No job openings found matching your search</td>
                    </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <button className="w-full py-5 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm italic ring-8 ring-transparent hover:ring-indigo-100/30">
            View detailed recruitment pipeline
        </button>
      </div>

      <CreateAnnouncementModal 
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setSelectedVacancyForEdit(null);
        }}
        onSuccess={fetchRecruitment}
        category="Job Opening"
        initialData={selectedVacancyForEdit}
      />
    </div>
  );
}
