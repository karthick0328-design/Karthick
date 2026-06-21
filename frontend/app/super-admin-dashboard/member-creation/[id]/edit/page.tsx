'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import {
  User, Mail, Building, Phone, Lock, Check, Loader2,
  Shield, Eye, Edit, Activity, ArrowRight, Users,
  Key, BadgeCheck, Settings, ChevronDown, Sparkles,
  Hash, Beaker, Award, Fingerprint, Camera, Upload, Trash2, RefreshCcw, Image as ImageIcon,
  ChevronUp, X, Info, ShieldCheck, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateURL } from '@/lib/validation';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
  role: string;
  branch: string;
  department: string;
  service?: string;
  seniority?: string;
  isActive?: boolean;
  isVerified?: boolean;
  attendanceVerificationMethod?: string;
  biometricScanId?: string;
  profileImage?: string;
}

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
}

const allowedRoles = [
  { value: 'subadmin', label: 'Subadmin', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { value: 'head', label: 'Head', icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { value: 'tl', label: 'Team Lead', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'employee', label: 'Employee', icon: User, color: 'text-slate-500', bg: 'bg-slate-500/10' },
];

const branches = ['Madurai', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'];
const departments = [
  'sales and customer services',
  'human resources',
  'financial'
];
const services = [
  'NGS',
  'Drug Discovery',
  'Software develope',
  'Microbiology',
  'BioChemistry',
  'Modecular Biology'
];
const seniorityLevels = ['junior', 'senior'];

const EditStaffUser = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    branch: '',
    department: '',
    service: '',
    seniority: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    isVerified: false,
    attendanceVerificationMethod: 'Physical',
    biometricScanId: '',
    profileImage: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login/signin');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/get-user/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          const data = response.data.data;
          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            branch: data.branch,
            department: data.department,
            service: data.service || '',
            seniority: data.seniority || '',
            isActive: data.isActive,
            isVerified: data.isVerified,
            attendanceVerificationMethod: data.attendanceVerificationMethod || 'Physical',
            biometricScanId: data.biometricScanId || '',
            profileImage: data.profileImage || '',
          });
        }
      } catch (err) {
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, router]);

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (step === 0) {
      if (!formData.name?.trim()) newErrors.name = 'Name required';
      if (!formData.email.trim()) newErrors.email = 'Email required';
      if (!formData.phone?.trim()) newErrors.phone = 'Phone required';
    } else if (step === 1) {
      if (!formData.role) newErrors.role = 'Role required';
      if (!formData.branch) newErrors.branch = 'Branch required';
      if (!formData.department) newErrors.department = 'Dept required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/update-user/${userId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 200) {
        toast.success('User updated successfully');
        router.push(`/super-admin-dashboard/member-creation/${userId}/view`);
      }
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
          const video = document.getElementById('camera-preview') as HTMLVideoElement;
          if (video) video.srcObject = stream;
      }, 100);
    } catch (err) {
      toast.error('Camera access denied');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-12 h-12 text-rose-600 animate-spin" /></div>;

  const steps = [
    { title: 'Core Profile', icon: User },
    { title: 'Authority', icon: Shield },
    { title: 'Security', icon: Key },
  ];

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="space-y-4">
                <Link href={`/super-admin-dashboard/member-creation/${userId}/view`} className="flex items-center text-slate-500 hover:text-rose-600 transition-colors font-bold text-xs uppercase tracking-widest">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile
                </Link>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight">Refine Profile</h1>
            </div>
            <div className="flex bg-white p-1.5 rounded-2xl shadow-xl shadow-rose-100 border border-slate-100">
                {steps.map((step, i) => (
                    <button key={i} onClick={() => setActiveStep(i)} className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeStep === i ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <step.icon size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{step.title}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-rose-100/50 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-10 space-y-10">
                        {activeStep === 0 && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-500 outline-none transition-all font-bold text-slate-800" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Digital Reach</label>
                                        <input name="email" value={formData.email} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-500 outline-none transition-all font-bold text-slate-800" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone network</label>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-500 outline-none transition-all font-bold text-slate-800" />
                                </div>
                            </div>
                        )}

                        {activeStep === 1 && (
                            <div className="space-y-10 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allowedRoles.map(role => (
                                        <button key={role.value} type="button" onClick={() => setFormData(prev => ({...prev, role: role.value}))} className={`p-6 rounded-3xl border-2 text-left transition-all ${formData.role === role.value ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-100' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}>
                                            <role.icon className={`w-8 h-8 mb-4 ${formData.role === role.value ? 'text-rose-600' : 'text-slate-400'}`} />
                                            <p className={`font-black uppercase tracking-widest text-[10px] ${formData.role === role.value ? 'text-rose-900' : 'text-slate-500'}`}>{role.label}</p>
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace Branch</label>
                                        <select name="branch" value={formData.branch} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-600 outline-none appearance-none font-bold text-slate-800">
                                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                        <select name="department" value={formData.department} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-600 outline-none appearance-none font-bold text-slate-800">
                                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    {formData.role && formData.role !== 'subadmin' && (
                                      <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Unit</label>
                                            <select name="service" value={formData.service} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-600 outline-none appearance-none font-bold text-slate-800">
                                                <option value="">No Unit (General)</option>
                                                {services.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seniority</label>
                                            <select name="seniority" value={formData.seniority} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-600 outline-none appearance-none font-bold text-slate-800">
                                                <option value="">Select Seniority</option>
                                                {seniorityLevels.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                            </select>
                                        </div>
                                      </>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeStep === 2 && (
                            <div className="space-y-10 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Visibility</label>
                                        <div className="flex gap-4">
                                            {[true, false].map(val => (
                                                <button key={String(val)} type="button" onClick={() => setFormData(prev => ({...prev, isActive: val}))} className={`flex-1 py-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${formData.isActive === val ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                                    {val ? 'Active' : 'Suspended'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Trust</label>
                                        <div className="flex gap-4">
                                            {[true, false].map(val => (
                                                <button key={String(val)} type="button" onClick={() => setFormData(prev => ({...prev, isVerified: val}))} className={`flex-1 py-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ${formData.isVerified === val ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                                    {val ? 'Verified' : 'Pending'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-10 border-t border-slate-50">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-6">Credential Reset (Optional)</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                                        <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Update Encryption Key..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-500 outline-none transition-all font-bold" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                            <button type="button" onClick={() => setActiveStep(prev => Math.max(0, prev - 1))} className="px-10 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-all">Back Phase</button>
                            {activeStep < 2 ? (
                                <button type="button" onClick={() => setActiveStep(prev => Math.min(2, prev + 1))} className="px-10 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-slate-200">Next Strategy</button>
                            ) : (
                                <button type="submit" disabled={updating} className="px-12 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-xl shadow-emerald-100">
                                    {updating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    <span>{updating ? 'Syncing...' : 'Commit Registry'}</span>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-600/20 rounded-full blur-3xl" />
                    <Sparkles className="text-rose-400 mb-6" size={32} />
                    <h3 className="text-lg font-black uppercase tracking-widest mb-4">Update Protocol</h3>
                    <p className="text-white/50 text-xs font-medium leading-relaxed">System state updates will propagate across all network nodes immediately upon commit.</p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default EditStaffUser;
