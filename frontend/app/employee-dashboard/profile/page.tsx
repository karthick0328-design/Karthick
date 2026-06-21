'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Briefcase, Award, Calendar, Shield, MapPin,
    Phone, Camera, Edit2, CheckCircle2, Activity, Clock,
    ChevronRight, Sparkles, GraduationCap, Building2,
    Database, Network, Zap, Heart, Save, X, Trash2, Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EmployeeProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        phone: '',
        address: '',
        bio: '',
        skills: [] as string[],
        education: [] as any[],
        professionalRole: '',
        company: ''
    });

    const [stats, setStats] = useState({
        activeProjects: 0,
        completedProjects: 0,
        pendingTasks: 0,
        attendanceRate: '98%'
    });

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUser(data.user);
                setFormData({
                    name: data.user.name || '',
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                    address: data.user.address || '',
                    bio: data.user.bio || '',
                    skills: data.user.skills || [],
                    education: data.user.education || [],
                    professionalRole: data.user.professionalRole || '',
                    company: data.user.company || ''
                });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            // toast.error('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserStats = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/projects/employee/assigned-projects`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            if (data.success) {
                const projects = data.data;
                setStats(prev => ({
                    ...prev,
                    activeProjects: projects.filter((p: any) => p.status === 'In Progress').length,
                    completedProjects: projects.filter((p: any) => p.status === 'Completed').length,
                    pendingTasks: projects.filter((p: any) => ['Assigned', 'Under Review', 'On Hold'].includes(p.status)).length
                }));
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        fetchUserProfile();
        fetchUserStats();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            // Only send fields the backend safely allows via PATCH /api/auth/profile
            const payload = {
                phone: formData.phone,
                address: formData.address || undefined,
                bio: formData.bio,
                skills: formData.skills,
                education: formData.education,
                professionalRole: formData.professionalRole,
                company: formData.company
            };
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Profile updated successfully');
                setIsEditing(false);
                fetchUserProfile();
            } else {
                const errorMsg = data.errors?.[0]?.message || data.message || 'Failed to update profile';
                toast.error(errorMsg);
                console.error('Profile update errors:', data.errors);
            }
        } catch (err) {
            console.error('Update error:', err);
            toast.error('An error occurred during update');
        } finally {
            setIsSaving(false);
        }
    };


    const addSkill = (skill: string) => {
        if (skill && !formData.skills.includes(skill)) {
            setFormData({ ...formData, skills: [...formData.skills, skill] });
        }
    };

    const removeSkill = (skill: string) => {
        setFormData({ ...formData, skills: formData.skills.filter((s: string) => s !== skill) });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900">User Data Not Found</h2>
                <p className="text-gray-500 mt-2">Please log in again to view your profile.</p>
            </div>
        );
    }

    const ProfileField = ({ icon: Icon, label, value, color = "blue" }: any) => (
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
            <div className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center mb-4 shadow-lg shadow-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <Icon size={22} className="text-white" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Hero Section */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 p-8 pt-12 text-white shadow-2xl shadow-indigo-900/20 group">
                <div className="absolute top-[-20%] right-[-5%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-5%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:items-end">
                    <div className="relative shadow-2xl rounded-[2.5rem]">
                        <div className="w-40 h-40 rounded-[2.5rem] bg-white p-1">
                            <div className="w-full h-full rounded-[2.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 border-2 border-indigo-100 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                <User size={80} strokeWidth={1} />
                            </div>
                        </div>
                        <button className="absolute bottom-2 right-2 p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:bg-slate-50 transition-colors border border-indigo-50">
                            <Camera size={18} />
                        </button>
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 italic">
                                {user.seniority || 'Professional'} Expert
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-400/30 text-emerald-300">
                                <CheckCircle2 size={10} /> Verified
                            </div>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight mb-2 drop-shadow-sm">{user.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-indigo-100/80 font-medium">
                            <div className="flex items-center gap-2">
                                <Mail size={16} /> {user.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={16} /> {user.address || 'Operations Center'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-8 py-3.5 bg-white text-indigo-600 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50 hover:shadow-xl hover:shadow-white/20 active:scale-95 flex items-center gap-2"
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-[1.25rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-white/20 active:scale-95 flex items-center gap-2"
                            >
                                <X size={16} /> Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {isEditing ? (
                    <motion.form
                        key="edit-form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onSubmit={handleUpdateProfile}
                        className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-xl space-y-8"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Edit Your Profile</h2>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                            >
                                {isSaving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-gray-900"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Office Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-gray-900"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Professional Bio</label>
                                <textarea
                                    rows={4}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold resize-none text-gray-900"
                                    placeholder="Write a short summary about your expertise..."
                                />
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skills & Expertise</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id="newSkill"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addSkill((e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-gray-900"
                                        placeholder="Add a skill (Press Enter)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('newSkill') as HTMLInputElement;
                                            addSkill(input.value);
                                            input.value = '';
                                        }}
                                        className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.skills.map((skill: string) => (
                                        <span key={skill} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            {skill}
                                            <button onClick={() => removeSkill(skill)} type="button">
                                                <X size={14} className="hover:text-rose-500" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.form>
                ) : (
                    <motion.div
                        key="profile-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* Stats Section */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <StatCard label="Active Projects" value={stats.activeProjects} icon={Activity} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" />
                                <StatCard label="Completed" value={stats.completedProjects} icon={CheckCircle2} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" />
                                <StatCard label="Tasks Pending" value={stats.pendingTasks} icon={Clock} colorClass="bg-gradient-to-br from-amber-500 to-orange-600" />
                                <StatCard label="Attendance" value={stats.attendanceRate} icon={Calendar} colorClass="bg-gradient-to-br from-purple-500 to-pink-600" />
                            </div>

                            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Professional Bio</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Personal Statement</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Sparkles size={24} />
                                    </div>
                                </div>
                                <p className="text-gray-600 font-medium leading-relaxed italic border-l-4 border-indigo-100 pl-6">
                                    {user.bio || "No bio added yet. Click edit profile to add your professional summary."}
                                </p>
                            </div>

                            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Professional Credentials</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Role & Authorization Level</p>
                                    </div>
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                                        <Shield size={24} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ProfileField icon={Briefcase} label="Current Role" value={user.role ? (user.role.toUpperCase() + ' Specialist') : 'Specialist'} color="blue" />
                                    <ProfileField icon={Award} label="Seniority Level" value={user.seniority || 'Junior'} color="purple" />
                                    <ProfileField icon={Building2} label="Department" value={user.department?.toUpperCase() || 'Operations'} color="indigo" />
                                    <ProfileField icon={GraduationCap} label="Service Domain" value={user.service || 'Research & Tech'} color="cyan" />
                                    <ProfileField icon={Shield} label="Security Token" value={user.uniqueId || 'BIO-6772-X0'} color="rose" />
                                    <ProfileField icon={Clock} label="Member Since" value="January 2024" color="amber" />
                                </div>
                            </div>

                            {/* Skill Tags */}
                            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <Zap size={18} className="text-amber-500" />
                                    <h3 className="text-sm font-black text-gray-900 tracking-widest uppercase">Expertise & Skills</h3>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {user.skills && user.skills.length > 0 ? user.skills.map((tag: string) => (
                                        <span key={tag} className="px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-default">
                                            {tag}
                                        </span>
                                    )) : (
                                        ['Data Science', 'NGS Analysis', 'Molecular Biology'].map((tag) => (
                                            <span key={tag} className="px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 italic shadow-sm">
                                                {tag}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Account Details Sidebar */}
                        <div className="space-y-8">
                            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                        <Heart size={20} />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Connect</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={16} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Mobile</p>
                                            <p className="text-sm font-bold text-gray-800">{user.phone || '+1 (555) 123-4567'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Network size={16} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Slack</p>
                                            <p className="text-sm font-bold text-gray-800">@{user.name.split(' ')[0].toLowerCase()}.biolab</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Database size={16} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Local IP</p>
                                            <p className="text-sm font-bold text-gray-800">192.168.1.104</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 p-5 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[1.5rem] text-white overflow-hidden relative group shadow-xl">
                                    <div className="absolute top-[-20%] right-[-10%] w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform" />
                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Sparkles size={12} /> Pro Account
                                    </p>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4">You have full administrative access for the assigned service modules.</p>
                                    <button className="text-xs font-black uppercase tracking-widest text-white border-b border-indigo-500 pb-1 hover:text-indigo-300 transition-colors">
                                        View Permissions
                                    </button>
                                </div>
                            </div>

                            {/* Quick Settings */}
                            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-2 shadow-sm">
                                {[
                                    { label: 'Cloud Syncing', value: 'Active', color: 'emerald' },
                                    { label: 'Telemetry', value: 'Live', color: 'blue' },
                                    { label: 'Security', value: 'Locked', color: 'indigo' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 rounded-[2.25rem] hover:bg-white transition-all group shadow-sm mb-1 last:mb-0">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">{item.label}</p>
                                        <span className={`flex items-center gap-2 text-[10px] font-black text-${item.color}-600 bg-${item.color}-50 px-3 py-1 rounded-full border border-${item.color}-100`}>
                                            <span className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 animate-pulse`} />
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
