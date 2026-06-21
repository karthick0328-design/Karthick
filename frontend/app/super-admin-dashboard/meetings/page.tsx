'use client';

import React from 'react';
import {
  Video,
  Users,
  Calendar,
  Globe,
  Search,
  Zap,
  Monitor,
  Loader2,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function MeetingsPage() {
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/meetings/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setMeetings(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const ongoingMeetings = meetings.filter(m => m.status === 'ongoing').length;
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled').length;

  const meetingStats = [
    { title: 'Global Live', value: ongoingMeetings.toString(), change: '+0', status: 'up', icon: Zap, color: 'indigo' },
    { title: 'Total Scheduled', value: scheduledMeetings.toString(), change: '+0', status: 'up', icon: Calendar, color: 'emerald' },
    { title: 'Total Meetings', value: meetings.length.toString(), change: '+0', status: 'up', icon: Globe, color: 'amber' },
    { title: 'Units Engaged', value: '6', change: '0', status: 'up', icon: Monitor, color: 'rose' },
  ];

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <Video size={10} className="text-indigo-400" />
            <span>Master Communication Sync</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Meetings Hub
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Global communication surveillance and multi-service meeting monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-5 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2 group">
            <Download size={14} className="group-hover:translate-y-1 transition-transform" /> Comms Log XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {meetingStats.map((item, idx) => {
          const variants: ('purple' | 'emerald' | 'amber' | 'red')[] = ['purple', 'emerald', 'amber', 'red'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon}
              variant={variants[idx % 4]}
              description="Communication Sync"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Active Room Surveillance</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cross-unit Communication Cycle Analytics</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Scan Active Sessions..." className="pl-10 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-indigo-500 text-white placeholder:text-slate-600 w-72" />
            </div>
            <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Live Rooms</span>
            </div>
          </div>
        </div>

        <div className="p-10 pt-4 space-y-10 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving Global Comms Sync...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black">Meeting Module</th>
                    <th className="pb-4 px-6 font-black text-center">Lead Host</th>
                    <th className="pb-4 px-6 text-center">Participants</th>
                    <th className="pb-4 px-6 text-right font-black">Lifecycle Status</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((row, idx) => (
                    <tr key={row._id || idx} className="group">
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-indigo-100 transition-all">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{row.title}</span>
                          <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Room-{row.meetingCode} | {row.service || row.department || 'General Sync'}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent text-center transition-all">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-tight">{row.managerId?.name || 'Automated Node'}</span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent text-center transition-all font-black">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-lg">
                          <Users size={14} className="text-indigo-400" />
                          <span className="text-sm font-black text-slate-900">{row.participants?.length || 0}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border shadow-sm ${row.status === 'ongoing' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse shadow-emerald-50' : row.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {row.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm ring-8 ring-transparent hover:ring-indigo-100/30">
            Access Full Communication Archive & Transcripts Hub
          </button>
        </div>
      </div>
    </div>
  );
}
