'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building2,
    GraduationCap,
    Briefcase,
    Calendar,
    Shield,
    Edit3,
    Save,
    X,
    Camera,
    CheckCircle,
    AlertCircle,
    Loader2,
    Globe,
    BookOpen,
    Award,
    ChevronRight,
    Sparkles,
    Target,
} from 'lucide-react';
// Redundant imports removed (Header, Sidebar)

interface DecodedToken {
    sub?: string;
    id?: string;
    role: string;
    exp: number;
    name?: string;
}

interface PreviousExperience {
    prevCompany: string;
    prevRole: string;
    prevYearOfExperience: string;
    category: 'Full-time' | 'Part-time' | 'Internship' | 'Freelance' | 'Contract';
}

interface UserProfile {
    id: string;
    uniqueId: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    service?: string;
    seniority?: 'junior' | 'senior' | null;
    isVerified: boolean;
    address: string;
    country: string;
    location: string;
    membershipType: string;
    professionalRole: string;
    company: string;
    college: string;
    degree: string;
    highestDegree: string;
    currentYear: string;
    passOutYear: string;
    yearOfExperience: string;
    previousExperiences: PreviousExperience[];
    education?: Array<{
        institution: string;
        degree: string;
        year: string;
    }>;
    skills?: string[];
    bio: string;
    dob: string;
    branch: string;
    isWhatsApp: boolean;
}

const AUTH_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/auth';

