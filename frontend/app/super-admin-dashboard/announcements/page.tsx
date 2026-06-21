'use client';

import React from 'react';
import {
    Megaphone,
    Search,
    Plus,
    Calendar,
    Clock,
    Download,
    Filter,
    ShieldCheck,
    Loader2,
    Users,
    TrendingUp,
    Info,
    CheckCircle,
    AlertTriangle,
    Trash2,
    Edit3,
    Palette,
    Eye,
    MousePointer2,
    Activity,
    Building
} from 'lucide-react';
import axios from 'axios';

import CreateAnnouncementModal from '../components/CreateAnnouncementModal';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    // SEC: Validate image URLs to prevent XSS via javascript: protocol
    const isSafeUrl = (url: string): boolean => {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
            return false;
        }
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements?category=Announcement`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAnnouncements();
    }, []);

    const filteredAnnouncements = announcements.filter(a =>
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="space-y-12">

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50">
                        <Megaphone size={12} className="text-indigo-400" />
                        <span>Notice Board</span>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                            Internal Announcements
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                        </h2>
                        <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">Share important updates and announcements with all staff</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-600 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Search notices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[28px] text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-8 focus:ring-indigo-100/50 focus:border-indigo-200 shadow-sm w-72"
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-5 bg-rose-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-rose-200 flex items-center gap-3 active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                        Post New Notice
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
                <div className="bg-rose-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Notice History</h3>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Recent updates and important announcements</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm shadow-rose-200" />
                        Live Updates
                    </div>
                </div>

                <div className="p-10 pt-4 space-y-8 flex-1">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-6">
                            <Loader2 className="animate-spin text-rose-600" size={48} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Loading notices...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredAnnouncements.map((item, idx) => (
                                <div key={idx} className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:shadow-rose-50 hover:border-rose-100 group/item flex items-start gap-8 relative overflow-hidden">
                                    <div className="w-20 h-20 bg-rose-600 text-white rounded-[28px] flex items-center justify-center shadow-xl shadow-rose-100 group-hover/item:rotate-12 transition-transform shrink-0">
                                        <Megaphone size={32} />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{item.title}</h4>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{item.category} • {(!item.department || item.department === 'Without Department') ? 'General Notice' : item.department}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock size={10} className="text-rose-400" /> Issued: {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-slate-600 leading-relaxed border-l-4 border-rose-100 pl-6 py-1 whitespace-pre-wrap">
                                            {item.content}
                                        </div>
                                        <div className="pt-4 flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <Users size={10} className="text-indigo-400" /> Visibility: {item.role || 'All Staff'}
                                            </div>
                                            <div className="ml-auto flex items-center gap-3">
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Delete this notice?')) {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements/${item._id}`, {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                fetchAnnouncements();
                                                            } catch (e) { console.error(e); }
                                                        }
                                                    }}
                                                    className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all shadow-sm border border-slate-100 hover:rotate-12"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-rose-600 transition-all tracking-[0.2em]">
                        View all past notices and archives
                    </button>
                </div>
            </div>

            <CreateAnnouncementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                category="Announcement"
                onSuccess={fetchAnnouncements}
            />
        </div>
    );
}
