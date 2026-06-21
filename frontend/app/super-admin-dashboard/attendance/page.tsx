'use client';

import React from 'react';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  UserCheck, 
  UserX, 
  UserMinus, 
  Calendar,
  Filter,
  Download,
  Share2,
  X,
  PieChart,
  ClipboardList,
  AlertCircle,
  Briefcase,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  Search,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function AttendancePage() {
  const [attendances, setAttendances] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMonth, setSelectedMonth] = React.useState<string>('');
  const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<any>(null);
  const [updatingRow, setUpdatingRow] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = [];
      if (selectedMonth) queryParams.push(`month=${selectedMonth}`);
      if (selectedYear) queryParams.push(`year=${selectedYear}`);
      const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/attendance/all${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAttendances(response.data.data);
        const present = response.data.data.filter((a: any) => a.status === 'present').length;
        const absent = response.data.data.filter((a: any) => a.status === 'absent').length;
        const leave = response.data.data.filter((a: any) => a.status === 'leave').length;
        const late = response.data.data.filter((a: any) => a.status === 'late').length;
        setSummary({ presentCount: present, absentCount: absent, leaveCount: leave, lateCount: late });
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow?._id) return;
    try {
      setUpdatingRow(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/attendance/${editingRow._id}`, {
        checkOut: editingRow.checkOut,
        status: editingRow.status,
        notes: editingRow.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance record');
    } finally {
      setUpdatingRow(false);
    }
  };

  const filteredAttendances = attendances.filter(a => 
    a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.employeeUniqueId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const attendanceMetrics = [
    { title: 'Present Today', value: summary?.presentCount?.toString() || '0', change: '+0', status: 'up', icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Absent Today', value: summary?.absentCount?.toString() || '0', change: '+0', status: 'down', icon: UserX, color: 'bg-rose-50 text-rose-600' },
    { title: 'On Leave', value: summary?.leaveCount?.toString() || '0', change: '+0', status: 'up', icon: UserMinus, color: 'bg-amber-50 text-amber-600' },
    { title: 'Late Arrivals', value: summary?.lateCount?.toString() || '0', change: '+0', status: 'down', icon: Clock, color: 'bg-indigo-50 text-indigo-600' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <Clock size={10} className="text-indigo-400" />
            <span>Live Attendance</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               Attendance
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Monitor daily attendance, check-in times, and leaves for all staff.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input 
               type="text" 
               placeholder="Search by ID..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-indigo-100 shadow-sm w-48" 
             />
          </div>
          
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Months</option>
            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
          >
            {["2024", "2025", "2026"].map(y => (
                <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button 
            onClick={() => { setSelectedMonth(''); setSelectedYear(new Date().getFullYear().toString()); setSearchQuery(''); }}
            className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
          >
            <X size={14} />
          </button>

          <button className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {attendanceMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['emerald', 'red', 'amber', 'purple'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Clock}
              variant={variants[idx % 4]}
              description="Daily Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Records</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Viewing {attendances.length} records</p>
            </div>
            <div className="flex gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading attendance data...</p>
             </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-4 px-6 font-black text-left">Employee Name</th>
                  <th className="pb-4 px-4 font-black">Position / Dept</th>
                  <th className="pb-4 px-4 font-black">Service</th>
                  <th className="pb-4 px-4 font-black">In / Out Time</th>
                  <th className="pb-4 px-4 font-black">Activity Notes</th>
                  <th className="pb-4 px-6 font-black text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendances.map((row, idx) => (
                  <tr key={row._id || idx} className="group hover:-translate-y-1 transition-all duration-300">
                    <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent group-hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-950 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                              <Users size={16} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{row.employeeName}</span>
                              <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{row.employeeUniqueId}</span>
                          </div>
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 uppercase">{(row.userId?.role || 'N/A').toUpperCase()}</span>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{row.userId?.department || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                       <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{row.userId?.service || 'N/A'}</span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent font-sans">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600">
                            <ArrowUpRight size={10} />
                            {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-rose-600">
                            <ArrowDownRight size={10} />
                            {row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent max-w-xs overflow-hidden">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">
                           {row.notes || 'No notes added'}
                       </span>
                    </td>
                    <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${row.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' : 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100'}`}>
                            {row.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        <button 
                          onClick={() => {
                              setEditingRow(row);
                              setIsEditModalOpen(true);
                          }}
                          className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-100 hover:border-indigo-100 transition-all shadow-sm"
                        >
                           <ShieldCheck size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isEditModalOpen && editingRow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
              <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Edit Attendance Record</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingRow.employeeName} | {editingRow.employeeUniqueId}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-white rounded-full transition-all hover:rotate-90">
                          <X size={20} className="text-slate-400" />
                      </button>
                  </div>
                  <form onSubmit={handleUpdate} className="p-10 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Presence Status</label>
                          <select 
                            value={editingRow.status}
                            onChange={(e) => setEditingRow({...editingRow, status: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none uppercase tracking-widest"
                          >
                              <option value="present">PRESENT</option>
                              <option value="absent">ABSENT</option>
                              <option value="late">LATE</option>
                              <option value="on-leave">ON LEAVE</option>
                              <option value="half-day">HALF-DAY</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Check-out Time</label>
                          <input 
                            type="datetime-local"
                            value={editingRow.checkOut ? new Date(editingRow.checkOut).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setEditingRow({...editingRow, checkOut: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Notes</label>
                          <textarea 
                            rows={3}
                            value={editingRow.notes || ''}
                            onChange={(e) => setEditingRow({...editingRow, notes: e.target.value})}
                            placeholder="Enter notes here..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-[24px] p-6 text-[11px] font-black text-slate-900 outline-none resize-none"
                          />
                      </div>
                      <button 
                        type="submit"
                        disabled={updatingRow}
                        className="w-full py-5 bg-indigo-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group"
                      >
                         {updatingRow ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} className="group-hover:animate-bounce" />}
                         {updatingRow ? 'Saving...' : 'Save Changes'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
