'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { validateURL, getSanitizedURL } from '@/lib/validation';
import {
  User, Mail, Building, Phone, Lock, Check, Loader2, ArrowLeft,
  Shield, Eye, Edit, Activity, ArrowRight, Users,
  Key, BadgeCheck, Settings, ChevronDown, Sparkles,
  Hash, Beaker, Award, Fingerprint, Camera, Upload, Trash2, RefreshCcw, Image as ImageIcon, Edit3
} from 'lucide-react';
import Link from 'next/link';
import createDOMPurify from 'dompurify';
import SummaryCard from '../components/SummaryCard';

interface FormData {
  name?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: string;
  branch: string;
  department: string;
  service?: string;
  seniority?: string;
  attendanceVerificationMethod?: string;
  biometricScanId?: string;
  profileImage?: string;
  isVerified: boolean;
}

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
}

const allowedRoles = [
  { value: 'subadmin', label: 'Subadmin', icon: User, color: 'text-purple-600' },
  { value: 'head', label: 'Head', icon: User, color: 'text-green-600' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-orange-600' },
  { value: 'tl', label: 'Team Lead', icon: User, color: 'text-red-600' },
  { value: 'employee', label: 'Employee', icon: Users, color: 'text-violet-600' },
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

const CreateStaffUser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: '',
    branch: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    department: '',
    service: '',
    seniority: '',
    attendanceVerificationMethod: 'Physical',
    biometricScanId: '',
    profileImage: '',
    isVerified: false,
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isOpeningCameraRef = useRef(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    _id: string;
    uniqueId: string;
    email: string;
    role: string;
    department?: string;
    service?: string;
    seniority?: string;
    attendanceVerificationMethod?: string;
    biometricScanId?: string;
  } | null>(null);
  const [memberStats, setMemberStats] = useState<{
    departments: { [key: string]: number };
    services: { [key: string]: number };
    total: number;
  }>({ departments: {}, services: {}, total: 0 });
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // SEC: Validate image URLs to prevent XSS via safe protocol enforcement
  const getSafeImageUrl = (url: string | null | undefined) => getSanitizedURL(url);

  const [passwordReqs, setPasswordReqs] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    const pwd = formData.password;
    setPasswordReqs({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[@$!%?&]/.test(pwd),
    });
  }, [formData.password]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login/signin');
      return;
    }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.');
        router.push('/login/signin');
        return;
      }
      if (!['subadmin', 'superadmin'].includes(decoded.role)) {
        toast.error('Access denied. Manager-level role required.');
        router.push('/login/signin');
        return;
      }
      setCurrentUser(decoded);
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login/signin');
    }
    const fetchMemberStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/internal-users?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          const sanitized = response.data.data.map((m: any) => ({
            ...m,
            profileImage: getSanitizedURL(m.profileImage),
            name: m.name ? createDOMPurify(window as any).sanitize(m.name) : '',
            email: m.email ? createDOMPurify(window as any).sanitize(m.email) : ''
          }));
          setAllMembers(sanitized);
          const deptCounts: { [key: string]: number } = {};
          const serviceCounts: { [key: string]: number } = {};

          sanitized.forEach((m: any) => {
            if (m.department) {
              const dept = m.department.toLowerCase().trim();
              deptCounts[dept] = (deptCounts[dept] || 0) + 1;
            }
            if (m.service) {
              const svc = m.service.trim();
              serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
            }
          });

          setMemberStats({
            departments: deptCounts,
            services: serviceCounts,
            total: sanitized.length
          });
        }
      } catch (error) {
        console.error('Error fetching member stats:', error);
      }
    };

    fetchMemberStats();
  }, [router]);

  const getMembersByDept = (dept: string) => allMembers.filter(m => m.department?.toLowerCase().trim() === dept.toLowerCase().trim()).map(m => m.name).join(', ');
  const getMembersByService = (svc: string) => allMembers.filter(m => m.service?.trim() === svc.trim()).map(m => m.name).join(', ');

  const getDeptCount = (dept: string) => memberStats.departments[dept.toLowerCase().trim()] || 0;
  const getServiceCount = (svc: string) => memberStats.services[svc.trim()] || 0;

  useEffect(() => {
    if (formData.role === 'subadmin') {
      setFormData(prev => ({ ...prev, service: '', seniority: '' }));
    } else if (formData.role && formData.role !== 'employee') {
      setFormData(prev => ({ ...prev, seniority: '' }));
    }
  }, [formData.role]);

  const steps = [
    { title: 'Basic Info', icon: User },
    { title: 'Credentials', icon: Key },
    { title: 'Role & Access', icon: Shield },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (step === 0) {
      if (!formData.name?.trim() || formData.name.trim().length < 2) newErrors.name = 'Name is too short';
      if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email';
      if (!formData.phone?.trim() || !/^\+?\d{10,12}$/.test(formData.phone.trim())) newErrors.phone = 'Invalid phone';
    } else if (step === 1) {
      if (!formData.password || formData.password.length < 8) newErrors.password = 'Must be 8+ characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords mismatch';
    } else if (step === 2) {
      if (!formData.role) newErrors.role = 'Role required';
      if (!formData.branch) newErrors.branch = 'Branch required';
      if (!formData.department && formData.role === 'subadmin') newErrors.department = 'Dept required';
      if (formData.role !== 'subadmin' && !formData.department && !formData.service) newErrors.departmentOrService = 'Dept/Service required';
      if (formData.role === 'employee' && !formData.seniority) newErrors.seniority = 'Seniority required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const prevStep = () => setActiveStep(prev => Math.max(0, prev - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(activeStep)) return;
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/create-user`,
        { ...formData, country: 'Indian' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.status === 201) {
        setSuccessData(response.data.data);
        toast.success('User created!');
        setActiveStep(0);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Creation failed');
    } finally {
      setLoading(false);
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
      toast.error('Camera failed');
    }
  };

  const stopCamera = () => {
    activeStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setFormData(prev => ({ ...prev, profileImage: getSanitizedURL(canvas.toDataURL('image/jpeg')) }));
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, profileImage: getSanitizedURL(reader.result as string) }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-white">
      <Toaster position="top-right" />
      <main className="w-full px-6 py-8">

        {!showForm ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                  <Activity size={10} /> Personnel Intelligence
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Organization Overview</h2>
                <p className="text-slate-500 text-sm font-medium mt-1">Department roster and service unit distributions</p>
              </div>
              <button onClick={() => setShowForm(true)} className="px-7 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center gap-2 shrink-0">
                <User size={14} /> Onboard New Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <SummaryCard 
                title="Total Members"
                value={allMembers.length.toString()}
                change="+12.4%"
                status="up"
                icon={Users}
                variant="purple"
                description="Global Personnel"
              />
              <SummaryCard 
                title="Active Departments"
                value={departments.length.toString()}
                change="+1"
                status="up"
                icon={Building}
                variant="emerald"
                description="Organizational Units"
              />
              <SummaryCard 
                title="Service Units"
                value={services.length.toString()}
                change="+0"
                status="up"
                icon={Beaker}
                variant="amber"
                description="Functional Divisions"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-indigo-600 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-white/80" />
                    <h3 className="text-base font-black text-white tracking-tight">Department Roster</h3>
                  </div>
                  <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase">{allMembers.length} Members</span>
                </div>
                <div className="p-6 space-y-3">
                  {departments.map((dept, dIdx) => {
                    const deptMembers = allMembers.filter(m => m.department?.toLowerCase().trim() === dept.toLowerCase().trim());
                    const count = deptMembers.length;
                    const isExpanded = expandedDept === dept;
                    const dColors = ['bg-indigo-600', 'bg-violet-600', 'bg-blue-600'];
                    const dBadge = ['bg-indigo-50 text-indigo-700', 'bg-violet-50 text-violet-700', 'bg-blue-50 text-blue-700'];
                    const dBar = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <div key={dept} className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <button onClick={() => setExpandedDept(isExpanded ? null : dept)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-all">
                          <div className={`w-9 h-9 rounded-xl ${dColors[dIdx % dColors.length]} flex items-center justify-center shrink-0 shadow-md`}>
                            <Building className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-black text-slate-800 capitalize truncate">{dept}</p>
                            <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${dBar[dIdx % dBar.length]} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, (count / (memberStats.total || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${dBadge[dIdx % dBadge.length]}`}>{count}</span>
                          <div className={`w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50">
                            {count === 0 ? (
                              <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-6">No members</p>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {deptMembers.map((member: any) => {
                                  const safeImg = member.profileImage && !/^\s*javascript:/i.test(member.profileImage) 
                                    ? createDOMPurify(window as any).sanitize(member.profileImage) 
                                    : '';
                                  return (
                                    <div key={member._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-all">
                                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                        <img src={safeImg} alt={member.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">{member.email}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{member.phone || '—'}</p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${dColors[dIdx % dColors.length]}`}>{member.role}</span>
                                        <div className="flex gap-1">
                                          <Link href={`#`} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 transition-all" title="View">
                                            <Eye className="w-3 h-3" />
                                          </Link>
                                          <Link href={`#`} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700 transition-all" title="Edit">
                                            <Edit3 className="w-3 h-3" />
                                          </Link>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                <div className="bg-teal-600 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Beaker className="w-5 h-5 text-white/80" />
                    <h3 className="text-base font-black text-white tracking-tight">Service Unit Roster</h3>
                  </div>
                  <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase">{services.length} Units</span>
                </div>
                <div className="p-6 space-y-3">
                  {services.map((service, sIdx) => {
                    const svcMembers = allMembers.filter(m => m.service?.trim() === service.trim());
                    const count = svcMembers.length;
                    const isExpanded = expandedService === service;
                    const sColors = ['bg-teal-600', 'bg-emerald-600', 'bg-cyan-600', 'bg-sky-600', 'bg-green-600', 'bg-teal-700'];
                    const sBadge = ['bg-teal-50 text-teal-700', 'bg-emerald-50 text-emerald-700', 'bg-cyan-50 text-cyan-700', 'bg-sky-50 text-sky-700', 'bg-green-50 text-green-700', 'bg-teal-50 text-teal-700'];
                    const sBar = ['bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500', 'bg-green-500', 'bg-teal-600'];
                    return (
                      <div key={service} className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <button onClick={() => setExpandedService(isExpanded ? null : service)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-all">
                          <div className={`w-9 h-9 rounded-xl ${sColors[sIdx % sColors.length]} flex items-center justify-center shrink-0 shadow-md`}>
                            <Beaker className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{service}</p>
                            <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${sBar[sIdx % sBar.length]} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, (count / (memberStats.total || 1)) * 100)}%` }} />
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${sBadge[sIdx % sBadge.length]}`}>{count}</span>
                          <div className={`w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50">
                            {count === 0 ? (
                              <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-6">No members</p>
                            ) : (
                              <div className="divide-y divide-slate-100">
                                {svcMembers.map((member: any) => {
                                  const safeImg = member.profileImage && !/^\s*javascript:/i.test(member.profileImage) 
                                    ? createDOMPurify(window as any).sanitize(member.profileImage) 
                                    : '';
                                  return (
                                    <div key={member._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-all">
                                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                        <img src={safeImg} alt={member.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">{member.email}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{member.phone || '—'}</p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${sColors[sIdx % sColors.length]}`}>{member.role}</span>
                                        <div className="flex gap-1">
                                          <Link href={`#`} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 transition-all" title="View">
                                            <Eye className="w-3 h-3" />
                                          </Link>
                                          <Link href={`#`} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700 transition-all" title="Edit">
                                            <Edit3 className="w-3 h-3" />
                                          </Link>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="mb-8 flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <button onClick={() => setShowForm(false)} className="px-6 py-3 bg-slate-50 text-slate-500 hover:text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Overview
              </button>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mr-4">Personnel Setup</div>
            </div>

            <div className="mb-12">
              <div className="flex justify-between relative max-w-2xl mx-auto">
                <div className="absolute top-1/2 w-full h-0.5 bg-slate-200 -z-10" />
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${i <= activeStep ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                      {i < activeStep ? <Check className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
                    </div>
                    <span className={`mt-2 text-xs font-bold uppercase tracking-widest ${i <= activeStep ? 'text-violet-600' : 'text-slate-400'}`}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                  <div className="p-8">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                          <Sparkles size={12} />
                          <span>Personnel Setup</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">New Member</h2>
                        <p className="text-slate-500 font-medium mt-1">Step {activeStep + 1} of 3: {steps[activeStep].title}</p>
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-100">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                      {activeStep === 0 && (
                        <div className="space-y-6 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name *</label>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className={`w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all ${errors.name ? 'ring-2 ring-red-500 bg-red-50' : ''}`} />
                              </div>
                              {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address *</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className={`w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all ${errors.email ? 'ring-2 ring-red-500 bg-red-50' : ''}`} />
                              </div>
                              {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.email}</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number *</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className={`w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all ${errors.phone ? 'ring-2 ring-red-500 bg-red-50' : ''}`} />
                            </div>
                            {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.phone}</p>}
                          </div>
                        </div>
                      )}

                      {activeStep === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Account Password *</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="••••••••" className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all ${errors.password ? 'ring-2 ring-red-500 bg-red-50' : ''}`} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors">
                                {showPassword ? <Eye size={20} className="text-rose-600" /> : <Lock size={20} />}
                              </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.password}</p>}
                            <div className="grid grid-cols-5 gap-2 mt-4">
                              {[
                                { label: '8+ chars', check: passwordReqs.length },
                                { label: 'Upper', check: passwordReqs.uppercase },
                                { label: 'Lower', check: passwordReqs.lowercase },
                                { label: 'Digit', check: passwordReqs.number },
                                { label: 'Special', check: passwordReqs.special },
                              ].map((req, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                  <div className={`h-1.5 w-full rounded-full transition-colors ${req.check ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{req.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Confirm Password *</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <input name="confirmPassword" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all ${errors.confirmPassword ? 'ring-2 ring-red-500 bg-red-50' : ''}`} />
                            </div>
                            {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.confirmPassword}</p>}
                          </div>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select System Role *</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {allowedRoles.map((role) => (
                                <button
                                  key={role.value}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.role === role.value ? 'border-rose-600 bg-rose-50 shadow-md shadow-rose-100' : errors.role ? 'border-red-200 bg-red-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.role === role.value ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <role.icon className="w-5 h-5" />
                                  </div>
                                  <span className={`text-sm font-bold ${formData.role === role.value ? 'text-rose-900' : 'text-slate-600'}`}>{role.label}</span>
                                </button>
                              ))}
                            </div>
                            {errors.role && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.role}</p>}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Department *</label>
                              <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select name="department" value={formData.department} onChange={handleChange} className={`w-full pl-12 pr-10 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none appearance-none transition-all ${errors.department || errors.departmentOrService ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                                  <option value="">Select Department</option>
                                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                              </div>
                              {(errors.department || errors.departmentOrService) && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.department || errors.departmentOrService}</p>}
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">System Branch *</label>
                              <div className="relative">
                                <Settings className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select name="branch" value={formData.branch} onChange={handleChange} className={`w-full pl-12 pr-10 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none appearance-none transition-all ${errors.branch ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                                  <option value="">Select Branch</option>
                                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                              </div>
                              {errors.branch && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.branch}</p>}
                            </div>
                          </div>

                          {formData.role && formData.role !== 'subadmin' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Service Unit</label>
                                <div className="relative">
                                  <Beaker className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                  <select name="service" value={formData.service} onChange={handleChange} className="w-full pl-12 pr-10 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none appearance-none transition-all">
                                    <option value="">No Unit (General)</option>
                                    {services.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seniority Level *</label>
                                <div className="relative">
                                  <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                  <select name="seniority" value={formData.seniority} onChange={handleChange} className={`w-full pl-12 pr-10 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none appearance-none transition-all ${errors.seniority ? 'ring-2 ring-red-500 bg-red-50' : ''}`}>
                                    <option value="">Select Seniority</option>
                                    {seniorityLevels.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                                {errors.seniority && <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.seniority}</p>}
                              </div>
                            </div>
                          )}

                          <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                              <Fingerprint size={18} className="text-rose-600" />
                              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Attendance Verification</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Verification Strategy</label>
                                <div className="flex gap-4">
                                  {['Physical', 'Virtual'].map(method => (
                                    <button
                                      key={method}
                                      type="button"
                                      onClick={() => setFormData(prev => ({ ...prev, attendanceVerificationMethod: method }))}
                                      className={`flex-1 py-4 rounded-2xl border-2 font-bold transition-all ${formData.attendanceVerificationMethod === method ? 'border-rose-600 bg-rose-600 text-white shadow-lg' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                    >
                                      {method}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium italic">Physical: Branch office biometric scan. Virtual: Face recognition login.</p>

                                {formData.attendanceVerificationMethod === 'Physical' && (
                                  <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Biometric Scan ID</label>
                                    <div className="relative">
                                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                      <input
                                        name="biometricScanId"
                                        value={formData.biometricScanId}
                                        onChange={handleChange}
                                        placeholder="BIO-12345"
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-0 rounded-2xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-rose-600 outline-none transition-all"
                                      />
                                    </div>
                                  </div>
                                )}


                              </div>

                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Profile Reference Photo</label>
                                {formData.profileImage ? (
                                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 group">
                                    <img src={(() => {
                                      const safe = formData.profileImage && !/^\s*javascript:/i.test(formData.profileImage) 
                                        ? createDOMPurify(window as any).sanitize(formData.profileImage) 
                                        : '';
                                      return safe;
                                    })()} alt="Reference" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                      <button type="button" onClick={startCamera} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40"><RefreshCcw size={20} /></button>
                                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))} className="p-3 bg-red-500 rounded-full text-white hover:bg-red-600"><Trash2 size={20} /></button>
                                    </div>
                                  </div>
                                ) : isCameraOpen ? (
                                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-rose-500">
                                    <video id="camera-preview" autoPlay playsInline className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                                      <button type="button" onClick={capturePhoto} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"><div className="w-10 h-10 border-4 border-slate-900 rounded-full" /></button>
                                      <button type="button" onClick={stopCamera} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 transition-all"><Trash2 size={20} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3 group transition-all hover:border-rose-300 hover:bg-rose-50/30">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-rose-500 group-hover:scale-110 transition-all"><Camera size={24} /></div>
                                    <div className="text-center">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-rose-600">No Image Captured</p>
                                      <div className="flex gap-4 mt-3">
                                        <button type="button" onClick={startCamera} className="text-[9px] font-black uppercase px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-rose-600 transition-all">Start Camera</button>
                                        <label className="text-[9px] font-black uppercase px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-full hover:bg-slate-50 cursor-pointer transition-all">
                                          Upload file
                                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between pt-8 border-t border-slate-100">
                        {activeStep > 0 && (
                          <button type="button" onClick={prevStep} className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                             Previous Vector
                          </button>
                        )}
                        <div className="flex gap-4 ml-auto">
                          {activeStep < 2 ? (
                            <button type="button" onClick={nextStep} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all flex items-center gap-2">
                              Forward Protocol <ArrowRight size={14} />
                            </button>
                          ) : (
                            <button type="submit" disabled={loading} className="px-12 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-slate-900 transition-all flex items-center gap-3 disabled:opacity-50">
                              {loading ? <Loader2 className="animate-spin" size={16} /> : <BadgeCheck size={16} />} Finalize Onboarding
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6">Real-time Metrics</h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between py-3 border-b border-white/5">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Global Roster</span>
                        <span className="text-lg font-black">{allMembers.length}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-white/5">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Active Units</span>
                        <span className="text-lg font-black">{departments.length + services.length}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">System Load</span>
                        <span className="text-lg font-black text-emerald-400">Optimal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-6"><Shield size={32} /></div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight mb-2">Security Enforcement</h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-6">User permissions are dynamically inherited based on role categorization and department assignment.</p>
                  <div className="w-full p-4 bg-white rounded-2xl border border-slate-100 text-left">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Enterprise Sync Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {successData && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-400">
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Check size={48} /></div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 italic tracking-tight">Onboarding Complete</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Staff Record # {successData.uniqueId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">System Role</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{successData.role}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Assigned Unit</p>
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{successData.department || successData.service || 'Global'}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl space-y-4">
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50">
                      <span className="text-[10px] font-black text-indigo-900 uppercase">System ID</span>
                      <span className="text-[10px] font-black text-indigo-600 font-mono">{successData.uniqueId}</span>
                   </div>
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-50">
                      <span className="text-[10px] font-black text-indigo-900 uppercase">Verification</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase italic">Pending Initial Scan</span>
                   </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setSuccessData(null)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">New Entry</button>
                  <button onClick={() => { setSuccessData(null); setShowForm(false); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Review Roster</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default CreateStaffUser;