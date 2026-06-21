'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    HardDrive, Upload, File, Trash2, Download, Search, Plus, FileText,
    Image as ImageIcon, Music, Video, Database, Cloud, FolderOpen,
    LayoutGrid, List, Clock, Paperclip, FlaskConical, AlertCircle,
    CheckCircle2, X, Zap, TrendingUp, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };

interface DriveFile {
    _id: string;
    originalName: string;
    filename: string;
    mimetype: string;
    size: number;
    path: string;
    category: string;
    createdAt: string;
    projectId?: string;
}

interface StorageStats {
    used: number;
    limit: number;
    percent: string;
}

type ViewMode = 'grid' | 'list';
type FilterKey = 'all' | 'image' | 'document' | 'general';

// ── Vivid, distinct colour palette for each type ──
const CATEGORY_CONFIG: Record<FilterKey, {
    label: string;
    gradient: string;       // card gradient
    accent: string;         // hex accent
    textClass: string;
    badgeClass: string;
    badgeText: string;
    icon: React.ElementType;
}> = {
    all: {
        label: 'All Files',
        gradient: 'from-violet-600 via-indigo-600 to-blue-600',
        accent: '#6366f1',
        textClass: 'text-indigo-600',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        badgeText: 'All',
        icon: FolderOpen,
    },
    // attachments: {
    //     label: 'Attachments',
    //     gradient: 'from-teal-500 via-emerald-500 to-green-500',
    //     accent: '#0d9488',
    //     textClass: 'text-teal-600',
    //     badgeClass: 'bg-teal-100 text-teal-700',
    //     badgeText: 'Attachment',
    //     icon: Paperclip,
    // },
    // results: {
    //     label: 'Update Results',
    //     gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    //     accent: '#f97316',
    //     textClass: 'text-orange-600',
    //     badgeClass: 'bg-orange-100 text-orange-700',
    //     badgeText: 'Result',
    //     icon: FlaskConical,
    // },
    image: {
        label: 'Images',
        gradient: 'from-pink-500 via-fuchsia-500 to-purple-500',
        accent: '#ec4899',
        textClass: 'text-pink-600',
        badgeClass: 'bg-pink-100 text-pink-700',
        badgeText: 'Image',
        icon: ImageIcon,
    },
    document: {
        label: 'Documents',
        gradient: 'from-rose-500 via-red-500 to-orange-500',
        accent: '#f43f5e',
        textClass: 'text-rose-600',
        badgeClass: 'bg-rose-100 text-rose-700',
        badgeText: 'Document',
        icon: FileText,
    },
    general: {
        label: 'General',
        gradient: 'from-slate-500 via-slate-600 to-slate-700',
        accent: '#64748b',
        textClass: 'text-slate-600',
        badgeClass: 'bg-slate-100 text-slate-600',
        badgeText: 'General',
        icon: File,
    },
};

const getCategoryKey = (cat: string, mime: string): FilterKey => {
    // if (cat === 'Project Attachment') return 'attachments';
    // if (cat === 'Project Result') return 'results';
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return 'document';
    return 'general';
};

