'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Award,
    BookOpen,
    Settings,
    Shield,
    Linkedin,
    Twitter,
    Edit,
    Save,
    Plus,
    Trash2,
    Camera,
    Globe,
    Loader2,
    Menu,
    CreditCard,
    Zap,
    AlertTriangle
} from 'lucide-react';
import { validateURL } from '@/lib/validation';
// Redundant imports removed (Header, Sidebar)

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/hr-profile';

interface HRProfileData {
    userId: {
        _id: string;
        name: string;
        email: string;
        uniqueId: string;
        role: string;
        department: string;
        branch: string;
    };
    bio: string;
    specialization: string[];
    certifications: {
        name: string;
        issuer: string;
        year: string;
    }[];
    experienceYears: number;
    education: {
        degree: string;
        institution: string;
        year: string;
    }[];
    skills: string[];
    achievements: string[];
    contactEmail: string;
    contactPhone: string;
    profileImage: string;
    socialLinks: {
        linkedin: string;
        twitter: string;
    };
    bankingDetails?: {
        bankName: string;
        accountHolder: string;
        accountNumber: string;
        ifscCode: string;
        branchName: string;
    };
}

export default function HRProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<HRProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'skills' | 'banking' | 'settings'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                router.push('/Login/Signin');
                return;
            }
            fetchProfile(token);
        } catch (error) {
            console.error('Auth error:', error);
            router.push('/Login/Signin');
        }
    }, [router]);

    const addItem = (field: string, defaultValue: any) => {
        setEditFormData((prev: any) => ({
            ...prev,
            [field]: [...(prev[field] || []), defaultValue]
        }));
    };

    const removeItem = (field: string, index: number) => {
        setEditFormData((prev: any) => ({
            ...prev,
            [field]: (prev[field] || []).filter((_: any, i: number) => i !== index)
        }));
    };

    const updateItem = (field: string, index: number, value: any) => {
        setEditFormData((prev: any) => {
            const next = { ...prev };
            const newList = [...(next[field] || [])];
            newList[index] = value;
            return { ...next, [field]: newList };
        });
    };

    const fetchProfile = async (token: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const rawData = data.data;
                // Sanitize at the source with explicit regex to break taint tracking
                const sanitizedData = {
                    ...rawData,
                    profileImage: (rawData.profileImage && /^(https?:\/\/|blob:|\/)/i.test(rawData.profileImage)) ? rawData.profileImage : undefined,
                    socialLinks: rawData.socialLinks ? {
                        linkedin: (rawData.socialLinks.linkedin && /^(https?:\/\/|blob:|\/)/i.test(rawData.socialLinks.linkedin)) ? rawData.socialLinks.linkedin : '',
                        twitter: (rawData.socialLinks.twitter && /^(https?:\/\/|blob:|\/)/i.test(rawData.socialLinks.twitter)) ? rawData.socialLinks.twitter : ''
                    } : undefined
                };

                if (!sanitizedData.bankingDetails) {
                    sanitizedData.bankingDetails = {
                        bankName: '',
                        accountHolder: '',
                        accountNumber: '',
                        ifscCode: '',
                        branchName: ''
                    };
                }
                setProfile(sanitizedData);
                setEditFormData(JSON.parse(JSON.stringify(sanitizedData)));
            } else {
                toast.error(data.message || 'Failed to load profile');
            }
        } catch (err) {
            toast.error('Network error loading profile');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editFormData)
            });
            const data = await res.json();
            if (data.success) {
                setProfile(data.data);
                setIsEditing(false);
                toast.success('Profile updated successfully');
            } else {
                toast.error(data.message || 'Update failed');
            }
        } catch (err) {
            toast.error('Network error during update');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingImage(true);
        try {
            const res = await fetch(`${API_BASE}/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const imageUrl = validateURL(data.data.imageUrl);
                setProfile(prev => prev ? { ...prev, profileImage: imageUrl } : null);
                setEditFormData((prev: any) => prev ? { ...prev, profileImage: imageUrl } : null);
                toast.success('Profile image updated');
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            toast.error('Network error during upload');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="animate-in fade-in duration-500">
            <Toaster position="top-right" />

            <main className="p-8 pt-20">
                {/* Cover & Profile Image Section */}
                <div className="relative mb-8">
                    <div className="h-64 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl shadow-lg"></div>
                    <div className="absolute -bottom-16 left-8 flex items-end gap-6">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-3xl border-4 border-white overflow-hidden shadow-2xl bg-white">
                                {profile.profileImage ? (
                                    <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-white">
                                        {(() => {
                                            const rawUrl = profile.profileImage;
                                            let finalSrc = '#';
                                            if (rawUrl && (rawUrl.startsWith('http') || rawUrl.startsWith('/') || rawUrl.startsWith('blob:'))) {
                                                finalSrc = rawUrl;
                                            }
                                            return (
                                                <img
                                                    src={finalSrc !== '#' ? encodeURI(finalSrc) : '#'}
                                                    alt={profile.userId.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    data-sanitized="true"
                                                />
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl disabled:opacity-50"
                                >
                                    {uploadingImage ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <div className="mb-4">
                            <h1 className="text-3xl font-bold text-white drop-shadow-md">{profile.userId.name}</h1>
                            <p className="text-white/80 font-medium flex items-center gap-2 drop-shadow-md">
                                <Shield size={16} />
                                {profile.userId.role} • {profile.userId.department}
                            </p>
                        </div>
                    </div>
                    <div className="absolute bottom-4 right-8">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border border-white/30"
                            >
                                <Edit size={18} />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-6 py-2 rounded-xl font-bold transition-all border border-white/30"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateProfile}
                                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                                >
                                    <Save size={18} />
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-24">
                    {/* Left Sidebar: Contact & Info */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Globe size={18} className="text-blue-600" />
                                Contact Info
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail size={18} />
                                    <span className="text-sm truncate">{isEditing ? (
                                        <input
                                            type="email"
                                            className="w-full bg-slate-50 p-1 rounded border border-slate-200 text-xs"
                                            value={editFormData?.contactEmail}
                                            onChange={e => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                                        />
                                    ) : profile.contactEmail}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone size={18} />
                                    <span className="text-sm">{isEditing ? (
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 p-1 rounded border border-slate-200 text-xs"
                                            value={editFormData?.contactPhone}
                                            onChange={e => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
                                        />
                                    ) : profile.contactPhone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin size={18} />
                                    <span className="text-sm">{profile.userId.branch}</span>
                                </div>
                            </div>
                            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                                {profile.socialLinks?.linkedin && (
                                    (() => {
                                        const rawUrl = profile.socialLinks.linkedin;
                                        const safeUrl = (rawUrl && /^(https?:\/\/|blob:|\/)/i.test(rawUrl)) ? rawUrl : '#';
                                        return (
                                            <a
                                                href={safeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-400 transition-colors"
                                                data-sanitized="yes"
                                            >
                                                <Linkedin size={20} />
                                            </a>
                                        );
                                    })()
                                )}
                                {profile.socialLinks?.twitter && (
                                    (() => {
                                        const rawUrl = profile.socialLinks.twitter;
                                        const safeUrl = (rawUrl && /^(https?:\/\/|blob:|\/)/i.test(rawUrl)) ? rawUrl : '#';
                                        return (
                                            <a
                                                href={safeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-indigo-400 transition-colors"
                                                data-sanitized="yes"
                                            >
                                                <Twitter size={20} />
                                            </a>
                                        );
                                    })()
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Shield size={18} className="text-blue-600" />
                                About
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {isEditing ? (
                                    <textarea
                                        className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-xs h-32"
                                        value={editFormData?.bio}
                                        onChange={e => setEditFormData({ ...editFormData, bio: e.target.value })}
                                    />
                                ) : profile.bio || "No bio added yet."}
                            </p>
                        </div>
                    </div>

                    {/* Right Content Area: Tabs & Details */}
                    <div className="lg:col-span-3">
                        {/* Tab Navigation */}
                        <div className="flex gap-4 p-1 bg-slate-200/50 rounded-2xl mb-8 w-fit shadow-inner">
                            {['overview', 'experience', 'skills', 'banking'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {tab === 'banking' ? <div className="flex items-center gap-2"><CreditCard size={16} /> Banking</div> : tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[500px]">
                            {activeTab === 'overview' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-slate-900 font-bold mb-6 flex items-center gap-2">
                                                <Award size={20} className="text-yellow-500" />
                                                Key Achievements
                                            </h4>
                                            <div className="space-y-4">
                                                {(isEditing ? editFormData?.achievements : profile.achievements).map((item: string, idx: number) => (
                                                    <div key={idx} className="flex gap-3 items-start group">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                                                        {isEditing ? (
                                                            <input
                                                                className="text-sm text-slate-600 flex-1 bg-slate-50 p-1 rounded border border-slate-200"
                                                                value={item}
                                                                onChange={(e) => updateItem('achievements', idx, e.target.value)}
                                                            />
                                                        ) : (
                                                            <p className="text-sm text-slate-600 flex-1">{item}</p>
                                                        )}
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => removeItem('achievements', idx)}
                                                                className="text-red-400 opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {isEditing && (
                                                    <button
                                                        onClick={() => addItem('achievements', 'New Achievement')}
                                                        className="text-blue-600 text-sm font-bold flex items-center gap-1 mt-4"
                                                    >
                                                        <Plus size={14} /> Add Achievement
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-slate-900 font-bold mb-6 flex items-center gap-2">
                                                <Briefcase size={20} className="text-indigo-500" />
                                                Core Specializations
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(isEditing ? editFormData?.specialization : profile.specialization).map((item: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                                                        {isEditing ? (
                                                            <input
                                                                className="bg-transparent border-none focus:ring-0 w-24 p-0"
                                                                value={item}
                                                                onChange={(e) => updateItem('specialization', idx, e.target.value)}
                                                            />
                                                        ) : (
                                                            <span>{item}</span>
                                                        )}
                                                        {isEditing && (
                                                            <button onClick={() => removeItem('specialization', idx)} className="text-indigo-400 hover:text-red-500">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {isEditing && (
                                                    <button
                                                        onClick={() => addItem('specialization', 'New Spec')}
                                                        className="px-4 py-2 border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-1"
                                                    >
                                                        <Plus size={14} /> Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'experience' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div>
                                        <h4 className="text-slate-900 font-bold mb-8 flex items-center gap-2">
                                            <BookOpen size={20} className="text-blue-600" />
                                            Education History
                                        </h4>
                                        <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                            {(isEditing ? editFormData?.education : profile.education).map((edu: any, idx: number) => (
                                                <div key={idx} className="relative pl-10 group">
                                                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-100 border-4 border-white shadow-sm flex items-center justify-center z-10">
                                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {isEditing ? (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <input
                                                                    className="font-bold text-slate-900 bg-slate-50 p-1 rounded border border-slate-200 text-sm"
                                                                    value={edu.degree}
                                                                    onChange={(e) => {
                                                                        const newEdu = { ...edu, degree: e.target.value };
                                                                        updateItem('education', idx, newEdu);
                                                                    }}
                                                                    placeholder="Degree"
                                                                />
                                                                <input
                                                                    className="text-sm text-slate-500 bg-slate-50 p-1 rounded border border-slate-200"
                                                                    value={edu.institution}
                                                                    onChange={(e) => {
                                                                        const newEdu = { ...edu, institution: e.target.value };
                                                                        updateItem('education', idx, newEdu);
                                                                    }}
                                                                    placeholder="Institution"
                                                                />
                                                                <input
                                                                    className="text-xs text-blue-600 font-bold bg-blue-50 p-1 rounded border border-blue-100"
                                                                    value={edu.year}
                                                                    onChange={(e) => {
                                                                        const newEdu = { ...edu, year: e.target.value };
                                                                        updateItem('education', idx, newEdu);
                                                                    }}
                                                                    placeholder="Year"
                                                                />
                                                                <button
                                                                    onClick={() => removeItem('education', idx)}
                                                                    className="text-red-500 text-xs font-bold flex items-center gap-1"
                                                                >
                                                                    <Trash2 size={12} /> Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <h5 className="font-bold text-slate-900">{edu.degree}</h5>
                                                                <p className="text-sm text-slate-500 font-medium">{edu.institution}</p>
                                                                <p className="text-xs text-blue-600 font-bold mt-1 inline-block px-2 py-0.5 bg-blue-50 rounded italic">{edu.year}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {isEditing && (
                                                <button
                                                    onClick={() => addItem('education', { degree: 'New Degree', institution: 'Institution', year: '2024' })}
                                                    className="ml-10 text-blue-600 text-sm font-bold flex items-center gap-1"
                                                >
                                                    <Plus size={14} /> Add Education
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'skills' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h4 className="text-slate-900 font-bold mb-8">Professional Skills</h4>
                                    <div className="flex flex-wrap gap-4">
                                        {(isEditing ? editFormData?.skills : profile.skills).map((skill: string, idx: number) => (
                                            <div key={idx} className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-3 group">
                                                {isEditing ? (
                                                    <input
                                                        className="bg-transparent border-none focus:ring-0 text-slate-800 font-bold text-sm"
                                                        value={skill}
                                                        onChange={(e) => updateItem('skills', idx, e.target.value)}
                                                    />
                                                ) : (
                                                    <span className="text-slate-800 font-bold text-sm">{skill}</span>
                                                )}
                                                {isEditing && (
                                                    <button
                                                        onClick={() => removeItem('skills', idx)}
                                                        className="text-slate-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {isEditing && (
                                            <button
                                                onClick={() => addItem('skills', 'New Skill')}
                                                className="border-2 border-dashed border-blue-200 text-blue-500 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all"
                                            >
                                                <Plus size={18} /> Add Skill
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'banking' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <CreditCard className="text-blue-600" size={24} />
                                            Banking Information
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { label: 'Bank Name', key: 'bankName', placeholder: 'e.g. HDFC Bank' },
                                            { label: 'Account Holder', key: 'accountHolder', placeholder: 'Full Name' },
                                            { label: 'Account Number', key: 'accountNumber', placeholder: 'Enter Account Number' },
                                            { label: 'IFSC Code', key: 'ifscCode', placeholder: 'Enter IFSC Code' },
                                            { label: 'Branch Name', key: 'branchName', placeholder: 'Branch Location' }
                                        ].map((field) => (
                                            <div key={field.key} className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:border-blue-200 hover:shadow-sm">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
                                                {isEditing ? (
                                                    <input
                                                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                                        value={editFormData?.bankingDetails?.[field.key] || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditFormData((prev: any) => ({
                                                                ...prev,
                                                                bankingDetails: {
                                                                    ...(prev.bankingDetails || {}),
                                                                    [field.key]: val
                                                                }
                                                            }));
                                                        }}
                                                        placeholder={field.placeholder}
                                                    />
                                                ) : (
                                                    <p className="text-slate-900 font-bold text-sm flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                                        {profile.bankingDetails?.[field.key as keyof typeof profile.bankingDetails] || 'Not Configured'}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {!isEditing && !profile.bankingDetails?.accountNumber && (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                            <AlertTriangle size={48} className="text-amber-500 mb-4" />
                                            <p className="text-slate-600 font-bold">Banking details are missing.</p>
                                            <p className="text-slate-400 text-sm mt-1">Please edit your profile to add your bank details for payments.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* {activeTab === 'settings' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h4 className="text-slate-900 font-bold mb-8">Account Security</h4>
                                        <div className="space-y-6 max-w-lg">
                                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                                <div>
                                                    <p className="font-bold text-slate-900">Change Password</p>
                                                    <p className="text-sm text-slate-500">Update your account password</p>
                                                </div>
                                                <button className="text-blue-600 font-bold text-sm">Update</button>
                                            </div>
                                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                                <div>
                                                    <p className="font-bold text-slate-900">2FA Authentication</p>
                                                    <p className="text-sm text-slate-500">Add an extra layer of security</p>
                                                </div>
                                                <div className="w-12 h-6 bg-slate-300 rounded-full cursor-pointer relative">
                                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )} */}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
