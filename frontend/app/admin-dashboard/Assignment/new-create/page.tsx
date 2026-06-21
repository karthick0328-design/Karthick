// pages/admin/create-user.tsx (or app/admin/create-user/page.tsx in app router)
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import {
  User, Mail, Building, Phone, Lock, Check, Loader2,
  Shield, Eye, Edit, Activity, ArrowRight, Users,
  Key, BadgeCheck, Settings, ChevronDown, Sparkles,
  Hash
} from 'lucide-react';
import Link from 'next/link';
import Header from '../../../adminCompontent/Header'; // Fixed spelling: Component
import Sidebar from '../../../adminCompontent/sidebarAdmin'; // Fixed spelling: Component

interface FormData {
  uniqueId?: string;
  name?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  role: string;
  branch: string;
  department: string;
  service: string;
}

const internalRoles = [
  { value: 'subadmin', label: 'Subadmin', icon: Settings, color: 'text-purple-600' },
  { value: 'employee', label: 'Employee', icon: Users, color: 'text-blue-600' },
  { value: 'head', label: 'Head', icon: User, color: 'text-green-600' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-orange-600' },
  { value: 'tl', label: 'Team Lead', icon: User, color: 'text-red-600' },
  // Removed 'team manager' as per model update
];

const branches = ['Madurai', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'];

// Updated: For subadmin, limit to specific departments
const subadminDepartments = [
  'Sales & Customer Services',
  'Human Resources',
  'Financial'
];

const departments = [
  'Sales & Customer Services',
  'Human Resources',
  'Financial',
  // Add other departments if needed for non-subadmin roles
];

const services = [
  'NGS',
  'Drug Discovery',
  'Software Development',
  'Microbiology',
  'BioChemistry',
  'Molecular Biology'
];

const CreateInternalUser = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: '',
    branch: '',
    name: '',
    phone: '',
    uniqueId: '',
    password: '',
    confirmPassword: '',
    department: '',
    service: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    message: string;
    id: string;
    uniqueId: string;
    email: string;
    role: string;
    department: string;
    service: string;
  } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      router.push('/Login/Signin');
      toast.error('Access denied. Admin only.');
    }
  }, [router]);

  // New: Real-time validation for Step 3 (Role & Access)
  useEffect(() => {
    if (activeStep === 2) {
      // Debounce with setTimeout to avoid excessive re-renders
      const timer = setTimeout(() => {
        const stepErrors: { [key: string]: string } = {};
        if (!formData.role) stepErrors.role = 'Role is required';
        if (!formData.branch) stepErrors.branch = 'Branch is required';
        if (!formData.department) stepErrors.department = 'Department is required';
        // For subadmin, validate against specific departments
        if (formData.role === 'subadmin' && !subadminDepartments.includes(formData.department)) {
          stepErrors.department = `For subadmin, department must be one of: ${subadminDepartments.join(', ')}`;
        }
        // Service validation (optional, but if selected, must be valid)
        if (formData.service && !services.includes(formData.service)) {
          stepErrors.service = `Invalid service. Must be one of: ${services.join(', ')}`;
        }
        setErrors(prev => ({ ...prev, ...stepErrors }));
        // Optional: Log for debugging
        console.log('Step 3 validation:', { role: formData.role, department: formData.department, service: formData.service, errors: stepErrors });
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [formData.role, formData.department, formData.branch, formData.service, activeStep]);

  const steps = [
    { title: 'Basic Info', icon: User },
    { title: 'Credentials', icon: Key },
    { title: 'Role & Access', icon: Shield },
  ];

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Basic info validation
    if (activeStep === 0) {
      if (!formData.name?.trim() || formData.name.trim().length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone?.trim() || !/^\+?\d{10,12}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number (10-12 digits)';
      }
      if (formData.uniqueId && !/^CAG\d+$/.test(formData.uniqueId.trim())) {
        newErrors.uniqueId = 'Must follow format CAG<number> (e.g., CAG001)';
      }
    }

    // Credentials validation
    if (activeStep === 1) {
      if (!formData.password) newErrors.password = 'Password is required';
      else {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
        if (!strongPasswordRegex.test(formData.password)) {
          newErrors.password = 'Password must be 8+ chars with uppercase, lowercase, number & special character';
        }
      }
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role & Access validation (updated for subadmin department restriction)
    if (activeStep === 2) {
      if (!formData.role) newErrors.role = 'Role is required';
      if (!formData.branch) newErrors.branch = 'Branch is required';
      if (!formData.department) newErrors.department = 'Department is required';
      if (formData.role === 'subadmin' && !subadminDepartments.includes(formData.department)) {
        newErrors.department = `For subadmin, department must be one of: ${subadminDepartments.join(', ')}`;
      }
      // Service optional, but validate if provided
      if (formData.service && !services.includes(formData.service)) {
        newErrors.service = `Invalid service. Must be one of: ${services.join(', ')}`;
      }
    }

    setErrors(newErrors);
    // Optional: Log for debugging
    console.log('Full validation:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const nextStep = () => {
    if (validateForm()) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submitData = { ...formData };
      // Optional: Log payload for debugging
      console.log('Submitting payload:', submitData);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/adminassignments/create-internal-user`,
        submitData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.status === 201) {
        const { id, uniqueId, email, role, department, service } = response.data.data;
        setSuccessData({
          message: `User created successfully! Share these credentials with ${role}:`,
          id,
          uniqueId,
          email,
          role,
          department,
          service,
        });
        toast.success('Internal user created successfully!');
        setFormData({
          email: '',
          role: '',
          branch: '',
          name: '',
          phone: '',
          uniqueId: '',
          password: '',
          confirmPassword: '',
          department: '',
          service: '',
        });
        setActiveStep(0);
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      if (error instanceof AxiosError && error.response) {
        const { message } = error.response.data;
        const firstError = error.response.data.errors?.[0]?.message || message || 'Failed to create user';
        toast.error(firstError);
        if (error.response.data.errors) {
          const serverErrors: { [key: string]: string } = {};
          error.response.data.errors.forEach((err: any) => {
            serverErrors[err.field] = err.message;
          });
          setErrors(prev => ({ ...prev, ...serverErrors }));
          // Optional: Log server errors
          console.log('Server errors:', serverErrors);
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white border border-gray-200 shadow-xl',
          duration: 4000,
        }}
      />

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Layout */}
      <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
        {/* Header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Steps */}
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
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Internal User
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
                    {/* Step 1: Basic Information */}
                    {activeStep === 0 && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                              <Hash className="w-4 h-4 mr-2 text-blue-500" />
                              Unique ID
                              <span className="text-gray-400 text-xs ml-1">(Optional, auto-generated)</span>
                            </label>
                            <input
                              name="uniqueId"
                              value={formData.uniqueId}
                              onChange={handleChange}
                              className="w-full px-4 py-3.5 rounded-xl border-2 text-black border-gray-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder="CAG001"
                            />
                            {errors.uniqueId && (
                              <p className="text-sm text-red-600 flex items-center">
                                {errors.uniqueId}
                              </p>
                            )}
                          </div>

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
                            />
                            {errors.name && (
                              <p className="text-sm text-red-600 flex items-center">
                                {errors.name}
                              </p>
                            )}
                          </div>
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
                          />
                          {errors.email && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.email}
                            </p>
                          )}
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
                            placeholder="+91 1234567890"
                            required
                          />
                          {errors.phone && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Credentials */}
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
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.password}
                            </p>
                          )}
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {['8+ chars', 'A-Z', 'a-z', '0-9', '@$!%'].map(req => (
                              <div key={req} className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                <span className="text-xs text-gray-500">{req}</span>
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
                          />
                          {errors.confirmPassword && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Role & Access (Updated: Added service selection; optional for admin depts) */}
                    {activeStep === 2 && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Role Assignment *
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-black">
                            {internalRoles.map(role => {
                              const Icon = role.icon;
                              const isSelected = formData.role === role.value;

                              return (
                                <button
                                  key={role.value}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, role: role.value }));
                                    if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
                                  }}
                                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${isSelected
                                      ? 'border-blue-500 bg-blue-50/50 shadow-md scale-105'
                                      : 'border-gray-200 bg-white/50 hover:border-gray-300 hover:scale-102'
                                    }`}
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
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.role}
                            </p>
                          )}
                        </div>

                        {/* Department Selection (always shown, restricted for subadmin) */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Building className="w-4 h-4 mr-2 text-blue-500" />
                            Department *
                            {formData.role === 'subadmin' && (
                              <span className="text-gray-400 text-xs ml-1">(Subadmin only: Sales & Customer Services, Human Resources, Financial)</span>
                            )}
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
                              required
                            >
                              <option value="">Select Department</option>
                              {(formData.role === 'subadmin' ? subadminDepartments : departments).map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.department && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.department}
                            </p>
                          )}
                        </div>

                        {/* Service Selection (optional, shown for all roles) */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center">
                            <Activity className="w-4 h-4 mr-2 text-blue-500" />
                            Service (Optional)
                            <span className="text-gray-400 text-xs ml-1">(Select if applicable)</span>
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
                            >
                              <option value="">No Service</option>
                              {services.map(svc => (
                                <option key={svc} value={svc}>{svc}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.service && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.service}
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
                            >
                              <option value="">Select Branch</option>
                              {branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                          </div>
                          {errors.branch && (
                            <p className="text-sm text-red-600 flex items-center">
                              {errors.branch}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-gray-200/60">
                      <button
                        type="button"
                        onClick={prevStep}
                        disabled={activeStep === 0}
                        className="px-8 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Back
                      </button>

                      {activeStep < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={nextStep}
                          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Success Card */}
              {successData && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200/60 rounded-2xl p-6 shadow-lg animate-slideIn">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">User Created!</h3>
                      <p className="text-sm text-green-700">Successfully created internal user</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="bg-white/60 rounded-xl p-4 border border-green-200/40">
                      <p className="text-sm text-green-800 font-medium mb-2">Share these credentials:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Unique ID:</span>
                          <span className="font-mono font-semibold text-green-900">{successData.uniqueId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Email:</span>
                          <span className="font-semibold text-green-900">{successData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Role:</span>
                          <span className="font-semibold text-green-900 capitalize">{successData.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Department:</span>
                          <span className="font-semibold text-green-900">{successData.department}</span>
                        </div>
                        {successData.service && (
                          <div className="flex justify-between">
                            <span className="text-green-700">Service:</span>
                            <span className="font-semibold text-green-900">{successData.service}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href={`/admin-dashboard/Assignment/${successData.id}/view`}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View User Profile</span>
                    </Link>
                    <Link
                      href={`/admin-dashboard/Assignment/${successData.id}/edit`}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4">User Creation Guide</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Admin Privileges</p>
                      <p className="text-xs text-gray-600">Only admins can create internal users</p>
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
                      <p className="text-xs text-gray-600">Assign appropriate permissions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateInternalUser;