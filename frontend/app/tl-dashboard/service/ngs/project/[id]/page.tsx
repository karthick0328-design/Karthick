'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { Upload, X, Paperclip, FileText, Activity } from 'lucide-react';
import TLProjectDetailView from '@/app/tl-dashboard/service/shared/TLProjectDetailView';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';

export default function NGSProjectDetails() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressNotes, setProgressNotes] = useState('');
    const [progressFiles, setProgressFiles] = useState<File[]>([]);
    const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }
        fetchProject(token);
    }, [projectId]);

    const fetchProject = async (token: string) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setProject(data.data);
            else toast.error(data.message || 'Failed to load project details');
        } catch { toast.error('Error loading project'); }
        finally { setLoading(false); }
    };

    const handlePushProgress = async (activityId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/projects/tl/assigned-projects/${projectId}/push-progress/${activityId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'TL_Push' })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Progress pushed to Service Manager');
                fetchProject(token);
            } else {
                toast.error(data.message || 'Failed to push progress');
            }
        } catch { toast.error('Error pushing progress'); }
    };

    const handleUploadFiles = async () => {
        if (uploadFiles.length === 0) return;
        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            uploadFiles.forEach(file => formData.append('attachments', file));

            const res = await fetch(`${API_BASE}/projects/${projectId}/attachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Documents uploaded successfully');
                setShowUploadModal(false);
                setUploadFiles([]);
                fetchProject(token || '');
            } else {
                toast.error(data.message || 'Failed to upload documents');
            }
        } catch (err) {
            toast.error('Error uploading documents');
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateProgress = async () => {
        if (!progressNotes.trim()) {
            toast.error('Progress notes are required');
            return;
        }

        setIsUpdatingProgress(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('progressNotes', progressNotes);
            progressFiles.forEach(file => formData.append('attachments', file));

            const res = await fetch(`${API_BASE}/projects/tl/assigned-projects/${projectId}/update-progress`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Progress updated successfully');
                setShowProgressModal(false);
                setProgressNotes('');
                setProgressFiles([]);
                fetchProject(token || '');
            } else {
                toast.error(data.message || 'Failed to update progress');
            }
        } catch (err) {
            toast.error('Error updating progress');
        } finally {
            setIsUpdatingProgress(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen bg-slate-50 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-2xl animate-spin shadow-xl" />
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Initializing Terminal...</p>
            </div>
        </div>
    );

    if (!project) return (
        <div className="flex h-screen bg-slate-50 items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                    <X size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Project Not Found</h2>
                    <p className="text-slate-400 font-bold text-sm leading-relaxed uppercase tracking-wider">The requested project matrix could not be established or permissions are inadequate.</p>
                </div>
                <button onClick={() => router.back()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl">Return to Dashboard</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12">
            <Toaster position="top-right" />

            <TLProjectDetailView
                project={project}
                onPushProgress={handlePushProgress}
                onOpenUploadModal={() => setShowUploadModal(true)}
                onOpenProgressModal={() => setShowProgressModal(true)}
            />

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowUploadModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] w-full max-w-lg overflow-hidden flex flex-col transform transition-all animate-in zoom-in duration-300 border border-white" onClick={e => e.stopPropagation()}>
                        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                                    <Upload size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Teleport Files</h2>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Append documentation to {project.uniqueId}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-2.5 hover:bg-slate-200/50 rounded-xl transition-all text-slate-400 hover:text-slate-900">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group shadow-inner">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                                        <Paperclip size={32} className="text-slate-300 group-hover:text-indigo-500" />
                                    </div>
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Select Data Vectors</p>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1.5">Max Limit: 5 Nodes</p>
                                </div>
                                <input type="file" className="hidden" multiple onChange={(e) => {
                                    if (e.target.files) setUploadFiles(Array.from(e.target.files).slice(0, 5));
                                }} />
                            </label>

                            {uploadFiles.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transmission Queue</span>
                                        <span className="text-[10px] font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">{uploadFiles.length} / 5 Nodes</span>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {uploadFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group/file">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <FileText size={16} className="text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-black text-slate-700 truncate block">{f.name}</span>
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{(f.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1 px-8 py-5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadFiles}
                                    disabled={uploadFiles.length === 0 || isUploading}
                                    className="flex-[2] flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-20 disabled:grayscale transition-all duration-500"
                                >
                                    {isUploading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={16} className="animate-bounce" />
                                            <span>Initialize Dispatch</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Update Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowProgressModal(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] w-full max-w-lg overflow-hidden flex flex-col transform transition-all animate-in zoom-in duration-300 border border-white" onClick={e => e.stopPropagation()}>
                        <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                                    <Activity size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Update Progress</h2>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{project.uniqueId} Telemetry Log</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProgressModal(false)} className="p-2.5 hover:bg-slate-200/50 rounded-xl transition-all text-slate-400 hover:text-slate-900">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Status Report</label>
                                <textarea
                                    value={progressNotes}
                                    onChange={(e) => setProgressNotes(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium h-32"
                                    placeholder="Detail operational updates here..."
                                />
                            </div>

                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group shadow-inner">
                                <div className="flex flex-col items-center justify-center mt-2">
                                    <Paperclip size={24} className="text-slate-300 group-hover:text-indigo-500 mb-2 transition-colors" />
                                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Append Verification Documents</p>
                                </div>
                                <input type="file" className="hidden" multiple onChange={(e) => {
                                    if (e.target.files) setProgressFiles(Array.from(e.target.files).slice(0, 5));
                                }} />
                            </label>

                            {progressFiles.length > 0 && (
                                <div className="space-y-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                                    {progressFiles.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileText size={14} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
                                            </div>
                                            <button onClick={() => setProgressFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setShowProgressModal(false)}
                                    className="flex-1 px-8 py-5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all font-black text-[10px] uppercase tracking-widest border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateProgress}
                                    disabled={isUpdatingProgress || !progressNotes.trim()}
                                    className="flex-[2] flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-20 disabled:grayscale transition-all duration-500"
                                >
                                    {isUpdatingProgress ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Activity size={16} />
                                            <span>Commit Update</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