const getFileIcon = (mimetype: string, lg = false) => {
    const s = lg ? 'w-8 h-8' : 'w-5 h-5';
    if (mimetype.startsWith('image/')) return <ImageIcon className={`${s} text-pink-500`} />;
    if (mimetype.startsWith('video/')) return <Video className={`${s} text-purple-500`} />;
    if (mimetype.startsWith('audio/')) return <Music className={`${s} text-amber-500`} />;
    if (mimetype.includes('pdf')) return <FileText className={`${s} text-rose-500`} />;
    if (mimetype.includes('sheet') || mimetype.includes('excel') || mimetype.includes('csv'))
        return <FileText className={`${s} text-emerald-500`} />;
    if (mimetype.includes('word')) return <FileText className={`${s} text-blue-500`} />;
    return <File className={`${s} text-slate-400`} />;
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// ─────────────────────────────────────────────────

export default function DrivePage() {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StorageStats>({ used: 0, limit: 2147483648, percent: '0.00' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<FilterKey>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/drive';
    const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE}/files`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) { setFiles(res.data.data); setStats(res.data.storage); }
        } catch { toast.error('Failed to load files'); }
        finally { setLoading(false); }
    };

    const uploadFiles = useCallback(async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const token = localStorage.getItem('token');
        const fd = new FormData();
        for (let i = 0; i < fileList.length; i++) fd.append('files', fileList[i]);
        fd.append('category', 'General');
        setIsUploading(true); setUploadProgress(0);
        try {
            const res = await axios.post(`${API_BASE}/upload`, fd, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                onUploadProgress: e => setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)))
            });
            if (res.data.success) { toast.success(`${fileList.length} file(s) uploaded`); fetchData(); }
        } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
        finally { setIsUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }, [API_BASE]);

    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); uploadFiles(e.dataTransfer.files); };

    const handleDeleteFile = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.delete(`${API_BASE}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                toast.success('File deleted');
                setFiles(prev => prev.filter(f => f._id !== id));
                const sr = await axios.get(`${API_BASE}/storage`, { headers: { Authorization: `Bearer ${token}` } });
                if (sr.data.success) setStats(sr.data.data);
            }
        } catch { toast.error('Delete failed'); }
        finally { setDeleteConfirm(null); }
    };

    const filteredFiles = files.filter(file => {
        const ok = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());
        if (!ok) return false;
        if (filterType === 'all') return true;
        return getCategoryKey(file.category, file.mimetype) === filterType;
    });

    const pct = Number(stats.percent);
    const isNearFull = pct > 80;
    const countOf = (key: FilterKey) =>
        key === 'all' ? files.length : files.filter(f => getCategoryKey(f.category, f.mimetype) === key).length;

    // Storage segment widths per category (of total used)
    const categoryKeys: FilterKey[] = ['image', 'document', 'general'];
    const segmentColors: Record<FilterKey, string> = {
        all: '#6366f1',
        // attachments: '#0d9488',
        // results: '#f97316',
        image: '#ec4899',
        document: '#f43f5e',
        general: '#94a3b8',
    };

    return (
        <div className="min-h-screen bg-white animate-in fade-in duration-500">
            <Toaster position="top-right" toastOptions={{ className: 'bg-white border border-slate-200 shadow-xl rounded-2xl text-sm font-semibold' }} />
            <input type="file" multiple ref={fileInputRef} onChange={e => uploadFiles(e.target.files)} className="hidden" />

            {/* ── Upload Progress ── */}
            <AnimatePresence>
                {isUploading && (
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-8 right-8 z-[200] w-80 bg-white shadow-2xl rounded-3xl p-6 border border-slate-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center shrink-0">
                                <motion.div animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 1 }}>
                                    <Upload className="w-5 h-5 text-violet-600" />
                                </motion.div>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">Uploading Files</p>
                                <p className="text-xs text-slate-400 font-medium">{uploadProgress}% complete</p>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete Confirm ── */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                                <AlertCircle className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Delete File?</h3>
                            <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">This will permanently remove the file from your drive and cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                                <button onClick={() => handleDeleteFile(deleteConfirm)}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-xl shadow-rose-100">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-6 md:p-8 space-y-6">

                {/* ══════════════════════════════════════════════
                    TOP: Storage Overview Section
                ══════════════════════════════════════════════ */}
                <div>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                                <HardDrive className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">My Drive</h1>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Personal Cloud Storage</p>
                            </div>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 active:scale-95 group">
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            Upload Files
                        </button>
                    </div>

                    {/* Storage Card — Full Width */}
                    <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200 mb-1">Storage Usage</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black tracking-tight">{(stats.used / (1024 ** 3)).toFixed(2)}</span>
                                        <span className="text-lg font-bold text-indigo-300">GB</span>
                                        <span className="text-sm font-semibold text-indigo-300">/ 2 GB</span>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border ${isNearFull ? 'bg-rose-500/20 border-rose-400/30 text-rose-200' : 'bg-white/10 border-white/20 text-indigo-100'
                                    }`}>
                                    {pct}% Used
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-4 p-0.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${isNearFull
                                        ? 'bg-gradient-to-r from-rose-400 to-orange-400'
                                        : 'bg-gradient-to-r from-white/60 to-white/80'
                                        }`}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
                                <span className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {files.length} files stored
                                </span>
                                <span className={isNearFull ? 'text-rose-300 font-black' : ''}>
                                    {formatSize(stats.limit - stats.used)} free
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Category Breakdown Row ── */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(['image', 'document', 'general', 'all'] as FilterKey[]).map(key => {
                            const { label, gradient, icon: Icon } = CATEGORY_CONFIG[key];
                            const count = countOf(key);
                            return (
                                <button key={key} onClick={() => setFilterType(key)}
                                    className={`group flex items-center gap-3 bg-white rounded-2xl p-4 transition-all shadow-sm hover:shadow-md ${filterType === key ? 'border-2 border-transparent' : 'border-2 border-slate-100 hover:border-slate-200'
                                        }`}
                                    style={filterType === key ? { boxShadow: `0 0 0 3px ${CATEGORY_CONFIG[key].accent}40` } : undefined}>
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
                                        <p className="text-xl font-black text-slate-900">{count}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════
                    DRAG & DROP ZONE
                ══════════════════════════════════════════════ */}
                <motion.div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    animate={{
                        borderColor: isDragging ? '#6366f1' : '#e2e8f0',
                        backgroundColor: isDragging ? '#eef2ff' : '#ffffff',
                        scale: isDragging ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className="border-2 border-dashed rounded-3xl p-7 cursor-pointer flex items-center gap-6 group hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors shadow-sm"
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isDragging ? 'bg-indigo-100' : 'bg-slate-50 group-hover:bg-indigo-50'
                        } border border-slate-100`}>
                        <Cloud className={`w-7 h-7 transition-colors ${isDragging ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-700 mb-0.5">
                            {isDragging ? '📁 Release to upload files' : 'Drag & drop files here, or click to browse'}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">All file types supported · Max 2GB total</p>
                    </div>
                    <div className="ml-auto hidden sm:flex items-center gap-2">
                        <span className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 group-hover:bg-indigo-700 transition-colors">
                            Browse Files
                        </span>
                    </div>
                </motion.div>

                {/* ══════════════════════════════════════════════
                    FILE BROWSER
                ══════════════════════════════════════════════ */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                        {/* Left: title + search */}
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900">
                                    {CATEGORY_CONFIG[filterType].label}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-semibold">{filteredFiles.length} files</p>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input type="text" placeholder="Search..." value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all w-48" />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right: category pills + view toggle */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {(Object.keys(CATEGORY_CONFIG) as FilterKey[]).map(key => {
                                const { label, accent } = CATEGORY_CONFIG[key];
                                const active = filterType === key;
                                return (
                                    <button key={key} onClick={() => setFilterType(key)}
                                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${active ? 'text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        style={active ? { backgroundColor: accent } : undefined}>
                                        {label}
                                    </button>
                                );
                            })}

                            <div className="h-6 w-px bg-slate-200 mx-1" />

                            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
                                <button onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-72 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center relative">
                                <HardDrive className="w-6 h-6 text-indigo-300" />
                                <div className="absolute inset-0 rounded-2xl border-[3px] border-t-indigo-600 border-slate-100 animate-spin" />
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading your drive...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-72 gap-4 text-center p-8">
                            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center">
                                <FolderOpen className="w-9 h-9 text-slate-200" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-800 mb-1">
                                    {searchTerm ? 'No files found' : 'No files here yet'}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
                                    {searchTerm ? `Nothing matches "${searchTerm}".` : 'Upload files or they will appear here automatically when you submit projects.'}
                                </p>
                            </div>
                            {!searchTerm && (
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="px-7 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:from-violet-700 hover:to-indigo-700 transition-all">
                                    Upload First File
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'list' ? (
                        /* ─── LIST VIEW ─── */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/60 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">File Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Size</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Uploaded</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    <AnimatePresence>
                                        {filteredFiles.map((file, idx) => {
                                            const catKey = getCategoryKey(file.category, file.mimetype);
                                            const { badgeClass, badgeText, accent } = CATEGORY_CONFIG[catKey];
                                            const fileUrl = DOMPurify.sanitize(`${SERVER_BASE}/${file.path.replace(/\\/g, '/')}`);
                                            return (
                                                <motion.tr key={file._id}
                                                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                    transition={{ delay: idx * 0.025 }}
                                                    className="group hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:shadow-md transition-shadow shrink-0">
                                                                {getFileIcon(file.mimetype)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 truncate max-w-[200px] group-hover:text-indigo-700 transition-colors">
                                                                    {file.originalName}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">
                                                                    {file.mimetype.split('/')[1] || file.mimetype}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${badgeClass}`}>
                                                            {badgeText}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-slate-600">{formatSize(file.size)}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                            <Clock className="w-3 h-3 shrink-0" />
                                                            {formatDate(file.createdAt)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                                className="p-2 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all" title="Open / Download">
                                                                <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                            <button onClick={() => setDeleteConfirm(file._id)}
                                                                className="p-2 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-rose-600 hover:border-rose-100 hover:shadow-md transition-all" title="Delete">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* ─── GRID VIEW ─── */
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                            <AnimatePresence>
                                {filteredFiles.map((file, idx) => {
                                    const catKey = getCategoryKey(file.category, file.mimetype);
                                    const { gradient, badgeClass, badgeText } = CATEGORY_CONFIG[catKey];
                                    const fileUrl = DOMPurify.sanitize(`${SERVER_BASE}/${file.path.replace(/\\/g, '/')}`);
                                    return (
                                        <motion.div key={file._id}
                                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: idx * 0.035 }}
                                            className="group bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 transition-all">
                                            {/* Icon panel */}
                                            <div className={`w-full aspect-square bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity shadow-sm`}>
                                                {getFileIcon(file.mimetype, true)}
                                            </div>
                                            {/* Info */}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                                                    {file.originalName}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{formatSize(file.size)}</p>
                                            </div>
                                            <span className={`self-start px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${badgeClass}`}>
                                                {badgeText}
                                            </span>
                                            {/* Actions hover */}
                                            <div className="flex gap-2 border-t border-slate-50 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                                    <Download className="w-3 h-3" /> Open
                                                </a>
                                                <button onClick={() => setDeleteConfirm(file._id)}
                                                    className="p-2 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && files.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium pb-4">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {files.length} files</span>
                        <span className="text-slate-200">·</span>
                        <span>{formatSize(stats.used)} used</span>
                        <span className="text-slate-200">·</span>
                        <span className={isNearFull ? 'text-rose-500 font-bold' : ''}>{formatSize(stats.limit - stats.used)} free</span>
                    </div>
                )}
            </div>
        </div>
    );
}
