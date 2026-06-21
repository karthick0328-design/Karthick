// app/admin/edit-user/[id]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { 
  User, Mail, Building, Phone, Lock, Loader2, Shield, 
  ArrowLeft, Save, Settings, Users, Key, BadgeCheck, 
  ChevronDown, Sparkles, Eye, EyeOff, Calendar,
  MapPin, Briefcase, Crown, Activity
} from 'lucide-react';
import Link from 'next/link';
import Header from '../../../../adminCompontent/Header';
import Sidebar from '../../../../adminCompontent/sidebarAdmin';

interface FormData {
  name?: string;
  email: string;
  phone?: string;
  password?: string;
  role: string;
  branch: string;
  department: string;
  service: string;
}

const internalRoles = [
  { value: 'subadmin', label: 'Subadmin', icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'employee', label: 'Employee', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'head', label: 'Head', icon: User, color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { value: 'tl', label: 'Team Lead', icon: User, color: 'text-red-600', bgColor: 'bg-red-100' },
];

const branches = ['Madurai', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai'];
const departments = [
  'Sales & Customer Services',
  'Human Resources',
  'Financial'
];

const subadminDepartments = [
  'Sales & Customer Services',
  'Human Resources',
  'Financial'
];

const services = [
  'NGS',
  'Drug Discovery',
  'Software Development',
  'Microbiology',
  'BioChemistry',
  'Molecular Biology'
];

const departmentMap: { [key: string]: string } = {
  'sales-and-customer-services': 'Sales & Customer Services',
  'human-resources': 'Human Resources',
  'financial': 'Financial',
};

const EditInternalUser = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: '',
    branch: '',
    name: '',
    phone: '',
    department: '',
    service: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  console.log('Debug: Extracted user ID from params:', id);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'admin') {
      router.push('/Login/Signin');
      toast.error('Access denied. Admin only.');
      return;
    }

    if (!id || id === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setFetchError('Invalid user ID provided. Please check the URL.');
      setFetchLoading(false);
      toast.error('Invalid user ID');
      return;
    }

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/adminassignments/internal-users/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.status === 200 && response.data.success) {
          const userData = response.data.data;
          setUser(userData);
          setFormData({
            name: userData.name || '',
            email: userData.email,
            phone: userData.phone || '',
            role: userData.role,
            branch: userData.branch,
            department: departmentMap[userData.department] || userData.department || '',
            service: userData.service || '',
          });
        } else {
          throw new Error(response.data.message || 'Failed to fetch user');
        }
      } catch (err: unknown) {
        let errorMessage = 'An unexpected error occurred';
        if (err instanceof AxiosError) {
          if (err.response?.status === 404) {
            errorMessage = 'User not found';
          } else if (err.response?.status === 400) {
            errorMessage = 'Invalid user ID';
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          }
        }
        setFetchError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchUser();
  }, [id, router]);

  // Real-time validation for role & access changes
  useEffect(() => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (formData.role === 'subadmin' && !subadminDepartments.includes(formData.department)) {
      newErrors.department = `For subadmin, department must be one of: ${subadminDepartments.join(', ')}`;
    }
    if (formData.service && !services.includes(formData.service)) {
      newErrors.service = `Invalid service. Must be one of: ${services.join(', ')}`;
    }
    setErrors(prev => ({ ...prev, ...newErrors }));
  }, [formData.role, formData.branch, formData.department, formData.service]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.role) newErrors.role = 'Role is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (formData.role === 'subadmin' && !subadminDepartments.includes(formData.department)) {
      newErrors.department = `For subadmin, department must be one of: ${subadminDepartments.join(', ')}`;
    }
    if (formData.password && formData.password.trim() && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.';
    }
    if (formData.service && !services.includes(formData.service)) {
      newErrors.service = `Invalid service. Must be one of: ${services.join(', ')}`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) setErrors(prev => ({ ...prev, [name as keyof FormData]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...formData };
      if (!formData.password || formData.password.trim() === '') {
        delete submitData.password;
      }
      
      console.log('Debug: Submitting update for ID:', id);
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/adminassignments/internal-users/${id}`,
        submitData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (response.status === 200 && response.data.success) {
        toast.success('User updated successfully!');
        router.push(`/admin-dashboard/Assignment/${id}/view`);
      }
    } catch (error: unknown) {
      console.error('Debug: Update error details:', error);
      if (error instanceof AxiosError && error.response) {
        console.log('Debug: Backend response data:', error.response.data);
        const { message, errors } = error.response.data;
        toast.error(message || 'Failed to update user');
        if (errors && Array.isArray(errors)) {
          const serverErrors: { [key: string]: string } = {};
          errors.forEach((err: any) => {
            serverErrors[err.field] = err.message;
          });
          setErrors(prev => ({ ...prev, ...serverErrors }));
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Loading User Details</h3>
              <p className="text-gray-600">Please wait while we fetch the user information...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (fetchError || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="max-w-md mx-auto text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/60">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h2>
              <p className="text-gray-600 mb-6">{fetchError || 'User not found'}</p>
              <Link 
                href="/admin-dashboard" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getRoleIcon = (roleValue: string) => {
    const role = internalRoles.find(r => r.value === roleValue);
    return role ? role.icon : Users;
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'role', label: 'Role & Access', icon: Shield },
  ];

  const displayDepartment = departmentMap[user.department] || user.department || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: 'bg-white border border-gray-200 shadow-xl',
          duration: 4000,
        }}
      />
      
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Link 
                    href={`/admin-dashboard/Assignment/${id}/view`}
                    className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 flex items-center justify-center hover:bg-white transition-all shadow-lg hover:shadow-xl"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Edit User Profile</h1>
                    <p className="text-gray-600">Update user information and permissions</p>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* User Summary Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{user.name || 'Unnamed User'}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Briefcase className="w-4 h-4" />
                          <span className="capitalize">{user.role}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span>{user.branch}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Building className="w-4 h-4" />
                          <span>{displayDepartment}</span>
                        </div>
                        {user.service && (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Activity className="w-4 h-4" />
                            <span>{user.service}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      <Calendar className="w-4 h-4 mr-2" />
                      Updated: {new Date(user.updatedAt || user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200/60">
                    <div className="flex space-x-1 p-6 pb-0">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Basic Info Tab */}
                      {activeTab === 'basic' && (
                        <div className="space-y-6 animate-fadeIn">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <User className="w-4 h-4 mr-2 text-blue-500" />
                                Full Name
                              </label>
                              <input
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3.5 rounded-xl border-2 text-black border-gray-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="John Doe"
                              />
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
                                className={`w-full px-4 py-3.5 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all ${
                                  errors.email 
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
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                              <Phone className="w-4 h-4 mr-2 text-blue-500" />
                              Phone Number
                            </label>
                            <input
                              name="phone"
                              value={formData.phone || ''}
                              onChange={handleChange}
                              className="w-full px-4 py-3.5 rounded-xl border-2 text-black border-gray-200 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder="+91 1234567890"
                            />
                          </div>
                        </div>
                      )}

                      {/* Security Tab */}
                      {activeTab === 'security' && (
                        <div className="space-y-6 animate-fadeIn">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                            <div className="flex items-center space-x-3">
                              <Key className="w-6 h-6 text-yellow-600" />
                              <div>
                                <h4 className="font-semibold text-yellow-900">Password Update</h4>
                                <p className="text-sm text-yellow-700">Leave blank to keep current password</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                              <Lock className="w-4 h-4 mr-2 text-blue-500" />
                              New Password
                            </label>
                            <div className="relative">
                              <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password || ''}
                                onChange={handleChange}
                                className={`w-full px-4 py-3.5 pr-12 rounded-xl border-2 text-black bg-white/50 backdrop-blur-sm transition-all ${
                                  errors.password 
                                    ? 'border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500' 
                                    : 'border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                        </div>
                      )}

                      {/* Role & Access Tab */}
                      {activeTab === 'role' && (
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
                                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50/50 shadow-md scale-105'
                                        : 'border-gray-200 bg-white/50 hover:border-gray-300 hover:scale-102'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isSelected ? 'bg-blue-500' : role.bgColor
                                      }`}>
                                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : role.color}`} />
                                      </div>
                                      <span className={`font-medium text-sm ${
                                        isSelected ? 'text-blue-900' : 'text-gray-700'
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  className={`w-full px-4 py-3.5 text-black pr-10 rounded-xl border-2 bg-white/50 backdrop-blur-sm appearance-none transition-all ${
                                    errors.department 
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
                                  className={`w-full px-4 py-3.5 pr-10 rounded-xl text-black border-2 bg-white/50 backdrop-blur-sm appearance-none transition-all ${
                                    errors.service 
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
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                              Branch *
                            </label>
                            <div className="relative">
                              <select
                                name="branch"
                                value={formData.branch}
                                onChange={handleChange}
                                className={`w-full px-4 py-3.5 pr-10 rounded-xl text-black border-2 bg-white/50 backdrop-blur-sm appearance-none transition-all ${
                                  errors.branch 
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

                      {/* Submit Button */}
                      <div className="flex justify-between pt-6 border-t border-gray-200/60">
                        <Link
                          href={`/admin-dashboard/Assignment/${id}/view`}
                          className="px-8 py-3.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all flex items-center space-x-2"
                        >
                          <ArrowLeft className="w-5 h-5" />
                          <span>Cancel</span>
                        </Link>

                        <button
                          type="submit"
                          disabled={loading}
                          className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-blue-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Updating User...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* User Status Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">User Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Account Status</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Login</span>
                      <span className="text-sm text-gray-900">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Created</span>
                      <span className="text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href={`/admin-dashboard/Assignment/${id}/view`}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">View Profile</span>
                    </Link>
                    {/* <Link
                      href={`/admin/user-history/${id}`}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                    >
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">View History</span>
                    </Link> */}
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

export default EditInternalUser;