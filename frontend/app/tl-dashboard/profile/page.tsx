'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, MapPin, Briefcase, Award, Shield,
    Camera, Edit2, CheckCircle2, Activity, Clock, Sparkles,
    GraduationCap, Building2, Network, Zap, Heart, Save, X,
    Plus, Trash2, Star, Target, BookOpen, BarChart3, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function TLProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'education' | 'skills' | 'team'>('overview');
    const [newSkill, setNewSkill] = useState('');
    const [newDomain, setNewDomain] = useState('');
    const [stats, setStats] = useState({ managed: 0, active: 0, completed: 0, teamSize: 0 });

    const [formData, setFormData] = useState<any>({
        phone: '', address: '', bio: '',
        skills: [] as string[],
        education: [] as any[],
        professionalRole: '', company: '',
        domains: [] as string[],
    });

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const u = data.user;
                setUser(u);
                setFormData({
                    phone: u.phone || '',
                    address: u.address || '',
                    bio: u.bio || '',
                    skills: u.skills || [],
                    education: u.education || [],
                    professionalRole: u.professionalRole || '',
                    company: u.company || '',
                    domains: u.domains || [],
                });
            }
        } catch (err) {
            console.error('Profile fetch error:', err);
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/projects/tl/assigned-projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const projects = data.data;
                setStats({
                    managed: projects.length,
                    active: projects.filter((p: any) => p.status === 'In Progress').length,
                    completed: projects.filter((p: any) => p.status === 'Completed').length,
                    teamSize: [...new Set(projects.flatMap((p: any) => p.teamMembers || []))].length || 0,
                });
            }
        } catch (err) { console.error('Stats error:', err); }
    };

    useEffect(() => { fetchProfile(); fetchStats(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                phone: formData.phone,
                address: formData.address || undefined,
                bio: formData.bio,
                skills: formData.skills,
                education: formData.education,
                professionalRole: formData.professionalRole,
                company: formData.company,
                domains: formData.domains,
            };
            const res = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Leadership profile updated!');
                setIsEditing(false);
                fetchProfile();
            } else {
                const msg = data.errors?.[0]?.message || data.message || 'Update failed';
                toast.error(msg);
            }
        } catch { toast.error('Network error'); }
        finally { setIsSaving(false); }
    };

    const addItem = (field: string, value: any) =>
        setFormData((p: any) => ({ ...p, [field]: [...(p[field] || []), value] }));
    const removeItem = (field: string, idx: number) =>
        setFormData((p: any) => ({ ...p, [field]: p[field].filter((_: any, i: number) => i !== idx) }));
    const updateItem = (field: string, idx: number, value: any) =>
        setFormData((p: any) => { const arr = [...p[field]]; arr[idx] = value; return { ...p, [field]: arr }; });

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!user) return (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Leadership Data Not Found</h2>
            <p className="text-gray-500 mt-2">Please log in again to view your profile.</p>
        </div>
    );

    // ─── Sub-components ────────────────────────────────────────────────────────
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
        { id: 'education', label: 'Education', icon: BookOpen },
        { id: 'skills', label: 'Skills', icon: Zap },
        { id: 'team', label: 'Team Stats', icon: BarChart3 },
    ];

    // ─── Main Render ───────────────────────────────────────────────────────────
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* ── Hero ── */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 p-8 pt-12 text-white shadow-2xl shadow-indigo-900/20 group">
                <div className="absolute top-[-20%] right-[-5%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-5%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:items-end">
                    {/* Avatar placeholder */}
                    <div className="relative">
                        <div className="w-40 h-40 rounded-[2.5rem] bg-white p-1 shadow-2xl">
                            <div className="w-full h-full rounded-[2.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 border-2 border-indigo-100 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                <User size={80} strokeWidth={1} />
                            </div>
                        </div>
                        <button className="absolute bottom-2 right-2 p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:bg-slate-50 transition-colors border border-indigo-50">
                            <Camera size={18} />
                        </button>
                    </div>

                    {/* Name & Info */}
                    <div className="text-center md:text-left flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                Team Lead
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/30 text-indigo-200">
                                <Star size={10} /> Senior Management
                            </div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight mb-2 drop-shadow-sm">{user.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-indigo-100/80 font-medium">
                            <div className="flex items-center gap-2"><Mail size={16} />{user.email}</div>
                            <div className="flex items-center gap-2"><MapPin size={16} />{user.address || 'Regional Hub'}</div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 shrink-0">
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} disabled={isSaving}
                                    className="px-7 py-3.5 bg-white text-indigo-600 rounded-[1.25rem] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all shadow-xl">
                                    {isSaving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save All
                                </button>
                                <button onClick={() => setIsEditing(false)}
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

            {/* ── Body Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left + Center: Stats + Tabs */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Managed" value={stats.managed} icon={Target} colorClass="bg-gradient-to-br from-indigo-600 to-indigo-800" />
                        <StatCard label="Active" value={stats.active} icon={Activity} colorClass="bg-gradient-to-br from-blue-500 to-cyan-600" />
                        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" />
                        <StatCard label="Team Size" value={stats.teamSize || '—'} icon={Users} colorClass="bg-gradient-to-br from-purple-500 to-pink-600" />
                    </div>

                    {/* Tab Bar */}
                    <div className="flex gap-2 p-1.5 bg-white/60 backdrop-blur-xl border border-white rounded-2xl w-fit shadow-sm">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:text-gray-700 hover:bg-white'}`}>
                                <tab.icon size={14} />{tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm space-y-8">

                            {/* ── OVERVIEW ── */}
                            {activeTab === 'overview' && (
                                <>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Sparkles size={18} className="text-indigo-500" /> Leadership Statement
                                        </h3>
                                        {isEditing ? (
                                            <InputField value={formData.bio} multiline placeholder="Write your leadership vision or professional summary..."
                                                onChange={(e: any) => setFormData({ ...formData, bio: e.target.value })} />
                                        ) : (
                                            <p className="text-gray-600 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-6">
                                                {user.bio || 'No leadership statement added yet. Click Edit Profile to add your professional summary.'}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Shield size={18} className="text-indigo-500" /> Professional Credentials
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <ProfileField icon={Briefcase} label="Official Role" value="Team Lead (Bio-Operations)" color="indigo" />
                                            <ProfileField icon={Award} label="Seniority" value={user.seniority || 'Senior Lead'} color="purple" />
                                            <ProfileField icon={Building2} label="Department" value={user.department?.toUpperCase() || 'Operations'} color="blue" />
                                            <ProfileField icon={GraduationCap} label="Service Domain" value={user.service || 'Research Management'} color="cyan" />
                                            <ProfileField icon={Shield} label="Access Token" value={user.uniqueId || 'TL-XXXX'} color="rose" />
                                            <ProfileField icon={Phone} label="Phone" value={user.phone || formData.phone || 'Not set'} color="amber" />
                                        </div>
                                        {isEditing && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <InputField label="Phone Number" value={formData.phone}
                                                    onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="+91 XXXXX XXXXX" />
                                                <InputField label="Office Address" value={formData.address}
                                                    onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                                                    placeholder="Hub location..." />
                                            </div>
                                        )}
                                    </div>

                                    {/* Operational Domains */}
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Zap size={18} className="text-amber-500" /> Operational Domains
                                        </h3>
                                        {isEditing && (
                                            <div className="flex gap-2 mb-4">
                                                <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Add a domain..."
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem('domains', newDomain); setNewDomain(''); } }}
                                                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-indigo-300 outline-none font-bold text-gray-900" />
                                                <button type="button" onClick={() => { addItem('domains', newDomain); setNewDomain(''); }}
                                                    className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100">
                                                    <Plus size={24} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-3">
                                            {(formData.domains.length > 0 ? formData.domains : (user.domains || [])).map((d: string, i: number) => (
                                                <span key={i} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                                    {d}
                                                    {isEditing && <button onClick={() => removeItem('domains', i)}><X size={12} className="hover:text-rose-500" /></button>}
                                                </span>
                                            ))}
                                            {(formData.domains.length === 0 && (!user.domains || user.domains.length === 0)) && !isEditing && (
                                                ['Team Leadership', 'Clinical Research', 'Strategic Planning'].map(d => (
                                                    <span key={d} className="px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 italic shadow-sm">{d}</span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── EDUCATION ── */}
                            {activeTab === 'education' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                            <GraduationCap size={18} className="text-indigo-500" /> Academic Background
                                        </h3>
                                        {isEditing && (
                                            <button onClick={() => addItem('education', { degree: '', institution: '', year: '' })}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100">
                                                <Plus size={14} /> Add Record
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-5 relative before:absolute before:left-6 before:top-2 before:bottom-0 before:w-0.5 before:bg-indigo-50">
                                        {formData.education.map((edu: any, idx: number) => (
                                            <div key={idx} className="relative pl-16 group">
                                                <div className="absolute left-0 top-1 w-12 h-12 rounded-2xl bg-white border-2 border-indigo-100 flex items-center justify-center z-10 group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-400 group-hover:bg-white" />
                                                </div>
                                                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-indigo-200 transition-all">
                                                    {isEditing ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <InputField label="Degree / Qualification" value={edu.degree}
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
                                        {formData.education.length === 0 && (
                                            <div className="pl-4 py-8 text-center">
                                                <BookOpen size={36} className="text-gray-200 mx-auto mb-3" />
                                                <p className="text-gray-400 font-medium italic">No education records yet.</p>
                                                {isEditing && (
                                                    <button onClick={() => addItem('education', { degree: '', institution: '', year: '' })}
                                                        className="mt-3 text-xs font-black text-indigo-500 hover:underline">+ Add first record</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* ── SKILLS ── */}
                            {activeTab === 'skills' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                            <Zap size={18} className="text-amber-500" /> Technical Expertise
                                        </h3>
                                    </div>
                                    {isEditing && (
                                        <div className="flex gap-2">
                                            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add a skill..."
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem('skills', newSkill); setNewSkill(''); } }}
                                                className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-indigo-300 outline-none font-bold text-gray-900" />
                                            <button type="button" onClick={() => { addItem('skills', newSkill); setNewSkill(''); }}
                                                className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100">
                                                <Plus size={24} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                        {formData.skills.map((skill: string, idx: number) => (
                                            <span key={idx} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                                {skill}
                                                {isEditing && (
                                                    <button onClick={() => removeItem('skills', idx)}>
                                                        <X size={12} className="hover:text-rose-500" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                        {formData.skills.length === 0 && !isEditing && (
                                            ['Team Leadership', 'Risk Assessment', 'Advanced Analytics'].map(s => (
                                                <span key={s} className="px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 italic shadow-sm">{s}</span>
                                            ))
                                        )}
                                    </div>
                                    {formData.skills.length === 0 && !isEditing && (
                                        <p className="text-center text-gray-400 text-sm font-medium italic">No skills added. Click Edit Profile to add.</p>
                                    )}

                                    {/* Professional Role / Company (edit mode) */}
                                    {isEditing && (
                                        <div className="pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="Professional Role / Title" value={formData.professionalRole}
                                                onChange={(e: any) => setFormData({ ...formData, professionalRole: e.target.value })} placeholder="e.g. Senior Team Lead" />
                                            <InputField label="Company / Organisation" value={formData.company}
                                                onChange={(e: any) => setFormData({ ...formData, company: e.target.value })} placeholder="e.g. BioLab Pvt Ltd" />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ── TEAM STATS ── */}
                            {activeTab === 'team' && (
                                <>
                                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                        <BarChart3 size={18} className="text-indigo-500" /> Team Performance Overview
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {[
                                            { label: 'Total Projects Managed', value: stats.managed, color: 'indigo', icon: Target },
                                            { label: 'Currently Active', value: stats.active, color: 'blue', icon: Activity },
                                            { label: 'Successfully Completed', value: stats.completed, color: 'emerald', icon: CheckCircle2 },
                                            { label: 'Team Members', value: stats.teamSize || 'N/A', color: 'purple', icon: Users },
                                        ].map((item, i) => (
                                            <div key={i} className={`p-6 rounded-2xl bg-${item.color}-50 border border-${item.color}-100 hover:shadow-md transition-all group`}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`p-2.5 rounded-xl bg-${item.color}-100 text-${item.color}-600`}>
                                                        <item.icon size={20} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                                                </div>
                                                <p className={`text-4xl font-black text-${item.color}-700 tracking-tighter`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 mt-2">
                                        <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Performance Rate</p>
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-black text-indigo-700">
                                                {stats.managed > 0 ? `${Math.round((stats.completed / stats.managed) * 100)}%` : '—'}
                                            </span>
                                            <span className="text-sm text-gray-400 font-medium mb-1">project completion rate</span>
                                        </div>
                                        <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                                style={{ width: stats.managed > 0 ? `${Math.round((stats.completed / stats.managed) * 100)}%` : '0%' }} />
                                        </div>
                                    </div>
                                </>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Right Sidebar ── */}
                <div className="space-y-8">
                    {/* Contact / Network */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                <Heart size={20} />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contact</h3>
                        </div>
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={16} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Direct Line</p>
                                    <p className="text-sm font-bold text-gray-800">{user.phone || formData.phone || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Network size={16} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bio-Net ID</p>
                                    <p className="text-sm font-bold text-gray-800">lead.{user.name?.split(' ')[0]?.toLowerCase() || 'tl'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin size={16} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                                    <p className="text-sm font-bold text-gray-800">{user.address || 'Not set'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-5 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[1.5rem] text-white relative overflow-hidden group">
                            <div className="absolute top-[-20%] right-[-10%] w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform" />
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles size={12} /> Pro-Lead Access
                            </p>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed mb-3">Full supervisory authority over assigned team modules.</p>
                            <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                                ID: {user.uniqueId || 'TL-XXXX'}
                            </div>
                        </div>
                    </div>

                    {/* Credentials Sidebar */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm space-y-4">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={16} className="text-indigo-500" /> Authority Level
                        </h3>
                        <ProfileField icon={Briefcase} label="Role" value="Team Lead" color="indigo" />
                        <ProfileField icon={Building2} label="Department" value={user.department?.toUpperCase() || 'Operations'} color="blue" />
                        <ProfileField icon={GraduationCap} label="Service" value={user.service || 'Research'} color="emerald" />
                        <ProfileField icon={Award} label="Seniority" value={user.seniority || 'Senior'} color="purple" />
                    </div>

                    {/* Status Panel */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-2 shadow-sm">
                        {[
                            { label: 'Network Security', value: 'Protected', color: 'emerald' },
                            { label: 'System Uptime', value: '99.9%', color: 'blue' },
                            { label: 'Lead Verification', value: 'Active', color: 'indigo' },
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
