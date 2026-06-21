'use client';

import React from 'react';
import {
  UsersRound,
  Search,
  Download,
  Filter,
  MoreVertical,
  Eye,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Globe,
  ShieldCheck,
  Cpu,
  Loader2,
  Briefcase,
  Layers,
  CheckCircle2,
  Clock,
  PieChart,
  UserCheck,
  X,
  Calendar,
  Zap,
  Dna,
  Plus
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

interface ClientMetric {
  title: string;
  value: string;
  change: string;
  status: 'up' | 'down';
  icon: React.ElementType;
  color: string;
}

export default function ClientsPage() {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setClients(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats: ClientMetric[] = [
    { title: 'Total Clients', value: clients.length.toString(), change: '+4.2%', status: 'up', icon: UsersRound, color: 'bg-indigo-500' },
    { title: 'Total Active Projects', value: clients.reduce((acc, c) => acc + (c.projects?.length || 0), 0).toString(), change: '+12%', status: 'up', icon: Briefcase, color: 'bg-emerald-500' },
    { title: 'New Signups', value: '82%', change: '+5', status: 'up', icon: Layers, color: 'bg-rose-500' },
    { title: 'Active Clients', value: clients.filter(c => c.isActive).length.toString(), change: '100%', status: 'up', icon: UserCheck, color: 'bg-amber-500' },
  ];

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('active') || s.includes('complet')) return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10';
    if (s.includes('review') || s.includes('wait')) return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10';
    return 'bg-slate-50 text-slate-500 border-slate-100 ring-slate-500/10';
  };

  return (
    <div className="space-y-12 pb-20">
      {/* ── Header Strategy Section ───────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 bg-blue-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 ring-4 ring-blue-50 transition-all hover:scale-105 cursor-default">
            <Globe size={12} className="text-blue-400 animate-pulse" />
            <span>Client & Partner Database</span>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-6">
              Clients & Partners
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-4 uppercase tracking-[0.05em] leading-relaxed max-w-2xl">
              Manage and view all your clients and partners in one place.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search for a client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-13 pr-8 py-5 bg-white border-2 border-slate-100 rounded-[32px] text-[11px] font-black uppercase tracking-widest outline-none transition-all focus:ring-8 focus:ring-blue-100/50 focus:border-blue-200 shadow-xl shadow-slate-100 w-[380px]"
            />
          </div>
          <button className="h-16 px-8 bg-blue-950 text-white rounded-[32px] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95 group">
            <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
            Download List
          </button>
        </div>
      </div>

      {/* ── Metrics Grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((metric, i) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'red', 'amber'];
          return (
            <SummaryCard
              key={i}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              status={metric.status}
              icon={metric.icon}
              variant={variants[i % 4]}
              description="Analytics Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
        <div className="bg-blue-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative">
            <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Client List</h3>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Full list of all registered clients</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
              <input
                type="text"
                placeholder="Search client ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm shadow-emerald-200" />
              Live Updates
            </div>
          </div>
        </div>

        <div className="p-10 pt-4 space-y-12 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Loading clients...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black uppercase">Client Info</th>
                    <th className="pb-4 px-4 font-black uppercase">Contact Info</th>
                    <th className="pb-4 px-4 font-black uppercase">Active Projects</th>
                    <th className="pb-4 px-6 font-black text-right uppercase">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/50">
                  {filteredClients.map((row, idx) => (
                    <tr key={row._id || idx} className="group transition-all duration-300">
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-blue-100 transition-all">
                        <div className="flex items-center gap-6">
                          <div className="relative group/avatar">
                            <div className="w-16 h-16 rounded-[24px] bg-blue-950 flex items-center justify-center text-white text-xl font-black shadow-2xl shadow-blue-100 group-hover/avatar:scale-105 group-hover/avatar:rotate-3 transition-all duration-700">
                              {getInitials(row.name)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${row.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight">{row.name}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{row.uniqueId || 'SECURE-ID'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer">
                            <TrendingUp size={12} className="text-blue-400" />
                            <span className="text-[11px] font-bold tracking-tight lowercase">{row.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Globe size={12} className="opacity-40" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{row.phone || row.branch || 'Global Hub'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                        {row.projects && row.projects.length > 0 ? (
                          <div className="flex flex-col gap-3 max-w-[300px]">
                            {row.projects.slice(0, 1).map((proj: any, pIdx: number) => (
                              <div key={pIdx} className="bg-white p-4 rounded-3xl border border-slate-100 group/proj transition-all hover:bg-white hover:shadow-xl hover:shadow-blue-50 hover:border-blue-100 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[10px] font-black text-slate-900 uppercase truncate pr-4">{proj.title || proj.category || 'Project Name'}</span>
                                  <div className={`w-2 h-2 rounded-full animate-pulse ${row.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner font-black">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]`}
                                      style={{ width: `${proj.progress || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-900 tabular-nums">{proj.progress || 0}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-2 h-2 bg-slate-200 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">No projects yet</span>
                          </div>
                        )}
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex items-center justify-end gap-6">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-2xl border border-slate-200 shadow-sm ${row.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} transition-all group-hover:scale-105`}>
                              {row.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                              <ShieldCheck size={10} className="text-emerald-400" /> Account Secure
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedClient(row)}
                            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-xl border border-slate-100 hover:border-blue-100 hover:text-blue-600 transition-all shadow-sm group-hover:rotate-12"
                          >
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
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-blue-600 transition-all tracking-[0.2em]">
            View full client log and history
          </button>
        </div>
      </div>

      {/* ── Client Intelligence Modal ─────────────────────────────────────────── */}
      {selectedClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-blue-950/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-gradient-to-br from-white to-blue-50/30">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-xl shadow-blue-200">
                  {getInitials(selectedClient.name)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{selectedClient.name} Details</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{selectedClient.uniqueId} • Client Profile</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Speed</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight uppercase">Fast Progress</p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                    <Dna size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Projects</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight uppercase">{selectedClient.projects?.length || 0} Projects</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                  <Layers size={12} />
                  Project History
                </h4>
                <div className="space-y-4">
                  {selectedClient.projects?.map((proj: any, idx: number) => (
                    <div key={idx} className="p-6 bg-white border-2 border-slate-50 rounded-[32px] hover:border-blue-100 transition-all group hover:shadow-xl hover:shadow-blue-50/50">
                      <div className="flex items-start justify-between mb-6">
                        <div className="space-y-1">
                          <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{proj.title}</h5>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{proj.projectId}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${getStatusStyle(proj.status)}`}>
                          {proj.status}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={10} />
                            Progress
                          </span>
                          <span className="text-xs font-black text-slate-900">{proj.progress || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.3)]" style={{ width: `${proj.progress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/50 border-t border-slate-50 flex items-center justify-center">
              <button className="px-8 py-4 bg-indigo-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.22em] shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
                Update Client Data
                <ArrowUpRight size={14} className="text-indigo-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
