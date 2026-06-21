'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import {
  User, Mail, Building, Phone, Lock, Check, Loader2,
  Shield, Eye, Edit, Activity, ArrowRight, Users,
  Key, BadgeCheck, Settings, ChevronDown, Sparkles,
  Hash, Beaker, Award, Fingerprint, Camera, Upload, Trash2, RefreshCcw, Image as ImageIcon
} from 'lucide-react';
import { validateURL } from '@/lib/validation';
import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)

interface FormData {
  name?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: string;
  branch: string;
  department?: string;  // Optional for non-subadmin
  service?: string;     // Optional for non-subadmin
  seniority?: string;   // Only for employee
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
  { value: 'subadmin', label: 'Subadmin', icon: User, color: 'text-purple-600' },
  { value: 'head', label: 'Head', icon: User, color: 'text-green-600' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-orange-600' },
  { value: 'tl', label: 'Team Lead', icon: User, color: 'text-red-600' },
  { value: 'employee', label: 'Employee', icon: Users, color: 'text-blue-600' },
];

const branches = ['Madurai', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'];
const departments = [
  'Sales and Customer Services',
  'Human Resources',
  'Financial'
];
const services = [
  'NGS',
  'Drug Discovery',
  'Software Development',
  'Microbiology',
  'Biochemistry',
  'Molecular Biology'
];
const seniorityLevels = ['junior', 'senior'];

// NEW: Department mapping for short codes to full names
const departmentMapping: { [key: string]: string } = {
  hr: 'Human Resources',
  sales: 'Sales and Customer Services',
  financial: 'Financial',
  // Add more as needed, e.g., 'drug-discovery': 'Drug Discovery'
};

const CreateStaffUser = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
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
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isOpeningCameraRef = useRef(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    message: string;
    id: string;
    uniqueId: string;
    email: string;
    role: string;
    department?: string;
    service?: string;
    seniority?: string;
    attendanceVerificationMethod?: string;
    biometricScanId?: string;
    signatureData?: string;
    punchCardId?: string;
    scanData?: string;
  } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  // NEW: State for current user and target department
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);
  const [targetDepartment, setTargetDepartment] = useState<string>('');
  const [targetSlug, setTargetSlug] = useState<string>('');

  // Dynamic password requirements
  const [passwordReqs, setPasswordReqs] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // HELPER: Normalize department names for comparison
  const normalizeDept = (dept: string) => dept.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

