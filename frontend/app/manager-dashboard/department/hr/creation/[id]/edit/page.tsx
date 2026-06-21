'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

import {
  User,
  Mail,
  Building,
  Phone,
  Lock,
  Check,
  Loader2,
  Shield,
  Eye,
  Edit,
  Activity,
  ArrowRight,
  Users,
  Key,
  BadgeCheck,
  Settings,
  ChevronDown,
  Sparkles,
  Hash,
  CheckCircle, // Added missing import
  ChevronUp, // For promotion icon
  ChevronDown as ChevronDownIcon, // NEW: For demotion icon (renamed to avoid conflict)
  X, Info, ShieldCheck, Award, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateURL } from '@/lib/validation';

import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)

interface FormData {
  uniqueId?: string;
  name: string;
  email: string;
  phone: string;
  password?: string; // Optional for edit (if resetting)
  confirmPassword?: string;
  role: string;
  branch: string;
  department: string;
  isActive?: boolean;
  isVerified?: boolean;
  attendanceVerificationMethod?: string;
  biometricScanId?: string;
  profileImage?: string;
}

interface UserData {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  department: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isPasswordSet: boolean;
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
  { value: 'subadmin', label: 'Subadmin', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { value: 'head', label: 'Department Head', icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { value: 'tl', label: 'Team Lead', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { value: 'employee', label: 'Employee', icon: User, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
];

const branches = ['Madurai', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'];
const departments = ['Sales and Customer Services', 'Human Resources', 'Financial'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

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
    isActive: true,
    isVerified: false,
    attendanceVerificationMethod: 'none',
    biometricScanId: '',
  });

  const [originalData, setOriginalData] = useState<UserData | null>(null);

  // Promotion-specific roles (excludes 'subadmin')
  const promotionRoles = allowedRoles.filter(r => r.value !== 'subadmin' && r.value !== 'employee');
  // Demotion-specific roles
  const demotionRoles = allowedRoles.filter(r => r.value === 'tl' || r.value === 'employee');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  // Promotion state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPromotionRole, setSelectedPromotionRole] = useState('');
  const [promoting, setPromoting] = useState(false);
  // NEW: Demotion state
  const [showDemoteModal, setShowDemoteModal] = useState(false);
  const [selectedDemotionRole, setSelectedDemotionRole] = useState('');
  const [demoting, setDemoting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isOpeningCameraRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

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
      setCurrentUser(decoded);

      const user = {
        id: decoded.sub || decoded.id,
        role: decoded.role,
        department: decoded.department,
      };

      // FIXED: Normalize department like backend for HR check
      const normalizedDept = (user.department || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
      const hasHRAccess = (user.role === 'subadmin' || user.role === 'manager') && normalizedDept === 'human-resources';

      if (!hasHRAccess) {
        // NEW: More specific error based on mismatch
        const errorMsg = !['subadmin', 'manager'].includes(user.role)
          ? 'Access denied. HR requires Subadmin or Manager role.'
          : normalizedDept === ''
            ? 'HR department not configured in your profile. Contact admin to update.'
            : `Access denied. Your department "${user.department}" does not match HR ("Human Resources").`;
        toast.error(errorMsg);
        router.push('/Login/Signin');
        return;
      }
      console.log('Auth check passed:', { role: user.role, department: user.department, normalized: normalizedDept });
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      toast.error('Invalid session. Please log in again.');
      router.push('/Login/Signin');
      return;
    }

    // Fetch existing user data
    const fetchUser = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/get-user/${userId}`, // Fixed: Match backend route
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.status === 200) {
          const data = response.data.data;
          setOriginalData(data);
          setFormData({
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            branch: data.branch,
            department: data.department,
            isActive: data.isActive,
            isVerified: data.isVerified,
            attendanceVerificationMethod: data.attendanceVerificationMethod || 'none',
            biometricScanId: data.biometricScanId || '',
            profileImage: data.profileImage || '',
          });
          toast.success('User data loaded for editing.');
        }
      } catch (err: unknown) {
        console.error('Error fetching user:', err);
        if (err instanceof AxiosError && (err.response?.status === 401 || err.response?.status === 403)) {
          localStorage.removeItem('token');
          toast.error('Session invalid. Please log in again.');
          router.push('/Login/Signin');
          return;
        }
        if (err instanceof AxiosError && err.response) {
          toast.error(err.response.data.message || 'Failed to load user data');
        } else {
          toast.error('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    } else {
      toast.error('Invalid user ID');
      router.push('/hr/users');
    }
  }, [userId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!originalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">User not found</p>
          <Link href="/hr/users" className="bg-blue-600 text-white px-6 py-3 rounded-xl">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { title: 'Basic Info', icon: User },
    { title: 'Role & Access', icon: Shield },
    { title: 'Security', icon: Key },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (step === 0) {
      if (!formData.name?.trim() || formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone?.trim() || !/^\+?\d{10,12}$/.test(formData.phone.trim())) {  // FIXED: Removed space after +
        newErrors.phone = 'Please enter a valid phone number (10-12 digits, optional +)';
      }
    }
    if (step === 1) {
      if (!formData.role) newErrors.role = 'Role is required';
      if (!formData.branch) newErrors.branch = 'Branch is required';
      if (!formData.department) newErrors.department = 'Department is required';
    }
    if (step === 2) {
      if (formData.password) {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;  // FIXED: Consistent special chars
        if (!strongPasswordRegex.test(formData.password)) {
          newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, number & special character';
        }
        if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    let allValid = true;
    for (let i = 0; i <= activeStep; i++) {
      if (!validateStep(i)) allValid = false;
    }
    return allValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;
    // Handle boolean fields for radio buttons
    if ((name === 'isActive' || name === 'isVerified') && type === 'radio') {
      newValue = value === 'true';
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name as keyof FormData]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Please select an image under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    if (isOpeningCameraRef.current) return;
    isOpeningCameraRef.current = true;

    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamRef.current = mediaStream;
      setIsCameraOpen(true);
      setTimeout(() => {
        const video = document.getElementById('camera-preview') as HTMLVideoElement;
        if (video) video.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      console.error('❌ Edit Camera Error:', err);
      toast.error('Could not access camera');
    } finally {
      isOpeningCameraRef.current = false;
    }
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    if (video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setFormData(prev => ({ ...prev, profileImage: dataUrl }));
      stopCamera();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No session found. Please log in again.');
        router.push('/Login/Signin');
        return;
      }
      // Re-validate token before submit
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          toast.error('Session expired. Please log in again.');
          router.push('/Login/Signin');
          return;
        }
        const normalizedDept = (decoded.department || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
        if (!['subadmin', 'manager'].includes(decoded.role) || normalizedDept !== 'human-resources') {
          toast.error('HR access revoked or invalid. Please log in again.');
          localStorage.removeItem('token');
          router.push('/Login/Signin');
          return;
        }
      } catch (error) {
        console.error('Invalid token on submit:', error);
        localStorage.removeItem('token');
        toast.error('Invalid session. Please log in again.');
        router.push('/Login/Signin');
        return;
      }
      // Construct updates: only changed fields or all non-empty
      const updates: any = {};
      Object.keys(formData).forEach((key) => {
        const formValue = formData[key as keyof FormData];
        const originalValue = originalData[key as keyof UserData];
        // Skip if unchanged
        if (formValue === originalValue) return;
        // For other fields, include if changed (empty strings will be validated backend)
        updates[key] = formValue;
      });
      // Include password only if provided
      if (formData.password) {
        updates.password = formData.password;
      }

      // Attendance verification fields
      updates.attendanceVerificationMethod = formData.attendanceVerificationMethod || 'none';
      updates.biometricScanId = formData.biometricScanId || '';
      updates.profileImage = formData.profileImage || '';
      console.log('Updating with:', updates);
      // NEW: Check for no changes
      if (Object.keys(updates).length === 0) {
        toast('No changes detected. User profile is up to date.', {
          icon: <Info className="w-4 h-4 text-blue-500" />,
          duration: 4000,
        });
        setUpdating(false);
        return;
      }
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/update-user/${userId}`, // Fixed: Match backend route
        updates,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.status === 200) {
        toast.success('User updated successfully!');
        setOriginalData(response.data.data);
        setFormData(prev => ({ ...prev, ...response.data.data })); // Update formData to reflect changes
        router.push(`/hr/users/${userId}/view`);
      }
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      if (error instanceof AxiosError && error.response?.status === 403) {
        const msg = error.response.data?.message || 'Access denied. Please log in again.';
        toast.error(msg);
        localStorage.removeItem('token');
        router.push('/Login/Signin');
        return;
      }
      if (error instanceof AxiosError && error.response) {
        const { message } = error.response.data;
        if (error.response.data.errors) {
          const serverErrors: { [key: string]: string } = {};
          error.response.data.errors.forEach((err: any) => {
            serverErrors[err.path || err.field] = err.message;
          });
          setErrors((prev) => ({ ...prev, ...serverErrors }));
        }
        toast.error(message || 'Failed to update user');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Handle promotion submission
  const handlePromote = async () => {
    if (!selectedPromotionRole) {
      toast.error('Please select a role for promotion.');
      return;
    }
    setPromoting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/promote/${userId}`,
        { role: selectedPromotionRole },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.status === 200) {
        toast.success('User promoted successfully!');
        setOriginalData(response.data.data);
        setFormData(prev => ({ ...prev, role: selectedPromotionRole }));
        setShowPromoteModal(false);
        setSelectedPromotionRole('');
      }
    } catch (error: unknown) {
      console.error('Error promoting user:', error);
      if (error instanceof AxiosError && error.response?.status === 403) {
        toast.error(error.response.data.message || 'Access denied for promotion.');
        return;
      }
      if (error instanceof AxiosError && error.response) {
        toast.error(error.response.data.message || 'Failed to promote user');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setPromoting(false);
    }
  };

  // NEW: Handle demotion submission
  const handleDemote = async () => {
    if (!selectedDemotionRole) {
      toast.error('Please select a role for demotion.');
      return;
    }
    setDemoting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/demote/${userId}`,
        { role: selectedDemotionRole },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.status === 200) {
        toast.success('User demoted successfully!');
        setOriginalData(response.data.data);
        setFormData(prev => ({ ...prev, role: selectedDemotionRole }));
        setShowDemoteModal(false);
        setSelectedDemotionRole('');
      }
    } catch (error: unknown) {
      console.error('Error demoting user:', error);
      if (error instanceof AxiosError && error.response?.status === 403) {
        toast.error(error.response.data.message || 'Access denied for demotion.');
        return;
      }
      if (error instanceof AxiosError && error.response) {
        toast.error(error.response.data.message || 'Failed to demote user');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setDemoting(false);
    }
  };

  const getDashboardPrefix = () => currentUser?.role === 'subadmin' ? 'subadmin' : 'manager';
  const getListLink = () => `/${getDashboardPrefix()}-dashboard/department/hr/creation`;
  const getViewLink = () => `/${getDashboardPrefix()}-dashboard/department/hr/creation/${userId}/view`;

  return (
    <div className="animate-in fade-in duration-500">
      <Toaster position="top-right" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <Link
                href={getListLink()}
                className="flex items-center text-slate-500 hover:text-blue-500 transition-colors group font-semibold text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Personnel Directory
              </Link>
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
                  Refine Personnel Profile
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500/60" />
                  Executing registry update for
                  <span className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest border border-blue-200/50 dark:border-blue-500/20 ml-1">
                    {originalData.uniqueId}
                  </span>
                </p>
              </div>
            </div>

            {/* Progress Stepper - Ultra Premium */}
            <div className="flex bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-1.5 rounded-[1.25rem] border border-white/50 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isCompleted = activeStep > index;
                return (
                  <button
                    key={index}
                    onClick={() => index <= activeStep && setActiveStep(index)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : isCompleted
                        ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/5'
                        : 'text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap hidden sm:inline">{step.title}</span>
                    {isCompleted && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-900 shadow-sm">
                        <Check className="w-2.5 h-2.5" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Form Area */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                variants={itemVariants}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[3rem] border border-white/50 dark:border-slate-800 shadow-2xl overflow-hidden shadow-blue-500/5"
              >
                <div className="p-10 sm:p-12">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Profile Configuration
                      </h2>
                      <p className="text-slate-500 font-medium mt-1">Updating credentials for {originalData.name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowPromoteModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl border border-emerald-500/20 transition-all group"
                      >
                        <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                        <span className="text-xs uppercase tracking-wider">Promote</span>
                      </button>
                      <button
                        onClick={() => setShowDemoteModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-2xl border border-rose-500/20 transition-all group"
                      >
                        <ChevronDownIcon className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                        <span className="text-xs uppercase tracking-wider">Demote</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-10">
                    <AnimatePresence mode="wait">
                      {activeStep === 0 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-10"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Full Legal Name
                              </label>
                              <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                  name="name"
                                  value={formData.name}
                                  onChange={handleChange}
                                  className={`w-full pl-12 pr-5 py-4 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border-2 ${errors.name ? 'border-rose-500/50' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium text-slate-900 dark:text-white`}
                                  placeholder="e.g. Alexander Pierce"
                                />
                              </div>
                              {errors.name && <p className="text-xs font-bold text-rose-500 ml-2">{errors.name}</p>}
                            </div>

                            <div className="space-y-3">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Digital Registry ID
                              </label>
                              <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                  name="email"
                                  type="email"
                                  value={formData.email}
                                  onChange={handleChange}
                                  className={`w-full pl-12 pr-5 py-4 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border-2 ${errors.email ? 'border-rose-500/50' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium text-slate-900 dark:text-white`}
                                  placeholder="alex@nexus-biotech.com"
                                />
                              </div>
                              {errors.email && <p className="text-xs font-bold text-rose-500 ml-2">{errors.email}</p>}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                              Mobile Communication Link
                            </label>
                            <div className="relative group">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                              <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`w-full pl-12 pr-5 py-4 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border-2 ${errors.phone ? 'border-rose-500/50' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-medium text-slate-900 dark:text-white`}
                                placeholder="+91 99999 99999"
                              />
                            </div>
                            {errors.phone && <p className="text-xs font-bold text-rose-500 ml-2">{errors.phone}</p>}
                          </div>

                          {/* Profile Image HUD */}
                          <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Biometric Visual Identity</h3>
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                              <div className="relative group shrink-0">
                                <div className="w-36 h-36 rounded-[2.5rem] p-1 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 shadow-xl overflow-hidden">
                                  <div className="w-full h-full rounded-[2.25rem] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                    {formData.profileImage ? (
                                      <img src={validateURL(formData.profileImage)} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-16 h-16 text-slate-300 dark:text-slate-600" />
                                      </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                      <label htmlFor="profile-upload" className="p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl cursor-pointer transition-all hover:scale-110">
                                        <Edit className="w-5 h-5 text-white" />
                                      </label>
                                      <button type="button" onClick={startCamera} className="p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl transition-all hover:scale-110">
                                        <Shield className="w-5 h-5 text-white" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {formData.profileImage && (
                                  <motion.button
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))}
                                    className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </motion.button>
                                )}
                              </div>

                              <div className="flex-1 space-y-4 text-center md:text-left">
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                  Update high-resolution visual credentials. This image is utilized for AI-driven face verification during operational check-ins.
                                </p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                  <input type="file" accept="image/*" id="profile-upload" className="hidden" onChange={handleFileUpload} />
                                  <label htmlFor="profile-upload" className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all cursor-pointer inline-flex items-center gap-2">
                                    <Building className="w-4 h-4 text-blue-500" />
                                    Browse Records
                                  </label>
                                  <button type="button" onClick={startCamera} className="px-6 py-3 bg-blue-600/5 hover:bg-blue-600/10 border border-blue-600/20 text-blue-600 rounded-2xl text-sm font-bold transition-all inline-flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Capture HUD Photo
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeStep === 1 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-10"
                        >
                          <div className="space-y-6">
                            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                              Authority Tier Designation
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {allowedRoles.map((role) => {
                                const Icon = role.icon;
                                const isSelected = formData.role === role.value;
                                return (
                                  <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                                    className={`group relative p-6 rounded-[2rem] border-2 text-left transition-all duration-500 transform active:scale-95 ${isSelected
                                      ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-xl shadow-blue-500/5'
                                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                                      }`}
                                  >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${isSelected ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                                      <Icon className="w-6 h-6" />
                                    </div>
                                    <p className={`font-black text-sm uppercase tracking-wider mb-1 transition-colors ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-500'}`}>
                                      {role.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Tier Authorization</p>

                                    {isSelected && (
                                      <motion.div layoutId="role-indicator" className="absolute top-4 right-4 text-blue-500">
                                        <BadgeCheck className="w-6 h-6" />
                                      </motion.div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Workspace Branch Location
                              </label>
                              <div className="relative group">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <select
                                  name="branch"
                                  value={formData.branch}
                                  onChange={handleChange}
                                  className="w-full pl-12 pr-10 py-4 bg-slate-50/50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-bold text-slate-900 dark:text-white appearance-none"
                                >
                                  <option value="">Select Location</option>
                                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Core Departmental Unit
                              </label>
                              <div className="relative group">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <select
                                  name="department"
                                  value={formData.department}
                                  onChange={handleChange}
                                  className="w-full pl-12 pr-10 py-4 bg-slate-50/50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg font-bold text-slate-900 dark:text-white appearance-none"
                                >
                                  <option value="">Select Unit</option>
                                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-100 dark:border-blue-500/10 space-y-6">
                            <h3 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5" />
                              Operational Verification Protocol
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Marking Method</label>
                                <select
                                  name="attendanceVerificationMethod"
                                  value={formData.attendanceVerificationMethod}
                                  onChange={handleChange}
                                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200"
                                >
                                  <option value="none">Standard Log</option>
                                  <option value="photo">AI Vision Scan</option>
                                  <option value="biometric">Biometric Registry</option>
                                  <option value="Physical">Physical Identity</option>
                                  <option value="Virtual">Virtual HUD Signature</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Registry Identifier</label>
                                <input
                                  name="biometricScanId"
                                  value={formData.biometricScanId}
                                  onChange={handleChange}
                                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-600 dark:text-blue-400"
                                  placeholder="SYN-REQ-0000"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {/* Step 3: Security */}
                      {activeStep === 2 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-10"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Registry Status
                              </label>
                              <div className="flex gap-3">
                                {[
                                  { value: true, label: 'Active', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                  { value: false, label: 'Suspended', icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
                                ].map((opt) => (
                                  <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isActive: opt.value }))}
                                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.isActive === opt.value
                                      ? `${opt.border} ${opt.bg} ${opt.color} shadow-lg shadow-black/5`
                                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'
                                      }`}
                                  >
                                    <opt.icon className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wider">{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-6">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Verification Integrity
                              </label>
                              <div className="flex gap-3">
                                {[
                                  { value: true, label: 'Verified', icon: BadgeCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                  { value: false, label: 'Pending', icon: Info, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                                ].map((opt) => (
                                  <button
                                    key={String(opt.value)}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVerified: opt.value }))}
                                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.isVerified === opt.value
                                      ? `${opt.border} ${opt.bg} ${opt.color} shadow-lg shadow-black/5`
                                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400'
                                      }`}
                                  >
                                    <opt.icon className="w-5 h-5" />
                                    <span className="font-bold text-sm uppercase tracking-wider">{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Credential Update (Optional)
                              </label>
                              {formData.password && (
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.1em] bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">
                                  Resetting...
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-3">
                                <div className="relative group">
                                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                  <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password || ''}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50/50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-slate-900 dark:text-white"
                                    placeholder="New Cipher Key"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                  >
                                    {showPassword ? <X className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>
                              {formData.password && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                  <div className="relative group">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                      name="confirmPassword"
                                      type={showPassword ? 'text' : 'password'}
                                      value={formData.confirmPassword || ''}
                                      onChange={handleChange}
                                      className={`w-full pl-12 pr-5 py-4 bg-slate-50/50 dark:bg-slate-900 border-2 ${errors.confirmPassword ? 'border-rose-500/50' : 'border-slate-100 dark:border-slate-800'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-medium text-slate-900 dark:text-white`}
                                      placeholder="Confirm Cipher"
                                    />
                                  </div>
                                  {errors.confirmPassword && <p className="text-xs font-bold text-rose-500 ml-2">{errors.confirmPassword}</p>}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        href={getViewLink()}
                        className="w-full sm:w-auto px-10 py-4 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all text-center"
                      >
                        Abort Changes
                      </Link>

                      <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
                        {activeStep > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStep(prev => prev - 1)}
                            className="px-8 py-4 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                          >
                            Previous Phase
                          </button>
                        )}

                        {activeStep < steps.length - 1 ? (
                          <button
                            type="button"
                            onClick={nextStep}
                            className="px-10 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-[1.5rem] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 group"
                          >
                            Proceed
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={updating}
                            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-[1.5rem] hover:shadow-2xl shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                          >
                            {updating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Syncing Records...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Commit Registry</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-8">
              <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2.5rem] border border-white/50 dark:border-slate-800 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Registry State</h3>
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'Primary Identity', value: originalData.name, icon: User },
                    { label: 'Authority Tier', value: originalData.role, icon: Shield, capitalize: true },
                    {
                      label: 'Operational Status',
                      value: originalData.isActive ? 'Active' : 'Inactive',
                      icon: Activity,
                      color: originalData.isActive ? 'text-emerald-500' : 'text-rose-500'
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${item.color || 'text-slate-900 dark:text-white'} ${item.capitalize ? 'capitalize' : ''}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                <div className="relative z-10">
                  <Sparkles className="w-8 h-8 text-blue-400 mb-6" />
                  <h3 className="text-lg font-black uppercase tracking-widest mb-4">Registry Guidelines</h3>
                  <ul className="space-y-4">
                    {[
                      'Verified updates persist across all nodes',
                      'Password reset requires manual notification',
                      'Authority changes log to audit trails'
                    ].map((text, i) => (
                      <li key={i} className="flex gap-3 text-xs font-medium text-slate-400 leading-relaxed">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Promotion Modal */}
      <AnimatePresence>
        {showPromoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPromoteModal(false);
                setSelectedPromotionRole('');
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] border border-white/50 dark:border-slate-800 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <div className="p-10 sm:p-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <ChevronUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Promote Tier</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escalating Authority</p>
                    </div>
                  </div>
                  <button onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedPromotionRole('');
                  }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4 mb-10">
                  {promotionRoles.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedPromotionRole(role.value)}
                      className={`w-full group relative p-6 rounded-[1.5rem] border-2 text-left transition-all duration-300 ${selectedPromotionRole === role.value
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xl shadow-emerald-500/5'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${selectedPromotionRole === role.value ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                          <role.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-black uppercase tracking-wider text-sm ${selectedPromotionRole === role.value ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-400'}`}>
                            {role.label}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Strategic Level {role.value === 'subadmin' ? '02' : '01'}</p>
                        </div>
                      </div>
                      {selectedPromotionRole === role.value && (
                        <Check className="absolute top-1/2 -translate-y-1/2 right-6 w-5 h-5 text-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedPromotionRole('');
                  }} className="flex-1 px-8 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
                    Abort
                  </button>
                  <button
                    onClick={handlePromote}
                    disabled={!selectedPromotionRole || promoting}
                    className="flex-[2] px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
                  >
                    {promoting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Commit Promotion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Demotion Modal */}
      <AnimatePresence>
        {showDemoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDemoteModal(false);
                setSelectedDemotionRole('');
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] border border-white/50 dark:border-slate-800 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <div className="p-10 sm:p-12">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                      <ChevronDownIcon className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Deprioritize Tier</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reducing Authority Range</p>
                    </div>
                  </div>
                  <button onClick={() => {
                    setShowDemoteModal(false);
                    setSelectedDemotionRole('');
                  }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4 mb-10">
                  {demotionRoles.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedDemotionRole(role.value)}
                      className={`w-full group relative p-6 rounded-[1.5rem] border-2 text-left transition-all duration-300 ${selectedDemotionRole === role.value
                        ? 'border-rose-500 bg-rose-50/5 shadow-xl shadow-rose-500/5'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${selectedDemotionRole === role.value ? 'bg-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                          <role.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`font-black uppercase tracking-wider text-sm ${selectedDemotionRole === role.value ? 'text-rose-900 dark:text-rose-200' : 'text-slate-600 dark:text-slate-400'}`}>
                            {role.label}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Baseline Support Level</p>
                        </div>
                      </div>
                      {selectedDemotionRole === role.value && (
                        <Check className="absolute top-1/2 -translate-y-1/2 right-6 w-5 h-5 text-rose-500" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => {
                    setShowDemoteModal(false);
                    setSelectedDemotionRole('');
                  }} className="flex-1 px-8 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
                    Abort
                  </button>
                  <button
                    onClick={handleDemote}
                    disabled={!selectedDemotionRole || demoting}
                    className="flex-[2] px-8 py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20"
                  >
                    {demoting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-4 h-4" />
                        <span>Confirm Deprioritization</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditStaffUser;
