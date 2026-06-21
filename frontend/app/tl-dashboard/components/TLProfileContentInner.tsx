'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, MapPin, Briefcase, Award, Shield,
    Camera, Edit2, CheckCircle2, Activity, Clock, Sparkles,
    GraduationCap, Building2, Network, Zap, Heart, Save, X,
    Plus, Trash2, Linkedin, Twitter, CreditCard, AlertTriangle,
    Target, BookOpen, Star, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/service-manager-profile';

interface TLProfileContentProps {
    backPath?: string;
}

export default function TLProfileContent({ backPath }: TLProfileContentProps) {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'skills' | 'banking'>('overview');
    const [editData, setEditData] = useState<any>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [newSpec, setNewSpec] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) { setError('Not authenticated'); setIsLoading(false); return; }
            const res = await fetch(`${API_BASE}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const raw = data.data;
                const sanitized = {
                    ...raw,
                    profileImage: (raw.profileImage && /^(https?:\/\/|blob:|\/)/.test(raw.profileImage)) ? raw.profileImage : undefined,
                    socialLinks: raw.socialLinks ? {
                        linkedin: (raw.socialLinks.linkedin && /^(https?:\/\/|\/)/.test(raw.socialLinks.linkedin)) ? raw.socialLinks.linkedin : '',
                        twitter: (raw.socialLinks.twitter && /^(https?:\/\/|\/)/.test(raw.socialLinks.twitter)) ? raw.socialLinks.twitter : '',
                    } : { linkedin: '', twitter: '' },
                    bankingDetails: raw.bankingDetails || { bankName: '', accountHolder: '', accountNumber: '', ifscCode: '', branchName: '' },
                    education: raw.education || [],
                    skills: raw.skills || [],
                    specialization: raw.specialization || [],
                    achievements: raw.achievements || [],
                    certifications: raw.certifications || [],
                };
                setProfile(sanitized);
                setEditData(JSON.parse(JSON.stringify(sanitized)));
            } else {
                setError(data.message || 'Profile not found.');
            }
        } catch (err) {
            setError('Network error: Unable to connect to backend server.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/me`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Profile updated successfully!');
                setProfile(data.data);
                setIsEditing(false);
            } else {
                toast.error(data.message || 'Update failed');
            }
        } catch { toast.error('Network error during update'); }
        finally { setIsSaving(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const token = localStorage.getItem('token');
        const form = new FormData();
        form.append('image', file);
        setUploadingImage(true);
        try {
            const res = await fetch(`${API_BASE}/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: form
            });
            const data = await res.json();
            if (data.success) {
                const imgUrl = validateURL(data.data.imageUrl);
                setProfile((p: any) => ({ ...p, profileImage: imgUrl }));
                toast.success('Photo updated');
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } catch { toast.error('Upload error'); }
        finally { setUploadingImage(false); }
    };

    const addItem = (field: string, value: any) =>
        setEditData((p: any) => ({ ...p, [field]: [...(p[field] || []), value] }));
    const removeItem = (field: string, idx: number) =>
        setEditData((p: any) => ({ ...p, [field]: p[field].filter((_: any, i: number) => i !== idx) }));
    const updateItem = (field: string, idx: number, value: any) =>
        setEditData((p: any) => { const arr = [...(p[field] || [])]; arr[idx] = value; return { ...p, [field]: arr }; });

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !profile) return (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <AlertTriangle className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Profile Unavailable</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">{error || 'Could not load profile data.'}</p>
            <button onClick={() => fetchProfile()}
                className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 flex items-center gap-2 mx-auto">
                <RefreshCw size={16} /> Try Again
            </button>
        </div>
    );

    const user = profile.userId || {};

    // ── Sub-components ────────────────────────────────────────────────────────
    const ProfileField = ({ icon: Icon, label, value, color = 'indigo' }: any) => (
        <div className="group flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 shadow-sm">
            <div className={`p-3 rounded-xl bg-gray-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                <p className="text-sm font-bold text-gray-900 tracking-tight">{value || 'Not specified'}</p>
            </div>
        </div>
    );

    const StatCard = ({ label, value, icon: Icon, colorClass }: any) => (
        <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-500 group">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <Icon size={22} className="text-white" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
        </div>
    );

    const InputField = ({ label, value, onChange, multiline = false, placeholder = '' }: any) => (
        <div className="space-y-2">
            {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>}
            {multiline ? (
                <textarea rows={4} value={value} onChange={onChange} placeholder={placeholder}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium resize-none text-gray-900" />
            ) : (
                <input type="text" value={value} onChange={onChange} placeholder={placeholder}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-gray-900" />
            )}
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Target },
        { id: 'experience', label: 'Education', icon: BookOpen },
        { id: 'skills', label: 'Skills', icon: Zap },
        { id: 'banking', label: 'Banking', icon: CreditCard },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 p-8 pt-12 text-white shadow-2xl shadow-indigo-900/20 group">
                <div className="absolute top-[-20%] right-[-5%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-5%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:items-end">
                    {/* Avatar */}
                    <div className="relative shadow-2xl">
                        <div className="w-40 h-40 rounded-[2.5rem] bg-white p-1">
                            <div className="w-full h-full rounded-[2.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 border-2 border-indigo-100 overflow-hidden">
                                {profile.profileImage && (profile.profileImage.startsWith('http') || profile.profileImage.startsWith('/')) ? (
                                    <img
                                        src={profile.profileImage.startsWith('http') ? validateURL(profile.profileImage) : profile.profileImage}
                                        alt={user.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <User size={80} strokeWidth={1} />
                                )}
                            </div>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:bg-slate-50 transition-colors border border-indigo-50">
                            {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    {/* Name & Info */}
                    <div className="text-center md:text-left flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                Team Lead
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/30 text-indigo-200">
                                <Star size={10} /> {user.service || 'Bio Science'}
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-400/30 text-emerald-300">
                                <CheckCircle2 size={10} /> {user.uniqueId || 'TL-XXXX'}
                            </div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight mb-2 drop-shadow-sm">{user.name || 'Team Lead'}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-indigo-100/80 font-medium">
                            <div className="flex items-center gap-2"><MapPin size={16} />{user.branch || 'Operations Hub'}</div>
                            <div className="flex items-center gap-2"><Mail size={16} />{profile.contactEmail || user.email}</div>
                            {(profile.contactPhone || user.phone) && (
                                <div className="flex items-center gap-2"><Phone size={16} />{profile.contactPhone || user.phone}</div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 shrink-0">
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} disabled={isSaving}
                                    className="px-7 py-3.5 bg-white text-indigo-600 rounded-[1.25rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all shadow-xl">
                                    {isSaving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save All
                                </button>
                                <button onClick={() => { setIsEditing(false); setEditData(JSON.parse(JSON.stringify(profile))); }}
                                    className="px-7 py-3.5 bg-white/10 text-white border border-white/20 rounded-[1.25rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/20 active:scale-95 transition-all">
                                    <X size={16} /> Cancel
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)}
                                className="px-8 py-3.5 bg-white text-indigo-600 rounded-[1.25rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all shadow-xl">
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Stats + Tabs */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Stat Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Experience" value={`${profile.experienceYears || 0}y`} icon={Award} colorClass="bg-gradient-to-br from-indigo-600 to-indigo-800" />
                        <StatCard label="Skills" value={profile.skills?.length || 0} icon={Zap} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" />
                        <StatCard label="Focus Areas" value={profile.specialization?.length || 0} icon={Target} colorClass="bg-gradient-to-br from-amber-500 to-orange-600" />
                        <StatCard label="Certs" value={profile.certifications?.length || 0} icon={CheckCircle2} colorClass="bg-gradient-to-br from-purple-500 to-pink-600" />
                    </div>

                    {/* Tab Bar */}
                    <div className="flex flex-wrap gap-2 p-1.5 bg-white/60 backdrop-blur-xl border border-white rounded-2xl w-fit shadow-sm">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:text-gray-700 hover:bg-white'}`}>
                                <tab.icon size={14} />{tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm space-y-8">

                            {/* ── OVERVIEW ── */}
                            {activeTab === 'overview' && (
                                <>
                                    {/* Bio */}
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Activity size={18} className="text-indigo-500" /> Team Lead Bio
                                        </h3>
                                        {isEditing ? (
                                            <InputField value={editData.bio} multiline
                                                onChange={(e: any) => setEditData({ ...editData, bio: e.target.value })}
                                                placeholder="Outline your leadership journey and expertise..." />
                                        ) : (
                                            <p className="text-gray-600 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-6">
                                                {profile.bio || "No professional overview yet. Click 'Edit Profile' to add your bio."}
                                            </p>
                                        )}
                                    </div>

                                    {/* Achievements */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                                <Award size={18} className="text-amber-500" /> Achievements
                                            </h3>
                                            {isEditing && (
                                                <button onClick={() => addItem('achievements', 'New achievement')}
                                                    className="flex items-center gap-1.5 text-xs font-black text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-xl hover:bg-indigo-100">
                                                    <Plus size={14} /> Add
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {(isEditing ? editData.achievements : profile.achievements).map((item: string, idx: number) => (
                                                <div key={idx} className="flex gap-3 items-start p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:border-indigo-100">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black shrink-0 mt-0.5">✓</div>
                                                    {isEditing ? (
                                                        <>
                                                            <input value={item} onChange={e => updateItem('achievements', idx, e.target.value)}
                                                                className="flex-1 bg-transparent text-sm text-gray-700 font-medium outline-none border-b border-gray-200 focus:border-indigo-400" />
                                                            <button onClick={() => removeItem('achievements', idx)}>
                                                                <Trash2 size={14} className="text-gray-300 hover:text-rose-500" />
                                                            </button>
                                                        </>
                                                    ) : <p className="text-sm text-gray-600 font-medium">{item}</p>}
                                                </div>
                                            ))}
                                            {profile.achievements?.length === 0 && !isEditing && (
                                                <p className="text-gray-400 text-sm font-medium italic pl-2">No achievements added yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Specializations */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                                <Briefcase size={18} className="text-indigo-500" /> Focus Areas
                                            </h3>
                                        </div>
                                        {isEditing && (
                                            <div className="flex gap-2 mb-4">
                                                <input value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Add focus area..."
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem('specialization', newSpec); setNewSpec(''); } }}
                                                    className="flex-1 px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:border-indigo-300 outline-none font-bold text-sm text-gray-900" />
                                                <button onClick={() => { addItem('specialization', newSpec); setNewSpec(''); }}
                                                    className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100"><Plus size={20} /></button>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {(isEditing ? editData.specialization : profile.specialization).map((item: string, idx: number) => (
                                                <span key={idx} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest">
                                                    {item}
                                                    {isEditing && <button onClick={() => removeItem('specialization', idx)}><X size={12} className="hover:text-rose-500" /></button>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── EDUCATION ── */}
                            {activeTab === 'experience' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                            <GraduationCap size={18} className="text-indigo-500" /> Academic Path
                                        </h3>
                                        {isEditing && (
                                            <button onClick={() => addItem('education', { degree: '', institution: '', year: '' })}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100">
                                                <Plus size={14} /> Add Record
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-5 relative before:absolute before:left-6 before:top-2 before:bottom-0 before:w-0.5 before:bg-indigo-50">
                                        {(isEditing ? editData.education : profile.education).map((edu: any, idx: number) => (
                                            <div key={idx} className="relative pl-16 group">
                                                <div className="absolute left-0 top-1 w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 flex items-center justify-center z-10 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-400 group-hover:bg-white" />
                                                </div>
                                                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-all">
                                                    {isEditing ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <InputField label="Degree" value={edu.degree}
                                                                onChange={(e: any) => updateItem('education', idx, { ...edu, degree: e.target.value })} />
                                                            <InputField label="Institution" value={edu.institution}
                                                                onChange={(e: any) => updateItem('education', idx, { ...edu, institution: e.target.value })} />
                                                            <InputField label="Year" value={edu.year}
                                                                onChange={(e: any) => updateItem('education', idx, { ...edu, year: e.target.value })} />
                                                            <div className="flex items-end">
                                                                <button onClick={() => removeItem('education', idx)}
                                                                    className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1">
                                                                    <Trash2 size={12} /> Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h5 className="text-base font-black text-gray-900 mb-1">{edu.degree || '—'}</h5>
                                                            <p className="text-sm font-bold text-gray-500">{edu.institution || '—'}</p>
                                                            {edu.year && (
                                                                <span className="inline-block mt-3 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black border border-indigo-100">
                                                                    Class of {edu.year}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {profile.education?.length === 0 && !isEditing && (
                                            <div className="text-center py-10">
                                                <BookOpen size={32} className="text-gray-200 mx-auto mb-2" />
                                                <p className="text-gray-400 font-medium italic text-sm">No education records yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Certifications */}
                                    <div className="pt-8 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                                <Award size={18} className="text-amber-500" /> Certifications
                                            </h3>
                                            {isEditing && (
                                                <button onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })}
                                                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-100">
                                                    <Plus size={14} /> Add Cert
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            {(isEditing ? editData.certifications : profile.certifications).map((cert: any, idx: number) => (
                                                <div key={idx} className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-4">
                                                    <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0"><Award size={18} /></div>
                                                    {isEditing ? (
                                                        <div className="flex-1 grid grid-cols-3 gap-3">
                                                            <InputField label="Name" value={cert.name}
                                                                onChange={(e: any) => updateItem('certifications', idx, { ...cert, name: e.target.value })} />
                                                            <InputField label="Issuer" value={cert.issuer}
                                                                onChange={(e: any) => updateItem('certifications', idx, { ...cert, issuer: e.target.value })} />
                                                            <InputField label="Year" value={cert.year}
                                                                onChange={(e: any) => updateItem('certifications', idx, { ...cert, year: e.target.value })} />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p className="font-black text-sm text-gray-900">{cert.name}</p>
                                                            <p className="text-xs text-gray-400 font-medium mt-0.5">{cert.issuer} · {cert.year}</p>
                                                        </div>
                                                    )}
                                                    {isEditing && (
                                                        <button onClick={() => removeItem('certifications', idx)}>
                                                            <Trash2 size={14} className="text-gray-300 hover:text-rose-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── SKILLS ── */}
                            {activeTab === 'skills' && (
                                <>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                        <Zap size={18} className="text-amber-500" /> Technical Expertise
                                    </h3>
                                    {isEditing && (
                                        <div className="flex gap-2">
                                            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add a skill..."
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem('skills', newSkill); setNewSkill(''); } }}
                                                className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-indigo-300 outline-none font-bold text-gray-900" />
                                            <button onClick={() => { addItem('skills', newSkill); setNewSkill(''); }}
                                                className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100"><Plus size={24} /></button>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        {(isEditing ? editData.skills : profile.skills).map((skill: string, idx: number) => (
                                            <span key={idx} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                                {isEditing ? (
                                                    <input value={skill} onChange={e => updateItem('skills', idx, e.target.value)}
                                                        className="bg-transparent outline-none w-20 text-gray-700 text-[10px] font-black uppercase" />
                                                ) : skill}
                                                {isEditing && <button onClick={() => removeItem('skills', idx)}><X size={12} className="hover:text-rose-500" /></button>}
                                            </span>
                                        ))}
                                        {profile.skills?.length === 0 && !isEditing && (
                                            <p className="text-gray-400 font-medium italic text-sm">No skills added yet. Click Edit Profile to add.</p>
                                        )}
                                    </div>

                                    {/* Social Links */}
                                    <div className="pt-6 border-t border-gray-100">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Network size={16} className="text-indigo-500" /> Social Links
                                        </h3>
                                        {isEditing ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                    <Linkedin size={20} className="text-blue-600 shrink-0" />
                                                    <input value={editData.socialLinks?.linkedin || ''} placeholder="LinkedIn URL"
                                                        onChange={e => setEditData({ ...editData, socialLinks: { ...editData.socialLinks, linkedin: e.target.value } })}
                                                        className="flex-1 bg-transparent outline-none font-bold text-gray-900 text-sm" />
                                                </div>
                                                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                    <Twitter size={20} className="text-sky-500 shrink-0" />
                                                    <input value={editData.socialLinks?.twitter || ''} placeholder="Twitter URL"
                                                        onChange={e => setEditData({ ...editData, socialLinks: { ...editData.socialLinks, twitter: e.target.value } })}
                                                        className="flex-1 bg-transparent outline-none font-bold text-gray-900 text-sm" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                {profile.socialLinks?.linkedin && /^https?:\/\//i.test(profile.socialLinks.linkedin) && (
                                                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                                        className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors">
                                                        <Linkedin size={20} />
                                                    </a>
                                                )}
                                                {profile.socialLinks?.twitter && /^https?:\/\//i.test(profile.socialLinks.twitter) && (
                                                    <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                                                        className="p-3 bg-sky-50 text-sky-500 rounded-2xl hover:bg-sky-100 transition-colors">
                                                        <Twitter size={20} />
                                                    </a>
                                                )}
                                                {!profile.socialLinks?.linkedin && !profile.socialLinks?.twitter && (
                                                    <p className="text-sm text-gray-400 font-medium italic">No social links added yet.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── BANKING ── */}
                            {activeTab === 'banking' && (
                                <>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                        <CreditCard size={18} className="text-indigo-500" /> Banking Details
                                    </h3>
                                    {!isEditing && !profile.bankingDetails?.accountNumber && (
                                        <div className="text-center py-8 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <AlertTriangle size={36} className="text-amber-400 mx-auto mb-2" />
                                            <p className="font-bold text-gray-600">No banking details configured.</p>
                                            <p className="text-sm text-gray-400 mt-1">Click "Edit Profile" to add your bank information.</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {[
                                            { label: 'Bank Name', key: 'bankName', placeholder: 'e.g. HDFC Bank' },
                                            { label: 'Account Holder', key: 'accountHolder', placeholder: 'Name as per records' },
                                            { label: 'Account Number', key: 'accountNumber', placeholder: 'Enter account number' },
                                            { label: 'IFSC Code', key: 'ifscCode', placeholder: 'e.g. HDFC0001234' },
                                            { label: 'Branch Name', key: 'branchName', placeholder: 'Enter branch location' },
                                        ].map(field => (
                                            <div key={field.key} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-all">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{field.label}</p>
                                                {isEditing ? (
                                                    <input className="w-full bg-white px-4 py-3 rounded-xl border border-gray-100 outline-none font-bold text-gray-900 focus:border-indigo-300"
                                                        value={editData.bankingDetails?.[field.key] || ''}
                                                        placeholder={field.placeholder}
                                                        onChange={e => setEditData((p: any) => ({ ...p, bankingDetails: { ...p.bankingDetails, [field.key]: e.target.value } }))} />
                                                ) : (
                                                    <p className="text-base font-black text-gray-900">{profile.bankingDetails?.[field.key] || '—'}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Sidebar ──────────────────────────────────────────────── */}
                <div className="space-y-8">
                    {/* Contact */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                <Heart size={20} />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contact</h3>
                        </div>
                        {isEditing ? (
                            <div className="space-y-4">
                                <InputField label="Contact Email" value={editData.contactEmail || ''}
                                    onChange={(e: any) => setEditData({ ...editData, contactEmail: e.target.value })} />
                                <InputField label="Contact Phone" value={editData.contactPhone || ''}
                                    onChange={(e: any) => setEditData({ ...editData, contactPhone: e.target.value })} />
                                <InputField label="Experience (Years)" value={editData.experienceYears?.toString() || '0'}
                                    onChange={(e: any) => setEditData({ ...editData, experienceYears: Number(e.target.value) })} />
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={16} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                                        <p className="text-sm font-bold text-gray-800">{profile.contactPhone || user.phone || 'Not set'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Mail size={16} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                                        <p className="text-sm font-bold text-gray-800">{profile.contactEmail || user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin size={16} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Branch</p>
                                        <p className="text-sm font-bold text-gray-800">{user.branch || 'Not set'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 p-5 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[1.5rem] text-white relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-10%] w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform" />
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles size={12} /> TL Authorization
                            </p>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed mb-2">Full team supervisory access over assigned service domain.</p>
                            <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">ID: {user.uniqueId || 'TL-XXXX'}</div>
                        </div>
                    </div>

                    {/* Credentials */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={16} className="text-indigo-500" /> Credentials
                        </h3>
                        <ProfileField icon={Briefcase} label="Role" value={user.role?.toUpperCase() || 'TL'} color="indigo" />
                        <ProfileField icon={Building2} label="Department" value={user.department?.toUpperCase() || 'Operations'} color="blue" />
                        <ProfileField icon={Target} label="Service" value={user.service || 'Bio-Sciences'} color="emerald" />
                        <ProfileField icon={GraduationCap} label="Seniority" value={user.seniority || 'Senior'} color="purple" />
                    </div>

                    {/* Status */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-2 shadow-sm">
                        {[
                            { label: 'Network Security', value: 'Protected', color: 'emerald' },
                            { label: 'System Uptime', value: '99.9%', color: 'blue' },
                            { label: 'Banking', value: profile.bankingDetails?.accountNumber ? 'Linked' : 'Pending', color: profile.bankingDetails?.accountNumber ? 'indigo' : 'amber' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-6 rounded-[2.25rem] hover:bg-white transition-all group mb-1 last:mb-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">{item.label}</p>
                                <span className={`flex items-center gap-2 text-[10px] font-black text-${item.color}-600 bg-${item.color}-50 px-3 py-1 rounded-full border border-${item.color}-100`}>
                                    <span className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 animate-pulse`} />
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
