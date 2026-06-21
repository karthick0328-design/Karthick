'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    UsersRound,
    Briefcase,
    ShieldAlert,
    Monitor,
    HardDrive,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Layers,
    Clock,
    CheckCircle,
    AlertCircle,
    Cpu,
    Zap,
    Globe,
    RefreshCw,
    BookOpen,
    BarChart2,
    Loader2,
    IndianRupee,
    ChevronRight,
    Wallet
} from 'lucide-react';
import SummaryCard from './components/SummaryCard';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatCard {
    title: string;
    value: string;
    change: number;
    icon: string;
    color: string;
    description: string;
}

interface RecentActivity {
    id: string;
    user: string;
    action: string;
    time: string;
    type: 'info' | 'success' | 'warning' | 'error';
    avatar: string;
}

interface Project {
    _id?: string;
    projectId?: string;
    name?: string;
    title?: string;
    department?: string;
    status?: string;
    category?: string;
    progress?: number;
    createdAt?: string;
}

interface OverviewSummary {
    totalMembers: string;
    totalUsers: string;
    totalProjects: string;
    totalRevenue?: string;
    expectedRevenue?: string;
    remainingAmount?: string;
    revenuePercentage?: number | string;
    completionRate?: string;
}

interface DashboardData {
    stats: StatCard[];
    statsData?: StatCard[];   // backward compat alias from backend
    recentActivities: RecentActivity[];
    projects?: Project[];
    overview?: OverviewSummary;
    lineGraphData?: { date: string; value: number }[];
}

// ─── Icon map ──────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
    Users,
    UsersRound,
    Briefcase,
    DollarSign,
    TrendingUp,
    TrendingDown,
    BookOpen,
    BarChart2,
    Monitor,
    HardDrive,
    CreditCard,
    Clock,
    CheckCircle,
    AlertCircle,
    Activity,
    Layers,
    Zap,
    IndianRupee
};

function getIconComponent(iconName: string): React.ElementType {
    return iconMap[iconName] || Activity;
}

// ─── Fix garbled ₹ symbol (UTF-8 mojibake) ────────────────────────────────────
function fixCurrencyValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Replace common UTF-8 mojibake patterns for ₹ (U+20B9)
    return str
        .replace(/â‚¹/g, '\u20B9')
        .replace(/â,/g, '\u20B9')
        .replace(/â€¹/g, '\u20B9')
        .replace(/â\x82\xB9/g, '\u20B9');
}

// ─── Status badge helper ───────────────────────────────────────────────────────
// ─── Status badge helper ───────────────────────────────────────────────────────
function getStatusStyles(status: string) {
    const s = (status || '').toLowerCase();
    if (s.includes('complet') || s.includes('done') || s.includes('approved'))
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (s.includes('progress') || s.includes('ongoing') || s.includes('active') || s.includes('scope'))
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    if (s.includes('pending') || s.includes('review') || s.includes('analyzing'))
        return 'bg-amber-50 text-amber-700 border-amber-100';
    if (s.includes('cancel') || s.includes('reject') || s.includes('fail'))
        return 'bg-rose-50 text-rose-700 border-rose-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
}

// ─── Stat colour helper ────────────────────────────────────────────────────────
function getCardAccent(color: string) {
    const c = (color || '').toLowerCase();
    if (c.includes('blue')) return {
        icon: 'text-blue-600 bg-blue-50',
        accent: 'border-blue-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-blue-500/10'
    };
    if (c.includes('green') || c.includes('emerald')) return {
        icon: 'text-emerald-600 bg-emerald-50',
        accent: 'border-emerald-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-emerald-500/10'
    };
    if (c.includes('purple') || c.includes('indigo')) return {
        icon: 'text-indigo-600 bg-indigo-50',
        accent: 'border-indigo-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-indigo-500/10'
    };
    if (c.includes('orange') || c.includes('amber') || c.includes('yellow')) return {
        icon: 'text-amber-600 bg-amber-50',
        accent: 'border-amber-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-amber-500/10'
    };
    if (c.includes('rose') || c.includes('red')) return {
        icon: 'text-rose-600 bg-rose-50',
        accent: 'border-rose-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-rose-500/10'
    };
    return {
        icon: 'text-slate-600 bg-slate-50',
        accent: 'border-slate-500',
        bg: 'bg-white',
        shadow: 'hover:shadow-slate-500/10'
    };
}