  useEffect(() => {
    // Update password requirements dynamically
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
      const userRole = decoded.role;
      const userDept = (decoded.department || '').trim();  // Trim for safety
      // CHANGED: Broader initial access - allow managers/subadmins/heads to see creation
      if (!['subadmin', 'manager', 'head'].includes(userRole)) {
        toast.error('Access denied. Manager-level role required for user creation.');
        router.push('/login/signin');
        return;
      }
      // NEW: Set current user for dynamic checks
      setCurrentUser({
        ...decoded,
        role: userRole,
        department: userDept,
      });
      // NEW: Infer target department from pathname (for static routes)
      const segments = pathname.split('/');
      const deptIndex = segments.indexOf('department');
      if (deptIndex === -1 || deptIndex + 1 >= segments.length) {
        toast.error('Invalid route. Department not found.');
        router.push('/manager-dashboard/users');
        return;
      }
      const urlDept = segments[deptIndex + 1]?.trim();  // e.g., 'hr'
      if (!urlDept || urlDept === '') {
        toast.error('Department not specified. Please select from dashboard.');
        router.push('/manager-dashboard/users');
        return;
      }
      // FIXED: Map short code to full name
      let fullTargetDept = departmentMapping[urlDept] || urlDept;  // Fallback to raw if no map
      if (!fullTargetDept) {
        toast.error(`Invalid department: ${urlDept}.`);
        router.push('/manager-dashboard/users');
        return;
      }
      const trimmedFullTarget = fullTargetDept.trim();  // Trim for safety
      const normalizedUrlDept = normalizeDept(trimmedFullTarget);  // Now normalizes full name
      setTargetDepartment(trimmedFullTarget); // Set full name for display/submit
      setTargetSlug(urlDept); // Set slug for links
      // DEBUG LOGS (remove after fixing)
      console.log('DEBUG - pathname:', pathname);
      console.log('DEBUG - segments:', segments);
      console.log('DEBUG - urlDept:', urlDept);
      console.log('DEBUG - fullTargetDept (trimmed):', trimmedFullTarget);
      console.log('DEBUG - userDept (trimmed):', userDept);
      console.log('DEBUG - normalizedUrlDept:', normalizedUrlDept);
      const normalizedUserDept = normalizeDept(userDept);
      console.log('DEBUG - normalizedUserDept:', normalizedUserDept);
      // CHANGED: Dynamic access check based on target department (now uses full/mapped name)
      const isHRPersonnel = (userRole === 'subadmin' || userRole === 'manager' || userRole === 'head') && normalizedUserDept === 'human-resources';
      let accessDenied = false;
      let errorMsg = '';
      if (normalizedUrlDept === 'human-resources') {
        // FIXED: Allow HR managers, subadmins, and heads
        if (!isHRPersonnel) {
          accessDenied = true;
          errorMsg = 'Access denied. HR user creation requires Subadmin, Manager, or Head role in Human Resources.';
        }
      } else {
        // For other depts: Allow HR personnel to access all, otherwise must match user's department
        if (!isHRPersonnel && userDept !== trimmedFullTarget) {  // Trimmed comparison
          accessDenied = true;
          errorMsg = `Access denied. Can only create staff in your own department (${userDept}).`;
        }
      }
      if (accessDenied) {
        toast.error(errorMsg);
        router.push('/manager-dashboard/users'); // Redirect to users list
        return;
      }
      console.log('Auth check passed:', { role: userRole, userDept, targetDept: trimmedFullTarget });
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      toast.error('Invalid session. Please log in again.');
      router.push('/login/signin');
    }
  }, [router, pathname]);

  // Reset fields based on role change
  useEffect(() => {
    if (formData.role === 'subadmin') {
      setFormData(prev => ({ ...prev, service: '', seniority: '' })); // Clear service and seniority for subadmin
      setErrors(prev => {
        const { service, seniority, departmentOrService, ...rest } = prev;
        return rest;
      });
    } else if (formData.role !== '') {
      // For non-subadmin, clear seniority if not employee
      if (formData.role !== 'employee') {
        setFormData(prev => ({ ...prev, seniority: '' }));
        // The following code snippet seems to be misplaced and refers to undefined variables (res, validateURL, setUsers, setFilteredUsers).
        // It has been commented out to maintain syntactic correctness as per instructions.
        // if (res.status === 200) {
        //   const sanitizedUsers = (res.data.data || []).map((u: any) => ({
        //     ...u,
        //     profileImage: u.profileImage ? validateURL(u.profileImage) : undefined
        //   }));
        //   setUsers(sanitizedUsers);
        //   setFilteredUsers(sanitizedUsers);
        // }
        setErrors(prev => {
          const { seniority, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [formData.role]);

  useEffect(() => {
    if (activeStep === 2) {
      const stepErrors: { [key: string]: string } = {};
      if (!formData.role) stepErrors.role = 'Role is required';
      if (!formData.branch) stepErrors.branch = 'Branch is required';
      if (formData.role === 'subadmin') {
        if (!formData.department) stepErrors.department = 'Department is required';
      } else {
        const hasDeptOrService = formData.department || formData.service;
        if (!hasDeptOrService) stepErrors.departmentOrService = 'Department or service is required';
      }
      // Seniority validation only for employee
      const needsSeniority = formData.role === 'employee';
      if (needsSeniority && !formData.seniority) {
        stepErrors.seniority = 'Seniority is required';
      }
      setErrors(prev => {
        const cleared = { ...prev };
        ['role', 'branch', 'department', 'departmentOrService', 'service', 'seniority'].forEach(key => delete cleared[key]);
        return { ...cleared, ...stepErrors };
      });
      console.log('Step 3 validation:', { role: formData.role, department: formData.department, service: formData.service, seniority: formData.seniority, errors: stepErrors });
    }
  }, [formData.role, formData.department, formData.branch, formData.service, formData.seniority, activeStep]);

  // CHANGED: Pre-fill department if targetDepartment is set (for non-subadmin, optional)
  useEffect(() => {
    if (targetDepartment && formData.role !== 'subadmin' && !formData.department) {
      setFormData(prev => ({ ...prev, department: targetDepartment }));  // Full name
    }
  }, [targetDepartment, formData.role]);

  const steps = [
    { title: 'Basic Info', icon: User },
    { title: 'Credentials', icon: Key },
    { title: 'Role & Access', icon: Shield },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (step === 0) {
      if (!formData.name?.trim() || formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone?.trim() || !/^\+?\d{10,12}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number (10-12 digits, optional +)';
      }
      setErrors(prev => {
        const cleared = { ...prev };
        ['name', 'email', 'phone'].forEach(key => delete cleared[key]);
        return { ...cleared, ...newErrors };
      });
    }
    if (step === 1) {
      if (!formData.password) newErrors.password = 'Password is required';
      else {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
        if (!strongPasswordRegex.test(formData.password)) {
          newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, number & special character';
        }
      }
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      setErrors(prev => {
        const cleared = { ...prev };
        ['password', 'confirmPassword'].forEach(key => delete cleared[key]);
        return { ...cleared, ...newErrors };
      });
    }
    if (step === 2) {
      const stepErrors: { [key: string]: string } = {};
      if (!formData.role) stepErrors.role = 'Role is required';
      if (!formData.branch) stepErrors.branch = 'Branch is required';
      if (formData.role === 'subadmin') {
        if (!formData.department) stepErrors.department = 'Department is required';
      } else {
        const hasDeptOrService = formData.department || formData.service;
        if (!hasDeptOrService) stepErrors.departmentOrService = 'Department or service is required';
      }
      // Seniority validation only for employee
      const needsSeniority = formData.role === 'employee';
      if (needsSeniority && !formData.seniority) stepErrors.seniority = 'Seniority is required';
      setErrors(prev => {
        const cleared = { ...prev };
        ['role', 'branch', 'department', 'departmentOrService', 'service', 'seniority'].forEach(key => delete cleared[key]);
        return { ...cleared, ...stepErrors };
      });
      Object.assign(newErrors, stepErrors);
    }
    console.log('Step validation:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    let allValid = true;
    for (let i = 0; i <= activeStep; i++) {
      if (!validateStep(i)) {
        allValid = false;
      }
    }
    return allValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (['department', 'service'].includes(name)) {
      setErrors(prev => ({ ...prev, departmentOrService: '' }));
    }
    if (name === 'role') {
      setErrors(prev => ({ ...prev, departmentOrService: '' }));
    }
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!currentUser || !targetDepartment || !targetSlug) {
      toast.error('Session invalid. Please log in again.');
      router.push('/login/signin');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No session found. Please log in again.');
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
        const userDeptSubmit = (decoded.department || '').trim();  // Trim
        const trimmedTarget = targetDepartment.trim();
        // FIXED: Re-validate dynamic access on submit - allow managers, subadmins, and heads for HR
        const normalizedTarget = normalizeDept(trimmedTarget);  // targetDepartment is now full
        const normalizedUser = normalizeDept(userDeptSubmit);
        const isHRPersonnel = (decoded.role === 'subadmin' || decoded.role === 'manager' || decoded.role === 'head') && normalizedUser === 'human-resources';
        if (normalizedTarget === 'human-resources') {
          if (!isHRPersonnel) {
            toast.error('HR access revoked or invalid. Please log in again.');
            localStorage.removeItem('token');
            router.push('/login/signin');
            return;
          }
        } else {
          if (!isHRPersonnel && userDeptSubmit !== trimmedTarget) {  // Full name comparison, trimmed
            toast.error(`Access denied. Can only create staff in your own department (${userDeptSubmit}).`);
            router.push('/manager-dashboard/users');
            return;
          }
        }
      } catch (error) {
        console.error('Invalid token on submit:', error);
        localStorage.removeItem('token');
        toast.error('Invalid session. Please log in again.');
        router.push('/login/signin');
        return;
      }
      const submitData = {
        name: formData.name?.trim() || '',
        email: formData.email?.trim().toLowerCase() || '',
        password: formData.password || '',
        phone: formData.phone?.trim() || '',
        branch: formData.branch?.trim() || '',
        role: formData.role || '',
        ...(formData.department && { department: formData.department.trim() }),  // Already full
        ...(formData.service && { service: formData.service.trim() }),
        ...(formData.seniority && { seniority: formData.seniority.toLowerCase() }),
        attendanceVerificationMethod: formData.attendanceVerificationMethod || 'none',
        biometricScanId: formData.biometricScanId || '',
        profileImage: formData.profileImage || '',
        country: 'Indian' // Default country
      };
      console.log('Submitting payload:', submitData);
      // FIXED: Always use /api/hr/create-user as per backend (centralized in HR)
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/create-user`,
        submitData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.status === 201) {
        const {
          _id: id, uniqueId, email, role, department, service, seniority,
          attendanceVerificationMethod, biometricScanId
        } = response.data.data;

        const sanitizedSuccess = {
          message: `Staff member created successfully! Share these credentials with ${role}:`,
          id: (id && /^[a-f\d]{24}$/i.test(id)) ? id : '',
          uniqueId: (uniqueId && /^[\w-]+$/i.test(uniqueId)) ? uniqueId : '',
          email,
          role,
          department,
          service,
          seniority,
          attendanceVerificationMethod,
          biometricScanId
        };
        setSuccessData(sanitizedSuccess);
        toast.success('Staff user created successfully!');
        setFormData({
          email: '',
          role: '',
          branch: '',
          name: '',
          phone: '',
          password: '',
          confirmPassword: '',
          department: targetDepartment, // Reset to target for quick re-create (full name)
          service: '',
          seniority: '',
          attendanceVerificationMethod: 'Physical',
          biometricScanId: '',
          profileImage: '',
        });
        setErrors({});
        setActiveStep(0);
        // FIXED: Removed immediate reset of successData to allow display
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      if (error instanceof AxiosError && error.response) {
        console.error('Full response:', error.response.data);  // Enhanced logging
        const { message, error: serverError } = error.response.data;
        if (error.response.status === 403) {
          const msg = message || 'Access denied. Please log in again.';
          // NEW: Customize for HR-specific backend errors
          if (msg.includes('subadmin')) {
            toast.error('Access denied. HR personnel (Human Resources department) only.');
          } else {
            toast.error(msg);
          }
          localStorage.removeItem('token');
          router.push('/login/signin');
          return;
        }
        if (error.response.data.errors) {
          const serverErrors: { [key: string]: string } = {};
          error.response.data.errors.forEach((err: any) => {
            const field = err.path || err.field;
            serverErrors[field] = err.message;
          });
          setErrors(prev => ({ ...prev, ...serverErrors }));
          console.log('Server errors:', serverErrors);
          toast.error(Object.values(serverErrors)[0] || message || 'Failed to create user');
          return;
        }
        toast.error(message || 'Failed to create user');
        if (serverError) console.error('Server details:', serverError);  // Log hidden error
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (isOpeningCameraRef.current) return;
    isOpeningCameraRef.current = true;

    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamRef.current = stream;
      setIsCameraOpen(true);

      // Use set timeout to ensure the video element is rendered if it's conditional
      setTimeout(() => {
        const video = document.getElementById('camera-preview') as HTMLVideoElement;
        if (video) video.srcObject = stream;
      }, 100);
    } catch (err) {
      console.error('❌ Camera access error:', err);
      toast.error('Could not access camera. Please check permissions.');
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

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, profileImage: '' }));
  };

  // Seniority only visible and required for employee role
  const needsSeniority = formData.role === 'employee';

  // NEW: Dynamic title and header based on targetDepartment
  const getPageTitle = () => targetDepartment ? `Create ${targetDepartment} Staff User` : 'Create Staff User';

  // FIXED: Dynamic dashboard prefix for links (use 'subadmin' for subadmin, 'manager' for manager/head)
  const getDashboardPrefix = () => {
    return 'manager';
  };

  // NEW: Dynamic links using targetSlug
  const getViewLink = (id: string) => `/${getDashboardPrefix()}-dashboard/department/${targetSlug}/creation/${id}/view`;
  const getEditLink = (id: string) => `/${getDashboardPrefix()}-dashboard/department/${targetSlug}/creation/${id}/edit`;

  if (!currentUser || !targetDepartment || !targetSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white border border-gray-200 shadow-xl',
          duration: 4000,
        }}
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 -z-10"></div>
            {steps.map((step, index) => {
              const isCompleted = index < activeStep;
              const isActive = index === activeStep;
              const Icon = step.icon;
              return (
                <div key={index} className="flex flex-col items-center relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isCompleted
                    ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                    : isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                      : 'bg-white text-gray-400 border-2 border-gray-300'
                    }`}>
                    {isCompleted ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`mt-3 text-sm font-medium transition-colors ${isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {getPageTitle()}
                    </h2>
                    <p className="text-gray-600">
                      Step {activeStep + 1} of {steps.length}: {steps[activeStep].title}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {activeStep === 0 && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Fixed: Grid for name + email (2 cols on md+), phone full below */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <User className="w-4 h-4 mr-2 text-blue-500" />
                            Full Name *
                          </label>
                          <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all ${errors.name
                              ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                              }`}
                            placeholder="John Doe"
                            required
                            aria-invalid={!!errors.name}
                            aria-label="Full Name"
                          />
                          {errors.name && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-blue-500" />
                            Email Address *
                          </label>
                          <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all ${errors.email
                              ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                              }`}
                            placeholder="user@company.com"
                            required
                            aria-invalid={!!errors.email}
                            aria-label="Email Address"
                          />
                          {errors.email && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-blue-500" />
                          Phone Number *
                        </label>
                        <input
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`w-full px-4 py-3.5 rounded-xl text-black border-2 bg-white/50 backdrop-blur-sm transition-all ${errors.phone
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                            : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                          placeholder="1234567890 or +911234567890"
                          required
                          aria-invalid={!!errors.phone}
                          aria-label="Phone Number"
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600 flex items-center" role="alert">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeStep === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-blue-500" />
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 pr-12 text-black rounded-xl border-2 bg-white/50 backdrop-blur-sm transition-all ${errors.password
                              ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                              }`}
                            placeholder="Create strong password"
                            required
                            aria-invalid={!!errors.password}
                            aria-label="Password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-600 flex items-center" role="alert">
                            {errors.password}
                          </p>
                        )}
                        {/* Dynamic password indicators */}
                        <div className="grid grid-cols-5 gap-2 mt-3">
                          {[
                            { key: 'length', label: '8+ chars', check: passwordReqs.length },
                            { key: 'uppercase', label: 'A-Z', check: passwordReqs.uppercase },
                            { key: 'lowercase', label: 'a-z', check: passwordReqs.lowercase },
                            { key: 'number', label: '0-9', check: passwordReqs.number },
                            { key: 'special', label: '@$!?', check: passwordReqs.special },
                          ].map(({ key, label, check }) => (
                            <div key={key} className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full transition-colors ${check ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                              <span className="text-xs text-gray-500">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center">
                          <Lock className="w-4 h-4 mr-2 text-blue-500" />
                          Confirm Password *
                        </label>
                        <input
                          name="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full px-4 py-3.5 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all ${errors.confirmPassword
                            ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                            : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                          placeholder="Confirm your password"
                          required
                          aria-invalid={!!errors.confirmPassword}
                          aria-label="Confirm Password"
                        />
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-600 flex items-center" role="alert">
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {activeStep === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Role Assignment *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-black">
                          {allowedRoles.map((role) => {
                            const Icon = role.icon;
                            const isSelected = formData.role === role.value;
                            return (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, role: role.value }));
                                  if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
                                  if (errors.departmentOrService) setErrors(prev => ({ ...prev, departmentOrService: '' }));
                                }}
                                className={`p-4 rounded-xl border-2 transition-all duration-300 ${isSelected
                                  ? 'border-blue-500 bg-blue-50/50 shadow-md scale-105'
                                  : 'border-gray-200 bg-white/50 hover:border-gray-300 hover:scale-102'
                                  }`}
                                aria-pressed={isSelected}
                                aria-label={`Select ${role.label} role`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-gray-100'
                                    }`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : role.color}`} />
                                  </div>
                                  <span className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-700'
                                    }`}>
                                    {role.label}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {errors.role && (
                          <p className="text-sm text-red-600 flex items-center" role="alert">
                            {errors.role}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Building className="w-4 h-4 mr-2 text-blue-500" />
                            Department {formData.role === 'subadmin' ? '*' : '(Pre-filled for this creation)'}
                          </label>
                          <div className="relative">
                            <select
                              name="department"
                              value={formData.department}
                              onChange={handleChange}
                              className={`w-full px-4 py-3.5 pr-10 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm appearance-none transition-all ${errors.department
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              required={formData.role === 'subadmin'}
                              aria-invalid={!!errors.department}
                              aria-label="Department"
                            >
                              <option value="">Select Department</option>
                              {departments.map((dept, idx) => (
                                <option key={idx} value={dept}>{dept}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.department && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.department}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Building className="w-4 h-4 mr-2 text-blue-500" />
                            Branch *
                          </label>
                          <div className="relative">
                            <select
                              name="branch"
                              value={formData.branch}
                              onChange={handleChange}
                              className={`w-full px-4 py-3.5 pr-10 rounded-xl text-black border-2 bg-white/50 backdrop-blur-sm appearance-none transition-all ${errors.branch
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              required
                              aria-invalid={!!errors.branch}
                              aria-label="Branch"
                            >
                              <option value="">Select Branch</option>
                              {branches.map((branch, idx) => (
                                <option key={idx} value={branch}>{branch}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.branch && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.branch}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Service select for non-subadmin */}
                      {formData.role !== 'subadmin' && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Beaker className="w-4 h-4 mr-2 text-blue-500" />
                            Service (Optional if department selected)
                          </label>
                          <div className="relative">
                            <select
                              name="service"
                              value={formData.service}
                              onChange={handleChange}
                              className={`w-full px-4 py-3.5 pr-10 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm appearance-none transition-all ${errors.service
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              aria-invalid={!!errors.service}
                              aria-label="Service"
                            >
                              <option value="">Select Service</option>
                              {services.map((svc, idx) => (
                                <option key={idx} value={svc}>{svc}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.service && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.service}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Seniority select only for employee */}
                      {needsSeniority && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Award className="w-4 h-4 mr-2 text-blue-500" />
                            Seniority *
                          </label>
                          <div className="relative">
                            <select
                              name="seniority"
                              value={formData.seniority}
                              onChange={handleChange}
                              className={`w-full px-4 py-3.5 pr-10 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm appearance-none transition-all ${errors.seniority
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              required
                              aria-invalid={!!errors.seniority}
                              aria-label="Seniority"
                            >
                              <option value="">Select Seniority</option>
                              {seniorityLevels.map((snr, idx) => (
                                <option key={idx} value={snr}>{snr}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.seniority && (
                            <p className="text-sm text-red-600 flex items-center" role="alert">
                              {errors.seniority}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-6 animate-fadeIn pt-2 border-t border-gray-100">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Fingerprint className="w-4 h-4 mr-2 text-blue-500" />
                            Attendance Verification Method
                          </label>
                          <div className="relative">
                            <select
                              name="attendanceVerificationMethod"
                              value={formData.attendanceVerificationMethod}
                              onChange={handleChange}
                              className={`w-full px-4 py-3.5 pr-10 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm appearance-none transition-all ${errors.attendanceVerificationMethod
                                ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                              aria-invalid={!!errors.attendanceVerificationMethod}
                              aria-label="Attendance Verification Method"
                            >
                              <option value="Physical">Physical</option>
                              <option value="Virtual">Virtual</option>
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Select logic for physical check-in.</p>
                        </div>

                        {/* Conditional Registration ID Fields */}
                        {formData.attendanceVerificationMethod === 'biometric' && (
                          <div className="space-y-2 animate-fadeIn">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                              <Fingerprint className="w-4 h-4 mr-2 text-blue-500" />
                              Biometric ID Registration *
                            </label>
                            <input
                              name="biometricScanId"
                              value={formData.biometricScanId}
                              onChange={handleChange}
                              className="w-full px-4 py-3.5 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="BIO-123456789"
                              required
                            />
                            <p className="text-xs text-gray-500">Format: BIO- followed by 9 digits</p>
                          </div>
                        )}
                        {/* Profile Image Section (Available for all methods) */}
                        <div className="space-y-4 animate-fadeIn border-t border-gray-100 pt-6">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Camera className="w-4 h-4 mr-2 text-blue-500" />
                            Staff Profile Reference Photo {formData.attendanceVerificationMethod === 'Virtual' ? '*' : '(Optional for Physical)'}
                          </label>

                          <div className="flex flex-col space-y-4">
                            {formData.profileImage ? (
                              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-blue-100 shadow-inner group">
                                <img
                                  src={validateURL(formData.profileImage)}
                                  alt="Reference"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                                  <button
                                    type="button"
                                    onClick={startCamera}
                                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all font-bold"
                                    title="Retake Photo"
                                  >
                                    <RefreshCcw size={20} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="p-3 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all font-bold"
                                    title="Remove Photo"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </div>
                            ) : isCameraOpen ? (
                              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-blue-500 shadow-xl">
                                <video
                                  id="camera-preview"
                                  autoPlay
                                  playsInline
                                  ref={(video) => {
                                    if (video && activeStreamRef.current) {
                                      video.srcObject = activeStreamRef.current;
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                  style={{ transform: 'scaleX(-1)' }}
                                />
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4">
                                  <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="p-4 bg-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                                  >
                                    <div className="w-12 h-12 rounded-full border-4 border-gray-900 group-hover:bg-blue-50 transition-colors" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="px-6 py-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/80 transition-colors text-sm font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                                >
                                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Camera className="text-blue-600" size={24} />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Take Real-time Photo</span>
                                  <span className="text-xs text-gray-500 mt-1">Use web camera</span>
                                </button>

                                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all group">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                  />
                                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="text-purple-600" size={24} />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">Upload Image</span>
                                  <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                                </label>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-500 text-center font-medium">Reference photo will be used for face matching during virtual attendance login.</p>
                          </div>
                        </div>
                      </div>
                      {/* Error for department or service */}
                      {errors.departmentOrService && (
                        <p className="text-sm text-red-600 flex items-center" role="alert">
                          {errors.departmentOrService}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between pt-6 border-t border-gray-200/60">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={activeStep === 0}
                      className="px-8 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      aria-disabled={activeStep === 0}
                    >
                      Back
                    </button>
                    {activeStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        aria-label="Continue to next step"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        aria-disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Creating User...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            <span>Create User</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {successData && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200/60 rounded-2xl p-6 shadow-lg animate-slideIn">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900">Staff Created!</h3>
                    <p className="text-sm text-green-700">Successfully onboarded new staff member</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="bg-white/60 rounded-xl p-4 border border-green-200/40">
                    <p className="text-sm text-green-800 font-medium mb-2">Share these credentials:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Unique ID:</span>
                        <span className="font-mono font-semibold text-green-900">{successData?.uniqueId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Email:</span>
                        <span className="font-semibold text-green-900">{successData?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Role:</span>
                        <span className="font-semibold text-green-900 capitalize">{successData?.role}</span>
                      </div>
                      {successData?.department && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Department:</span>
                          <span className="font-semibold text-green-900">{successData?.department}</span>
                        </div>
                      )}
                      {successData?.service && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Service:</span>
                          <span className="font-semibold text-green-900">{successData?.service}</span>
                        </div>
                      )}
                      {successData?.seniority && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Seniority:</span>
                          <span className="font-semibold text-green-900 capitalize">{successData?.seniority}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-green-700">Verification:</span>
                        <span className="font-semibold text-green-900 capitalize">
                          {successData?.attendanceVerificationMethod === 'none' ? 'None' : (
                            <>
                              {successData?.attendanceVerificationMethod?.replace('-', ' ')}
                              <span className="ml-2 text-xs text-green-600 opacity-70">
                                ({successData?.biometricScanId})
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {/* FIXED: Dynamic links using targetSlug and local sanitized variables */}
                  {(() => {
                    const successId = successData?.id || '';
                    const rawViewUrl = getViewLink(successId);
                    // Strict check for internal paths: must start with / and only contain safe characters
                    const isViewSafe = /^\/([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/.test(rawViewUrl);
                    const sanitizedViewUrl = isViewSafe ? rawViewUrl : '#';

                    const rawEditUrl = getEditLink(successId);
                    const isEditSafe = /^\/([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/.test(rawEditUrl);
                    const sanitizedEditUrl = isEditSafe ? rawEditUrl : '#';

                    return (
                      <>
                        <Link
                          href={sanitizedViewUrl}
                          data-sanitized="true"
                          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Profile</span>
                        </Link>
                        <Link
                          href={sanitizedEditUrl}
                          data-sanitized="true"
                          className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </Link>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Staff Onboarding Guide</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Department Privileges</p>
                    <p className="text-xs text-gray-600">{targetDepartment} managers can onboard staff</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Secure Credentials</p>
                    <p className="text-xs text-gray-600">Strong passwords are enforced</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Role-Based Access</p>
                    <p className="text-xs text-gray-600">Assign department-specific roles</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Beaker className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Service Assignment</p>
                    <p className="text-xs text-gray-600">Optional for department roles</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Seniority Levels</p>
                    <p className="text-xs text-gray-600">Junior or Senior for employees only</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateStaffUser;