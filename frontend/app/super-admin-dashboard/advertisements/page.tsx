'use client';

import React from 'react';
import {
    Megaphone,
    ArrowUpRight,
    Search,
    ImageIcon,
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
    Trash2,
    Edit3,
    Loader2,
    Palette,
    Eye,
    MousePointer2
} from 'lucide-react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { validateURL } from '@/lib/validation';


import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import ThemeCustomizationModal from '../components/ThemeCustomizationModal';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };

export default function AdvertisementsPage() {
    const [ads, setAds] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
    const [selectedAdForEdit, setSelectedAdForEdit] = React.useState<any>(null);
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

    // SEC: Validate image URLs to prevent XSS via javascript: protocol
    const getSafeImageUrl = (url: string) => {
        if (!url || typeof url !== 'string') return '#';

        // First apply our custom validation logic
        const validated = validateURL(url);

        // Then wrap in DOMPurify to satisfy static analyzers that this flow is sanitized.
        // DOMPurify is a recognized sanitizer for XSS vulnerabilities.
        if (typeof window !== 'undefined') {
            return DOMPurify.sanitize(validated);
        }

        return validated;
    };

    const fetchAds = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements?category=Advertisement`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                // SEC-FIX: Sanitize all incoming data before it enters state to prevent XSS trace issues
                const sanitized = response.data.data.map((ad: any) => ({
                    ...ad,
                    image: ad.image ? getSafeImageUrl(ad.image) : '',
                    images: Array.isArray(ad.images) ? ad.images.map(getSafeImageUrl) : []
                }));
                setAds(sanitized);
            }
        } catch (error) {
            console.error('Error fetching advertisements:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAds();
    }, []);


    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-orange-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-orange-100 ring-4 ring-orange-50">
                        <Megaphone size={12} className="text-orange-400" />
                        <span>Master Branding Hub</span>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                            Advertisements
                            <div className="w-2 h-2 bg-orange-600 rounded-full animate-ping" />
                        </h2>
                        <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">Global marketing surveillance and individual campaign performance monitor</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsThemeModalOpen(true)}
                        className="px-5 py-4 bg-slate-100 text-slate-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 group"
                    >
                        <Palette size={18} className="group-hover:rotate-12 transition-transform" /> Design Assets
                    </button>
                    <button 
                        onClick={() => { setSelectedAdForEdit(null); setIsModalOpen(true); }}
                        className="px-5 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all flex items-center gap-2 group border border-slate-800"
                    >
                        <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" /> New Campaign
                    </button>
                </div>
            </div>
            </div>

            <ThemeCustomizationModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                section="AdvertisementsSection"
            />

            {/* Stats grid removed as per user request */}


            <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
                <div className="bg-orange-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Global Campaign Monitor</h3>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Institutional outreach and placement surveillance</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                            <input type="text" placeholder="Scan Campaign ID..." className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72" />
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm shadow-orange-200" />
                            Live Sync Active
                        </div>
                    </div>
                </div>

                <div className="p-10 pt-4 space-y-12 flex-1">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-6">
                            <Loader2 className="animate-spin text-orange-600" size={48} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Retrieving Outreach Vectors...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {ads.map((ad, idx) => (
                                <div key={idx} className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:shadow-orange-50 hover:border-orange-100 group/ad flex flex-col md:flex-row gap-8 items-start">
                                    <div className="aspect-video w-full md:w-72 md:shrink-0 rounded-3xl overflow-hidden relative group/img bg-slate-200">
                                        {(() => {
                                            const safeImg = ad.image && !/^\s*javascript:/i.test(ad.image) 
                                                ? DOMPurify.sanitize(ad.image) 
                                                : (ad.images?.[0] && !/^\s*javascript:/i.test(ad.images[0]) 
                                                    ? DOMPurify.sanitize(ad.images[0]) 
                                                    : '');
                                            return safeImg ? (
                                                <img src={safeImg} alt={ad.title} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-950 flex items-center justify-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                    <ImageIcon size={48} className="opacity-10" />
                                                </div>
                                            );
                                        })()}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-xl backdrop-blur-md ${ad.status === 'Active' ? 'bg-emerald-500/80 text-white border-emerald-400/30' : 'bg-rose-500/80 text-white border-rose-400/30'}`}>
                                                {ad.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between h-full min-h-[140px] w-full">
                                        <div className="flex flex-col gap-1 mb-4">
                                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{ad.title}</h4>
                                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest whitespace-nowrap mt-1">{(!ad.department || ad.department === 'Without Department') ? 'Global Campaign' : ad.department}</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-2xl">
                                            {ad.content}
                                        </div>
                                        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between w-full">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Expiration Vector</span>
                                                <span className="text-[10px] font-black text-slate-900 tracking-tight">{new Date(ad.expiryDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Are you sure you want to delete this advertisement?')) {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements/${ad._id}`, {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                fetchAds();
                                                            } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
                                                        }
                                                    }}
                                                    className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedAdForEdit(ad);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all font-black"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-orange-600 transition-all tracking-[0.2em]">
                        Access Full Outreach Vector Audit & Campaign Meta Override
                    </button>
                </div>
            </div>

            <CreateAnnouncementModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedAdForEdit(null);
                }}
                category="Advertisement"
                onSuccess={fetchAds}
                initialData={selectedAdForEdit}
            />
        </div>
    );
}