// ─── Activity dot ─────────────────────────────────────────────────────────────
function ActivityDot({ type }: { type: string }) {
    const colours: Record<string, string> = {
        success: 'bg-emerald-500 ring-emerald-100',
        info: 'bg-indigo-500 ring-indigo-100',
        warning: 'bg-amber-500 ring-amber-100',
        error: 'bg-rose-500 ring-rose-100',
    };
    return <div className={`w-2.5 h-2.5 rounded-full ring-4 ${colours[type] || colours.info}`} />;
}

// ─── Simple Bar Chart ────────────────────────────────────────────────────────
function SimpleBarChart({ data }: { data: { date: string; value: number }[] }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    if (!data || data.length === 0) return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <BarChart2 size={24} className="opacity-20" />
            <span className="text-xs font-medium">No activity data</span>
        </div>
    );

    const maxVal = Math.max(...data.map(d => d.value || 0));
    const max = (maxVal > 0 ? maxVal : 1) * 1.2;

    const formatXDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="relative h-full w-full flex flex-col" onMouseLeave={() => setHoveredIdx(null)}>
            {/* Tooltip */}
            {hoveredIdx !== null && data[hoveredIdx] && (
                <div
                    className="absolute z-30 transition-all duration-200 pointer-events-none"
                    style={{
                        left: `${(hoveredIdx / Math.max(data.length - 1, 1)) * 100}%`,
                        top: '0',
                        transform: 'translate(-50%, -100%) translateY(-8px)'
                    }}
                >
                    <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-700">
                        {data[hoveredIdx].value} · {formatXDate(data[hoveredIdx].date)}
                    </div>
                </div>
            )}

            <div className="flex-1 flex items-end gap-1.5 px-1 relative">
                {/* Horizontal lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-5">
                    <div className="w-full border-t border-slate-900"></div>
                    <div className="w-full border-t border-slate-900"></div>
                    <div className="w-full border-t border-slate-900"></div>
                </div>

                {data.map((d, i) => {
                    const height = (d.value / maxVal) * 100;
                    return (
                        <div
                            key={i}
                            className="flex-1 flex justify-center items-end h-full relative group cursor-crosshair"
                            onMouseEnter={() => setHoveredIdx(i)}
                        >
                            <div
                                className={`w-full rounded-t-sm transition-all duration-300 ${hoveredIdx === i ? 'bg-indigo-500 scale-x-110 shadow-sm' : 'bg-slate-200 group-hover:bg-slate-300'
                                    }`}
                                style={{ height: `${Math.max(height, 4)}%` }}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mt-2 border-t border-slate-50 pt-2 px-0.5 uppercase tracking-wider">
                <span>{formatXDate(data[0]?.date)}</span>
                <span>{formatXDate(data[data.length - 1]?.date)}</span>
            </div>
        </div>
    );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse space-y-4">
            <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                <div className="w-16 h-6 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-8 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full mt-2" />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = useCallback(async (range: string, showRefreshAnim = false) => {
        try {
            if (showRefreshAnim) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) throw new Error('No auth token found');

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/dashboard?timeRange=${range}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                cache: 'no-store',
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || `HTTP ${res.status}`);
            }

            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'Failed to fetch dashboard');

            setData(json.data);
        } catch (err: any) {
            setError(err.message || 'Could not load dashboard data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard(timeRange);
    }, [timeRange, fetchDashboard]);

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto pb-12">
                {/* Header skeleton */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 animate-pulse">
                    <div className="space-y-3">
                        <div className="h-5 w-32 bg-gray-200 rounded-md" />
                        <div className="h-8 w-64 bg-gray-300 rounded-lg" />
                        <div className="h-4 w-80 bg-gray-100 rounded-md" />
                    </div>
                </div>

                {/* KPI skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>

                {/* Body skeleton */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded-md w-1/4 mb-6" />
                        <div className="space-y-4">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 bg-gray-50 rounded-xl" />
                            ))}
                        </div>
                    </div>
                    <div className="xl:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-6">
                        <div className="h-6 bg-gray-200 rounded-md w-1/2" />
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-gray-200 rounded-md w-2/3" />
                                    <div className="h-3 bg-gray-100 rounded-md w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-center pt-8">
                    <Loader2 className="text-blue-600 animate-spin" size={24} />
                </div>
            </div>
        );
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
                <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-full flex items-center justify-center text-red-500 shadow-sm">
                    <AlertCircle size={24} />
                </div>
                <div className="text-center space-y-1">
                    <h2 className="text-base font-semibold text-gray-900">Unable to load dashboard</h2>
                    <p className="text-sm text-gray-500 max-w-sm">{error}</p>
                </div>
                <button
                    onClick={() => fetchDashboard(timeRange)}
                    className="mt-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Try Again
                </button>
            </div>
        );
    }

    if (!data) return null;

    const stats = data.stats || data.statsData || [];
    const activities = data.recentActivities || [];
    const projects = data.projects || [];
    const overview: OverviewSummary | undefined = data.overview;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10 max-w-[1600px] mx-auto pb-16 font-sans text-slate-800 px-4 md:px-0">
            {/* ── Main Page Header ───────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-white rounded-[48px] p-8 md:p-12 shadow-2xl border border-slate-100 group mb-12 flex flex-col">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between items-start gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2.5 text-indigo-600 font-black text-[10px] uppercase tracking-[0.25em] bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 backdrop-blur-sm">
                            <Zap size={14} className="fill-current animate-pulse text-indigo-500" />
                            <span>Operational Intelligence</span>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">
                                Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Overview</span>
                            </h1>
                            <p className="text-slate-500 font-bold text-sm max-w-xl uppercase tracking-widest leading-relaxed">
                                Welcome back, Administrator. Monitoring <span className="text-indigo-600 font-black underline decoration-indigo-200 underline-offset-4">live signals</span> across the biology enterprise network.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50/80 p-2 rounded-2xl border border-slate-100 backdrop-blur-md shadow-inner">
                        <button
                            onClick={() => fetchDashboard(timeRange, true)}
                            className={`p-3 rounded-xl bg-indigo-600 text-white hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 group/btn ${refreshing ? 'animate-spin' : ''}`}
                            title="Sync Data"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <div className="h-10 w-px bg-slate-200 mx-1" />
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="bg-transparent text-slate-700 text-sm font-black rounded-xl pl-4 pr-10 py-3 outline-none focus:ring-0 appearance-none cursor-pointer uppercase tracking-widest min-w-[180px]"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23334155\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\'%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem' }}
                        >
                            <option value="24h" className="bg-white">Cycles: 24H</option>
                            <option value="7d" className="bg-white">Cycles: 07D</option>
                            <option value="30d" className="bg-white">Cycles: 30D</option>
                            <option value="90d" className="bg-white">Cycles: 90D</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────────── */}
            {stats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((card, idx) => {
                        const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'amber', 'red'];
                        const IconComp = getIconComponent(card.icon);
                        return (
                            <SummaryCard
                                key={idx}
                                title={card.title}
                                value={fixCurrencyValue(card.value)}
                                change={Math.abs(card.change)}
                                status={card.change >= 0 ? 'up' : 'down'}
                                icon={IconComp}
                                variant={variants[idx % 4]}
                                description={card.description}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                    <p className="text-sm text-slate-500">No overview data available for this range.</p>
                </div>
            )}

            {/* ── Main content row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── Project Pipeline ─────────────────────────────────────────── */}
                <div className="xl:col-span-2 bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-indigo-100 flex items-center justify-between bg-indigo-600 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                                <Layers size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Active Workflow</h3>
                                <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Real-time Project Matrix</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = '/super-admin-dashboard/projects'}
                            className="text-xs font-black bg-white text-indigo-600 px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2"
                        >
                            ALL PROJECTS <ChevronRight size={14} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {projects.length === 0 ? (
                            <div className="p-20 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                                    <Briefcase size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900">Pipeline Empty</h4>
                                <p className="text-sm text-slate-500 max-w-xs">No active projects matching your current filter.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Project Identity</th>
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Unit</th>
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Completion</th>
                                        <th className="py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Current Status</th>
                                        <th className="py-4 px-8 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {projects.slice(0, 8).map((proj, idx) => {
                                        const progress = proj.progress ?? 0;
                                        const projectName = proj.name || proj.title || proj.category || proj.projectId || `PROJ-${(idx + 1).toString().padStart(3, '0')}`;
                                        const status = proj.status || 'Active';

                                        return (
                                            <tr key={proj._id || proj.projectId || idx} className="hover:bg-slate-50/50 group transition-all">
                                                <td className="py-5 px-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[200px] leading-tight">
                                                            {projectName}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">#{proj.projectId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-8">
                                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                        {proj.department || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                                                            <div
                                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-900">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-8">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusStyles(status)}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-8 text-right">
                                                    <button
                                                        onClick={() => window.location.href = `/super-admin-dashboard/projects/${proj._id || proj.projectId}`}
                                                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ChevronRight size={16} strokeWidth={3} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ── Recent Activity Feed ─────────────────────────────────────── */}
                <div className="xl:col-span-1 bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-900">
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                                <Globe size={20} />
                            </div>
                            <h3 className="text-xl font-black">Audit Log</h3>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>

                    <div className="p-8 flex-1 overflow-y-auto max-h-[520px]">
                        <div className="space-y-8">
                            {activities.length === 0 ? (
                                <div className="text-center py-20 opacity-30">
                                    <Clock size={32} className="mx-auto mb-2" />
                                    <p className="text-xs font-bold uppercase">Awaiting signals...</p>
                                </div>
                            ) : (
                                activities.slice(0, 10).map((item, idx) => (
                                    <div key={item.id || idx} className="flex gap-4 group cursor-default">
                                        <div className="relative flex flex-col items-center shrink-0">
                                            <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-indigo-600 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:bg-indigo-50">
                                                {item.avatar?.slice(0, 2) || item.user?.slice(0, 1) || 'U'}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1">
                                                <ActivityDot type={item.type} />
                                            </div>
                                            {idx !== activities.slice(0, 10).length - 1 && (
                                                <div className="w-px h-10 bg-slate-100 mt-2" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.user}</h4>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.time}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                                                {item.action}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom cards row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Finance Summary */}
                <div className="bg-white p-0 rounded-[32px] border border-emerald-100 shadow-sm flex flex-col group overflow-hidden border-b-4 border-emerald-500">
                    <div className="px-8 py-6 flex justify-between items-center bg-emerald-600 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                                <DollarSign size={22} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Enterprise Financials</h4>
                        </div>
                        <button
                            onClick={() => window.location.href = '/super-admin-dashboard/payments'}
                            className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
                        >
                            <TrendingUp size={18} />
                        </button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all group-hover:bg-white group-hover:shadow-lg group-hover:shadow-emerald-500/5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cumulative Revenue</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-950 tracking-tighter">{fixCurrencyValue(overview?.totalRevenue || '₹0')}</span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">INR</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected</p>
                                <p className="text-sm font-black text-slate-800">{fixCurrencyValue(overview?.expectedRevenue || '₹0')}</p>
                            </div>
                            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Exposure</p>
                                <p className="text-sm font-black text-rose-700">{fixCurrencyValue(overview?.remainingAmount || '₹0')}</p>
                            </div>
                        </div>

                        <div className="space-y-3 px-1">
                            <div className="flex justify-between text-[11px] font-black text-slate-500">
                                <span className="uppercase tracking-widest">Efficiency Rate</span>
                                <span className="text-emerald-600">{overview?.revenuePercentage || 0}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000"
                                    style={{ width: `${Math.min(100, Number(overview?.revenuePercentage || 0))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Insights */}
                <div className="bg-white p-0 rounded-[32px] border border-blue-100 shadow-sm flex flex-col group overflow-hidden border-b-4 border-indigo-500">
                    <div className="px-8 py-6 flex justify-between items-center bg-indigo-500 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                                <Activity size={22} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Insights</h4>
                        </div>
                        <div className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest border border-white/20 backdrop-blur-sm">
                            Realtime
                        </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activity Volume</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-slate-950 tracking-tighter">
                                    {data.lineGraphData?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0}
                                </span>
                                <span className="text-xs font-bold text-slate-400">Total Interactions</span>
                            </div>
                        </div>

                        <div className="h-36 mb-6 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-indigo-500/5 transition-all">
                            <SimpleBarChart data={data.lineGraphData || []} />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black p-4 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                            <span className="uppercase tracking-widest">Average Daily</span>
                            <span className="text-indigo-400 bg-indigo-950 px-3 py-1 rounded-lg border border-indigo-900">
                                {data.lineGraphData && data.lineGraphData.length > 0
                                    ? Math.round(data.lineGraphData.reduce((acc, curr) => acc + (curr.value || 0), 0) / data.lineGraphData.length)
                                    : '0'
                                } UNITS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Critical Vector Control */}
                <div className="bg-white p-0 rounded-[32px] border border-rose-100 shadow-sm flex flex-col group overflow-hidden border-b-4 border-rose-500">
                    <div className="px-8 py-6 flex items-center gap-4 bg-rose-600 text-white">
                        <div className="w-11 h-11 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                            <ShieldAlert size={22} strokeWidth={2.5} />
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tighter text-white">Security</h4>
                    </div>
                    <div className="p-8 space-y-4 flex-1">
                        <div
                            onClick={() => window.location.href = '/super-admin-dashboard/software-issues'}
                            className="group/item flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-900 hover:border-slate-900 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white rounded-xl text-rose-500 group-hover/item:bg-rose-500 group-hover/item:text-white transition-all shadow-sm">
                                    <Cpu size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-slate-500">System Errors</p>
                                    <p className="text-sm font-black text-slate-900 group-hover/item:text-white">Software Issues</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover/item:text-white" strokeWidth={3} />
                        </div>

                        <div
                            onClick={() => window.location.href = '/super-admin-dashboard/project-complaints'}
                            className="group/item flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-900 hover:border-slate-900 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white rounded-xl text-amber-500 group-hover/item:bg-amber-500 group-hover/item:text-white transition-all shadow-sm">
                                    <Monitor size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-slate-500">Service Tickets</p>
                                    <p className="text-sm font-black text-slate-900 group-hover/item:text-white">Site Complaints</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover/item:text-white" strokeWidth={3} />
                        </div>

                        <div
                            onClick={() => window.location.href = '/super-admin-dashboard/members'}
                            className="group/item flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-600 hover:border-indigo-600 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white rounded-xl text-indigo-600 group-hover/item:bg-indigo-900 group-hover/item:text-white transition-all shadow-sm">
                                    <Users size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-indigo-200">User Access</p>
                                    <p className="text-sm font-black text-slate-900 group-hover/item:text-white">Manage Members</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover/item:text-white" strokeWidth={3} />
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Security Protocol Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
