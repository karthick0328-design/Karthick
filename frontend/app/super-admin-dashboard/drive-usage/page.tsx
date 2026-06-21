'use client';

import React from 'react';
import {
  Cloud,
  ArrowUpRight,
  ArrowDownRight,
  HardDrive,
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
  Search,
  Server,
  Loader2,
  ImageIcon,
  FileText
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function DriveUsagePage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [quotaData, setQuotaData] = React.useState<any>(null);
  const [usersList, setUsersList] = React.useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<string>('user');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const [resClients, resInternal] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/clients?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=1000`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const clients = resClients.data?.data || [];
      const internal = resInternal.data?.data || [];
      const allUsers = [...clients, ...internal];
      setUsersList(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let queryParams = '';
      if (selectedUserId) queryParams = `?userId=${selectedUserId}`;
      else if (selectedRole) queryParams = `?role=${selectedRole}`;

      // Fetch categories
      const resUsage = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/drive/usage${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resUsage.data.success) {
        setData(resUsage.data.data);
      }

      // Fetch quota & history
      const resQuota = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/drive/quota${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resQuota.data.success) {
        setQuotaData(resQuota.data.data);
      }
    } catch (error) {
      console.error('Error fetching drive usage:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  React.useEffect(() => {
    fetchUsage();
  }, [selectedUserId, selectedRole]);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const driveMetrics = [
    { title: 'Total Usage', value: quotaData ? formatSize(quotaData.used) : '0 B', change: '+0', status: 'up', icon: Cloud, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Remaining Space', value: quotaData ? formatSize(quotaData.remaining) : '0 B', change: '+0', status: 'up', icon: HardDrive, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Global Sync Health', value: '99.9%', change: '+0.1%', status: 'up', icon: Globe, color: 'bg-rose-50 text-rose-600' },
    { title: 'Total Capacity', value: quotaData ? formatSize(quotaData.totalLimit) : '10.0 TB', change: '8.2 Reserved', status: 'up', icon: Database, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <HardDrive size={10} className="text-indigo-400" />
            <span>Core Storage Surveillance</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Cloud Drive Intelligence
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">System-wide cloud storage monitoring and multi-service individual unit surveillance</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-6 py-4 bg-white border border-slate-100 rounded-[24px] text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none shadow-sm hover:shadow-lg transition-all focus:ring-4 focus:ring-indigo-100 italic"
          >
            <option value="">All Users (Role: User)</option>
            {usersList.filter(u => u.role === 'user').map(u => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>

          <button className="px-6 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2 hover:-translate-y-1 active:scale-95 group">
            <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" /> Allocate Core Storage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {driveMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'red', 'amber'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || HardDrive}
              variant={variants[idx % 4]}
              description="Analytics Update"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start pb-20">
        {/* Category Breakdown */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-6 transition-all duration-700">
            <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Resource Classification</h3>
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Storage Distribution by Logic Unit</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner border border-indigo-100">
                    <PieChart size={20} />
                </div>
            </div>

            <div className="space-y-6">
                {!data || !data.categories || data.categories.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                        <Database size={48} className="mx-auto mb-4" />
                        <p className="font-black uppercase tracking-[0.3em]">Sector Empty</p>
                    </div>
                ) : (
                    data.categories.map((cat: any, idx: number) => {
                        const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
                        const percentage = data.total > 0 ? (cat.totalSize / data.total) * 100 : 0;
                        return (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors uppercase italic">{cat._id || 'General Assets'}</span>
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">{cat.fileCount} Objects Locked</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 border-b-2 border-indigo-500 pb-0.5">{formatSize(cat.totalSize)}</span>
                                </div>
                                <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 flex p-0.5 relative group-hover:bg-indigo-50/30 transition-colors">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(0,0,0,0.15)] ${colors[idx % colors.length]}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>

        {/* Sync History / Audit Log */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-0 flex flex-col overflow-hidden h-[600px] animate-in fade-in slide-in-from-bottom-8 transition-all duration-1000">
            <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                   <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-900/40">
                       <Activity size={20} />
                   </div>
                   <h3 className="text-xl font-black uppercase tracking-tight">Transmission Log</h3>
                </div>
                <div className="flex items-center gap-3">
                   <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-900">Encrypted</div>
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 scrollbar-hide flex-1 bg-slate-50/10">
                {!quotaData || !quotaData.history || quotaData.history.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <Clock size={32} className="mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest">Awaiting Transmissions...</p>
                    </div>
                ) : (
                    quotaData.history.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 group cursor-default p-4 rounded-3xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100">
                            <div className="relative flex flex-col items-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                                   {item.mimetype?.includes('image') ? <ImageIcon size={18} /> : item.mimetype?.includes('pdf') ? <FileText size={18} /> : <Server size={18} />}
                                </div>
                                {idx !== quotaData.history.length - 1 && (
                                    <div className="w-px flex-1 bg-slate-200 mt-2" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex flex-col">
                                        <h4 className="text-[13px] font-black text-slate-900 truncate pr-4 group-hover:text-indigo-600 transition-colors uppercase leading-none">{item.filename || item.originalName || 'System Asset'}</h4>
                                        <span className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic">{item.mimetype || 'binary/octet-stream'}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter shrink-0">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-[9px] font-bold text-indigo-600">ID</div>
                                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{item.userId?.name || 'Identity Unknown'}</p>
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{item.category || 'General'}</p>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] font-black text-white bg-slate-950 px-3 py-1 rounded-xl shadow-lg shadow-slate-200 uppercase tracking-widest">{formatSize(item.size)}</div>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase italic">
                                            <ShieldCheck size={10} /> Verified
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (item.path && item.path.startsWith('/')) {
                                                window.open(`${process.env.NEXT_PUBLIC_API_URL}${item.path}`, '_blank');
                                            }
                                        }}
                                        className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1 transition-colors group/btn"
                                    >
                                        View Source <ArrowUpRight size={10} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
