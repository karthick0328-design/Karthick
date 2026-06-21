'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Video,
    Plus,
    Users,
    Calendar,
    Clock,
    ExternalLink,
    Loader2,
    Search,
    User as UserIcon,
    PlayCircle,
    Download,
    RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Member {
    _id: string;
    name: string;
    email: string;
    uniqueId: string;
    role: string;
    service: string;
}

interface Recording {
    url: string;
    startedAt: string;
    endedAt?: string;
}

interface Meeting {
    _id: string;
    title: string;
    description: string;
    startTime: string;
    meetingCode: string;
    meetingLink: string;
    status: string;
    service: string;
    managerId: { name: string };
    recordings?: Recording[];
}

interface MeetingDashboardProps {
    serviceName?: string;
    departmentName?: string;
}

const MeetingDashboard: React.FC<MeetingDashboardProps> = ({ serviceName, departmentName }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startTime, setStartTime] = useState('');
    const [showForm, setShowForm] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            const encodedService = serviceName ? encodeURIComponent(serviceName) : '';
            const encodedDept = departmentName ? encodeURIComponent(departmentName) : '';

            const baseUrl = serviceName
                ? `${backendUrl}/api/meetings/service-members/${encodedService}`
                : `${backendUrl}/api/meetings/service-members/${encodedDept}?type=department`;

            const meetingsUrl = serviceName
                ? `${backendUrl}/api/meetings?service=${encodedService}`
                : `${backendUrl}/api/meetings?department=${encodedDept}`;

            const [membersRes, meetingsRes] = await Promise.all([
                axios.get(baseUrl, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(meetingsUrl, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (membersRes.data.success) setMembers(membersRes.data.data);
            if (meetingsRes.data.success) setMeetings(meetingsRes.data.data);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            if (!silent) toast.error(error.response?.data?.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [serviceName, departmentName, backendUrl]);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30s to pick up newly uploaded recordings
        refreshIntervalRef.current = setInterval(() => fetchData(true), 30000);
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [fetchData]);

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            const payload: any = { title, description, startTime };
            if (serviceName) payload.service = serviceName;
            if (departmentName) payload.department = departmentName;

            const res = await axios.post(`${backendUrl}/api/meetings`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success('Meeting created successfully!');
                setShowForm(false);
                setTitle('');
                setDescription('');
                setStartTime('');
                fetchData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create meeting');
        } finally {
            setCreating(false);
        }
    };

    const filteredMembers = members.filter(member =>
        (member.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (member.uniqueId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {serviceName ? 'Service Meetings' : 'Department Meetings'}
                    </h1>
                    <p className="text-slate-500 font-medium">Manage and schedule meetings for {serviceName || departmentName}</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        Create New Meeting
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Create Meeting Form */}
                    {showForm && (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Video className="text-indigo-600" />
                                    Schedule Meeting
                                </h2>
                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                                    Cancel
                                </button>
                            </div>
                            <form onSubmit={handleCreateMeeting} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Meeting Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            required
                                            placeholder="e.g., Weekly Team Sync"
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            required
                                            className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="What is this meeting about?"
                                        rows={2}
                                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>

                                {/* Members Preview in Form */}
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={14} className="text-indigo-600" />
                                            Direct Invitations ({members.length})
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                                            Automatic
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                        {members.map(member => (
                                            <div key={member._id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-indigo-200 group">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-xs truncate leading-tight">{member.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{member.uniqueId} • {member.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {members.length === 0 && (
                                            <div className="col-span-full py-8 text-center bg-white/50 rounded-2xl border border-dashed border-slate-200">
                                                <Users className="mx-auto text-slate-300 mb-2 opacity-50" size={24} />
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No members found</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium italic text-center">
                                        * These members will receive real-time notifications when the meeting is scheduled.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    {creating ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                    Schedule & Send Invitations
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Meetings List */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="text-indigo-600" />
                                Meetings &amp; Recordings
                            </h2>
                            <button
                                onClick={() => fetchData(true)}
                                disabled={refreshing}
                                title="Refresh to see new recordings"
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors px-3 py-2 rounded-xl hover:bg-indigo-50"
                            >
                                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                {refreshing ? 'Refreshing…' : 'Refresh'}
                            </button>
                        </div>

                        {meetings.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                <Video className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500 font-medium">No meetings scheduled yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {meetings.map(meeting => {
                                    const realRecordings = (meeting.recordings || []).filter(r => r.url && !r.url.startsWith('#'));
                                    return (
                                        <div key={meeting._id} className="group p-6 rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-extrabold text-slate-900 text-lg">{meeting.title}</h3>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${meeting.status === 'scheduled' ? 'bg-amber-50 text-amber-600' :
                                                            meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                                                'bg-indigo-50 text-indigo-600'
                                                            }`}>
                                                            {meeting.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 text-sm font-medium line-clamp-1">{meeting.description || 'No description'}</p>
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-bold">
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                                                            <Clock size={14} className="text-indigo-500" />
                                                            {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                                                            <Calendar size={14} className="text-indigo-500" />
                                                            {new Date(meeting.startTime).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                                                            <UserIcon size={14} className="text-indigo-500" />
                                                            Host: {meeting.managerId?.name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <a
                                                        href={`/meeting/${meeting.meetingCode}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-6 py-3 rounded-2xl font-bold transition-all group-hover:scale-105 active:scale-95"
                                                    >
                                                        Join Meeting
                                                        <ExternalLink size={16} />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Recordings Section */}
                                            {realRecordings.length > 0 ? (
                                                <div className="mt-6 pt-6 border-t border-slate-50">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <PlayCircle size={14} className="text-indigo-500" />
                                                        Session Recordings ({realRecordings.length})
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {realRecordings.map((rec, idx) => {
                                                            const fileUrl = rec.url.startsWith('/') ? `${backendUrl}${rec.url}` : rec.url;
                                                            return (
                                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                                            <Video size={14} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-slate-700">Recording #{idx + 1}</p>
                                                                            <p className="text-[9px] text-slate-400">{rec.startedAt ? new Date(rec.startedAt).toLocaleString() : '—'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                                            className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            title="Play/View">
                                                                            <PlayCircle size={14} />
                                                                        </a>
                                                                        <a href={fileUrl} download
                                                                            className="p-2 bg-white text-slate-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                            title="Download">
                                                                            <Download size={14} />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 pt-4 border-t border-slate-50">
                                                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                        <Video size={12} className="text-slate-300" />
                                                        No recording yet. To record: join as host → click the red{' '}
                                                        <span className="inline-flex items-center gap-1 font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg mx-1">
                                                            ● RECORD
                                                        </span>{' '}
                                                        button → select your screen → click STOP REC when done.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Members List */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Users className="text-indigo-600" size={20} />
                                Service Members
                            </h2>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-1 rounded-lg font-black">{members.length}</span>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredMembers.map(member => (
                                <div key={member._id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shrink-0">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{member.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{member.uniqueId} • {member.role}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
                                    </div>
                                </div>
                            ))}
                            {filteredMembers.length === 0 && (
                                <p className="text-center py-8 text-slate-400 text-sm font-medium">No members found</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default MeetingDashboard;