const ProfilePage = () => {
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; role: string; id: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
    const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'education'>('personal');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: DecodedToken = jwtDecode(token);
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                toast.error('Session expired. Please log in again.');
                router.push('/Login/Signin');
                return;
            }

            const userName = decoded.name || 'User';
            const newUser = {
                name: userName,
                role: decoded.role,
                id: decoded.id || decoded.sub || ''
            };
            setUser(newUser);
            loadProfile(token);
        } catch (err) {
            console.error('Invalid token:', err);
            localStorage.removeItem('token');
            toast.error('Invalid session. Please log in again.');
            router.push('/Login/Signin');
        }
    }, [router]);

    const loadProfile = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${AUTH_API_BASE}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Profile not found. Please contact support.');
                }
                throw new Error(`Failed to load profile: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to load profile');
            }

            setProfile(data.user);
            setEditedProfile(data.user);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error loading profile';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No auth token');

            const response = await fetch(`${AUTH_API_BASE}/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editedProfile),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            const data = await response.json();
            if (data.success) {
                // Reload profile to get updated data
                await loadProfile(token);
                toast.success('Profile updated successfully!');
                setIsEditing(false);
            } else {
                throw new Error(data.message || 'Update failed');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error saving profile';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
        setEditedProfile(prev => ({ ...prev, [field]: value }));
    };

    const cancelEdit = () => {
        setEditedProfile(profile || {});
        setIsEditing(false);
    };

    const getMembershipBadgeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'student': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'scholar': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'faculty': return 'bg-green-100 text-green-700 border-green-200';
            case 'industry': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'employee': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin': return 'bg-red-500 text-white';
            case 'subadmin': return 'bg-orange-500 text-white';
            case 'manager': return 'bg-blue-500 text-white';
            case 'employee': return 'bg-green-500 text-white';
            case 'tl': return 'bg-purple-500 text-white';
            case 'head': return 'bg-indigo-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-2xl animate-spin shadow-xl"></div>
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Identity...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 max-w-md">
                    <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Sync Interrupted</h2>
                    <p className="text-slate-400 font-bold mb-10 leading-relaxed">{error}</p>
                    <button
                        onClick={() => {
                            const token = localStorage.getItem('token');
                            if (token) loadProfile(token);
                        }}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                    >
                        Re-establish Link
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />
            <div className="w-full flex-1 flex flex-col space-y-10">
                {/* Hero Section with Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-white border border-slate-100 rounded-[3.5rem] p-12 shadow-sm"
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-50 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-12">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <motion.div
                                whileHover={{ scale: 1.05, rotate: -2 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                className="w-48 h-48 bg-slate-900 border border-slate-800 rounded-[3rem] flex items-center justify-center text-white text-7xl font-black shadow-2xl shadow-slate-200 ring-[12px] ring-white relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                {profile?.name?.charAt(0).toUpperCase() || 'U'}
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className="absolute -bottom-2 -right-2 w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl border border-slate-50 ring-4 ring-white"
                            >
                                {profile?.isVerified ? (
                                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                                ) : (
                                    <AlertCircle className="w-7 h-7 text-rose-500" />
                                )}
                            </motion.div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 text-center md:text-left pt-6">
                            <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-6 mb-8">
                                <div className="space-y-2">
                                    <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                                        {profile?.name || 'User Identity'}
                                    </h1>
                                    <p className="text-slate-400 font-bold text-lg">Central Operations Personnel</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100">
                                        {profile?.role || 'User'} Entity
                                    </span>
                                    {profile?.seniority && (
                                        <span className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200">
                                            {profile.seniority} Node
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-400 font-bold text-sm mb-6">
                                <span className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-300" />
                                    {profile?.email}
                                </span>
                                {profile?.phone && (
                                    <span className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-300" />
                                        {profile.phone}
                                        {profile.isWhatsApp && (
                                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-100">Verified WA</span>
                                        )}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                {profile?.uniqueId && (
                                    <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        UID: {profile.uniqueId}
                                    </span>
                                )}
                                {profile?.membershipType && (
                                    <span className="px-4 py-2 bg-white border border-slate-100 shadow-sm rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        {profile.membershipType} Tier
                                    </span>
                                )}
                                {profile?.branch && (
                                    <span className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {profile.branch}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Edit Button */}
                        <div className="mt-4 md:mt-0 pt-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-slate-200"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    Modify Profile
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={saveProfile}
                                        disabled={saving}
                                        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Commit
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                        Discard
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Tab Navigation */}
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {[
                        { id: 'personal', label: 'Identity Matrix', icon: User },
                        { id: 'professional', label: 'Career Portfolio', icon: Briefcase },
                        { id: 'education', label: 'Academic Record', icon: GraduationCap },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-4 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.05] z-10'
                                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:rotate-12'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'personal' && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-12"
                            >
                                <div className="flex items-center justify-between mb-12">
                                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100/50">
                                            <User className="w-7 h-7 text-indigo-600" />
                                        </div>
                                        Identity Matrix
                                    </h2>
                                    <div className="h-[2px] flex-1 mx-8 bg-slate-50 hidden md:block" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Name */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Identity Signature</label>
                                        <div className="relative group">
                                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={profile?.name || ''}
                                                disabled
                                                className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold text-sm"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                <Shield className="w-4 h-4 text-slate-200" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Communication Protocol</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="email"
                                                value={profile?.email || ''}
                                                disabled
                                                className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold text-sm"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                                <Shield className="w-4 h-4 text-slate-200" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Direct Link (Phone)</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="tel"
                                                value={isEditing ? (editedProfile?.phone || '') : (profile?.phone || '')}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="+X XXX-XXX-XXXX"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* WhatsApp Toggle */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Communication Line</label>
                                        <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100/50 transition-all group">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                                <Phone className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">WhatsApp Link</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(isEditing ? editedProfile?.isWhatsApp : profile?.isWhatsApp) ? 'Protocol Active' : 'Offline Mode'}</p>
                                            </div>
                                            <button
                                                onClick={() => isEditing && handleInputChange('isWhatsApp', !editedProfile?.isWhatsApp)}
                                                disabled={!isEditing}
                                                className={`relative w-12 h-6 rounded-full transition-all duration-500 ${(isEditing ? editedProfile?.isWhatsApp : profile?.isWhatsApp)
                                                    ? 'bg-emerald-500'
                                                    : 'bg-slate-300'
                                                    } ${!isEditing && 'opacity-30 cursor-not-allowed'}`}
                                            >
                                                <div
                                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-500 ${(isEditing ? editedProfile?.isWhatsApp : profile?.isWhatsApp)
                                                        ? 'left-7'
                                                        : 'left-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Geographic Node (Address)</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <textarea
                                                value={isEditing ? (editedProfile?.address || '') : (profile?.address || '')}
                                                onChange={(e) => handleInputChange('address', e.target.value)}
                                                disabled={!isEditing}
                                                rows={3}
                                                placeholder="Industrial sector, city, region..."
                                                className={`w-full pl-16 pr-8 py-6 border-none rounded-[2rem] transition-all duration-500 font-bold text-sm resize-none ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Country */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">National Jurisdiction</label>
                                        <div className="relative group">
                                            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none z-10" />
                                            <select
                                                value={isEditing ? (editedProfile?.country || '') : (profile?.country || '')}
                                                onChange={(e) => handleInputChange('country', e.target.value)}
                                                disabled={!isEditing}
                                                className={`w-full pl-16 pr-12 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm appearance-none cursor-pointer ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            >
                                                <option value="">Select Jurisdiction</option>
                                                <option value="Indian">Indian Domain</option>
                                                <option value="Foreign">External Domain</option>
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Sector Hub (Location)</label>
                                        <div className="relative group">
                                            <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.location || '') : (profile?.location || '')}
                                                onChange={(e) => handleInputChange('location', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="City, State"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Operational Summary (Bio)</label>
                                        <textarea
                                            value={isEditing ? (editedProfile?.bio || '') : (profile?.bio || '')}
                                            onChange={(e) => handleInputChange('bio', e.target.value)}
                                            disabled={!isEditing}
                                            rows={4}
                                            placeholder="Synthesize your professional background..."
                                            className={`w-full px-8 py-6 border-none rounded-[2.5rem] transition-all duration-500 font-bold text-sm resize-none ${isEditing
                                                ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                : 'bg-slate-50 text-slate-900'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'professional' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-12"
                            >
                                <div className="flex items-center justify-between mb-12">
                                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
                                            <Briefcase className="w-7 h-7 text-white" />
                                        </div>
                                        Career Portfolio
                                    </h2>
                                    <div className="h-[2px] flex-1 mx-8 bg-slate-50 hidden md:block" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Company */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Operational Node (Company)</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.company || '') : (profile?.company || '')}
                                                onChange={(e) => handleInputChange('company', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="Alpha HQ"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Professional Role */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Deployment Status (Role)</label>
                                        <div className="relative group">
                                            <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.professionalRole || '') : (profile?.professionalRole || '')}
                                                onChange={(e) => handleInputChange('professionalRole', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="System Architect"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Experience Year */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Temporal Experience</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.yearOfExperience || '') : (profile?.yearOfExperience || '')}
                                                onChange={(e) => handleInputChange('yearOfExperience', e.target.value)}
                                                placeholder="Years in service"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing
                                                    ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200'
                                                    : 'bg-slate-50 text-slate-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Previous Experience Timeline */}
                                <div className="mt-16 space-y-10">
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Phase History</h3>
                                        <div className="h-[2px] flex-1 bg-slate-50" />
                                    </div>
                                    <div className="space-y-6">
                                        {(isEditing ? editedProfile?.previousExperiences : profile?.previousExperiences)?.map((exp, idx) => (
                                            <div key={idx} className="group p-8 bg-slate-50 hover:bg-white rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-500 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                                            <Briefcase className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-black text-slate-900">{exp.prevRole}</h4>
                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{exp.prevCompany}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="px-5 py-2 bg-white rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-slate-100 shadow-sm">{exp.prevYearOfExperience} Years</span>
                                                        <span className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{exp.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'education' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 p-12"
                            >
                                <div className="flex items-center justify-between mb-12">
                                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100/50">
                                            <GraduationCap className="w-7 h-7 text-indigo-600" />
                                        </div>
                                        Academic Record
                                    </h2>
                                    <div className="h-[2px] flex-1 mx-8 bg-slate-50 hidden md:block" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* College */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Universal Institution</label>
                                        <div className="relative group">
                                            <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.college || '') : (profile?.college || '')}
                                                onChange={(e) => handleInputChange('college', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="Nexus Academy"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200' : 'bg-slate-50 text-slate-900'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Degree */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Academic Qualification</label>
                                        <div className="relative group">
                                            <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.degree || '') : (profile?.degree || '')}
                                                onChange={(e) => handleInputChange('degree', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="B.S. Computational Biology"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200' : 'bg-slate-50 text-slate-900'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Highest Degree */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Attainment Level</label>
                                        <div className="relative group">
                                            <Award className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none z-10" />
                                            <select
                                                value={isEditing ? (editedProfile?.highestDegree || '') : (profile?.highestDegree || '')}
                                                onChange={(e) => handleInputChange('highestDegree', e.target.value)}
                                                disabled={!isEditing}
                                                className={`w-full pl-16 pr-12 py-5 border-none rounded-2xl transition-all duration-500 font-black uppercase tracking-widest text-[10px] appearance-none cursor-pointer ${isEditing ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900' : 'bg-slate-50 text-slate-900'}`}
                                            >
                                                <option value="">Select Level</option>
                                                <option value="Bachelor">Bachelor Degree</option>
                                                <option value="Master">Master Degree</option>
                                                <option value="Ph.D.">Doctoral Ph.D.</option>
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Pass Out Year */}
                                    <div className="space-y-4">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Completion Year</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                            <input
                                                type="text"
                                                value={isEditing ? (editedProfile?.passOutYear || '') : (profile?.passOutYear || '')}
                                                onChange={(e) => handleInputChange('passOutYear', e.target.value)}
                                                disabled={!isEditing}
                                                placeholder="20XX"
                                                className={`w-full pl-16 pr-8 py-5 border-none rounded-2xl transition-all duration-500 font-bold text-sm ${isEditing ? 'bg-slate-50 focus:ring-4 focus:ring-indigo-50 text-slate-900 placeholder:text-slate-200' : 'bg-slate-50 text-slate-900'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Section */}
                                <div className="mt-16 space-y-10">
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cognitive Patterns (Skills)</h3>
                                        <div className="h-[2px] flex-1 bg-slate-50" />
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {(profile?.skills || ['Leadership', 'Analysis', 'Strategy']).map((skill, idx) => (
                                            <motion.span
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center gap-3 hover:scale-110 transition-transform cursor-default"
                                            >
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                                                {skill}
                                            </motion.span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar Quick Info */}
                    <div className="space-y-6">
                        {/* Account Status Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10"
                        >
                            <h3 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-4 tracking-tight">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                                    <Shield className="w-6 h-6 text-emerald-600" />
                                </div>
                                System Status
                            </h3>

                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identification Verification</span>
                                    <div className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${profile?.isVerified ? 'text-emerald-600' : 'text-amber-500'}`}>
                                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${profile?.isVerified ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                                        {profile?.isVerified ? 'Protocol Verified' : 'Pending Authorization'}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Security Clearance</span>
                                    <div className="flex items-center gap-3">
                                        <span className="px-4 py-2 bg-indigo-600 border border-slate-100 rounded-xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-100">
                                            {profile?.role?.toUpperCase()} ACCESS
                                        </span>
                                    </div>
                                </div>

                                {profile?.service && (
                                    <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Deployment</span>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">{profile.service}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Quick Stats */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-900 rounded-[3rem] shadow-2xl p-10 text-white relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/30 transition-colors duration-1000" />

                            <h3 className="text-xl font-black mb-10 tracking-tight flex items-center gap-4">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                Metric Sync
                            </h3>

                            <div className="space-y-8">
                                {[
                                    { label: 'Time in Service', value: `${profile?.yearOfExperience || 0} Cycles`, icon: Calendar },
                                    { label: 'Phase History', value: `${profile?.previousExperiences?.length || 0} Nodes`, icon: Briefcase },
                                    { label: 'Cognitive Depth', value: `${profile?.skills?.length || 0} Patterns`, icon: Target },
                                ].map((stat, idx) => (
                                    <div key={idx} className="flex items-center gap-6 group/stat">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 group-hover/stat:bg-indigo-500 group-hover/stat:border-indigo-400 transition-all duration-500">
                                            <stat.icon className="w-6 h-6 text-indigo-300 group-hover/stat:text-white" />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                                            <p className="font-black text-lg tracking-tight">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Help Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-indigo-50 rounded-[3rem] p-10 border border-indigo-100 relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-200/50 mb-6">
                                    <AlertCircle className="w-7 h-7 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Support Link</h3>
                                <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed">
                                    Restricted fields (Identity/Protocol) require authorization for modification.
                                </p>
                                <button className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white shadow-xl shadow-indigo-100/30 transition-all group/btn w-full justify-center">
                                    Secure Support Channel
                                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
