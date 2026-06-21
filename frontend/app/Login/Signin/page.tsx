'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, FlaskConical, Microscope, Dna } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Header from '../../../app/Compontent/Header';
import Footer from '../../../app/Compontent/Footer';
import axios, { AxiosError } from 'axios';
const SignInComponent = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [serverError, setServerError] = useState('');
  const router = useRouter();
  // Function to normalize input to dashboard slug
  const normalizeToSlug = (input: string): string => {
    if (!input) return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s&]/g, '')
      .replace(/\s+/g, '-')
      .replace(/&/g, '-and-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };
  // Function to determine dashboard path based on role, department, service, and seniority
  const getDashboardPath = (role: string, department: string, service: string, seniority: string | null) => {
    const userRole = role.toLowerCase();
    const userDeptSlug = normalizeToSlug(department);
    const userServiceSlug = normalizeToSlug(service);
    const userSenioritySlug = seniority ? normalizeToSlug(seniority) : '';
    // Base paths for all roles
    const basePaths: Record<string, string> = {
      admin: '/admin-dashboard',
      subadmin: '/subadmin-dashboard',
      user: '/user-dashboard',
      employee: '/employee-dashboard',
      manager: '/manager-dashboard',
      head: '/head-dashboard',
      tl: '/tl-dashboard',
      superadmin: '/super-admin-dashboard',
    };
    // Roles that use department/service paths
    const structuredRoles = ['subadmin', 'employee', 'manager', 'head', 'tl'];
    if (structuredRoles.includes(userRole)) {
      // Mappings for shortening slugs (departments and services)
      const slugMappings: Record<string, string> = {
        // Departments
        'sales-and-customer-services': 'sale',
        'human-resources': 'hr',
        'financial': 'finance',
        'finance-department': 'finance',
        // Services
        'ngs': 'ngs',
        'drug-discovery': 'drug-discovery',
        'software-development': 'software-development',
        'microbiology': 'microbiology',
        'biochemistry': 'biochemistry',
        'molecular-biology': 'molecular-biology',
      };
      let path = '';
      if (userDeptSlug) {
        const mappedDept = slugMappings[userDeptSlug] || userDeptSlug;
        path = `/department/${mappedDept}`;
        if (userServiceSlug && userRole !== 'subadmin') { // subadmin forbids service
          const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
          path += `/service/${mappedService}`;
        }
      } else if (userServiceSlug) {
        const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
        path = `/service/${mappedService}`;
      }
      // Append seniority for employee role
      if (userRole === 'employee' && userSenioritySlug) {
        path += `/seniority/${userSenioritySlug}`;
      }
      return `${basePaths[userRole]}${path}`;
    }
    // Fixed paths for admin and user
    return `${basePaths[userRole] || '/user-dashboard'}`;
  };
  const validateForm = () => {
    const newErrors = { identifier: '', password: '' };
    let isValid = true;
    if (!identifier.trim()) {
      newErrors.identifier = 'Identifier is required.';
      isValid = false;
    } else if (identifier.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        newErrors.identifier = 'Enter a valid email address.';
        isValid = false;
      }
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required.';
      isValid = false;
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters.';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };
  const handleLogin = async () => {
    setServerError('');
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`,
        { email: identifier, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed');
      }
      const { token, user } = response.data;
      if (token && user?.id) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Login successful!');
        // Display role, department, and service preview
        const roleDisplay = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
        const deptDisplay = user.department || 'N/A';
        const serviceDisplay = user.service || 'N/A';
        const seniorityDisplay = user.seniority ? user.seniority.charAt(0).toUpperCase() + user.seniority.slice(1) : 'N/A';
        toast.custom(
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-sm">
            <h3 className="font-bold text-blue-800 mb-2">Welcome Back!</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p><strong>Role:</strong> {roleDisplay}</p>
              <p><strong>Department:</strong> {deptDisplay}</p>
              <p><strong>Service:</strong> {serviceDisplay}</p>
              {user.seniority && <p><strong>Seniority:</strong> {seniorityDisplay}</p>}
            </div>
          </div>,
          { duration: 5000, position: 'top-center' }
        );
        // Redirect based on role and department/service/seniority
        const dashboardPath = getDashboardPath(user.role, user.department, user.service, user.seniority);
        // Bypass OTP phase for now as requested
        const rolesForAttendance = ['manager', 'tl', 'employee', 'head', 'subadmin'];
        if (rolesForAttendance.includes(user.role?.toLowerCase())) {
          router.push(`/Login/VerifyEmail?redirect=${encodeURIComponent(dashboardPath)}`);
        } else {
          router.push(dashboardPath);
        }
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error: unknown) {
      console.error('❌ Login Error:', error);
      let errorMessage = 'Something went wrong. Please try again.';
      if (error instanceof AxiosError) {
        const responseData = error.response?.data as { error?: string; message?: string; details?: { identifier?: string; email?: string; password?: string } };
        const details = responseData?.details;
        errorMessage =
          details?.identifier ||
          details?.email ||
          details?.password ||
          responseData?.error ||
          responseData?.message ||
          errorMessage;
      }
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await handleLogin();
  };
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />
      <main className="flex-grow flex items-center justify-center py-8">
        <div className="relative w-full max-w-lg mx-4 my-8">
          {/* Background decorative elements */}
          {/* <div className="absolute -top-10 -left-10 opacity-20">
            <Dna size={120} className="text-blue-400 rotate-45" />
          </div>
          <div className="absolute -bottom-8 -right-8 opacity-20">
            <FlaskConical size={140} className="text-blue-300 -rotate-12" />
          </div>
          <div className="absolute top-20 -right-6 opacity-15">
            <Microscope size={100} className="text-blue-500 rotate-12" />
          </div> */}

          {/* Main card */}
          <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-blue-200/50">
            {/* Header section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Microscope size={36} className="text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome to Madurai BioScience</h2>
              <p className="text-blue-100 text-lg">Sign in to your research portal</p>
            </div>
            {/* Form section */}
            <div className="p-8">
              {serverError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {serverError}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identifier field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Email or Unique ID
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrors((prev) => ({ ...prev, identifier: '' }));
                    }}
                    suppressHydrationWarning
                    className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white ${errors.identifier
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 focus:border-blue-500'
                      } focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900 placeholder-gray-500`}
                    placeholder="researcher@institution.org or CAG001"
                  />
                  {errors.identifier && (
                    <p className="mt-2 text-sm text-red-600 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.identifier}
                    </p>
                  )}
                </div>
                {/* Password field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      suppressHydrationWarning
                      className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white ${errors.password
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 focus:border-blue-500'
                        } focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900 placeholder-gray-500 pr-12`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                </div>
                {/* Forgot password link */}
                <div className="flex items-center justify-between">
                  <Link
                    href="/Verify/ForgotPassword"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:ring-offset-2 transition-all duration-200 transform hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>
              {/* Sign up link */}
              <div className="mt-8 text-center">
                <p className="text-gray-600 text-sm">
                  Don't have a research account?{' '}
                  <Link
                    href="/Login/Signup"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 hover:underline"
                  >
                    Request access
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default SignInComponent;