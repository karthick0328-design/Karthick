'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios, { AxiosError } from 'axios';
import { Eye, EyeOff, User, Mail, Phone, MapPin, Building, GraduationCap, Briefcase, Check, X, Loader2, Users, Microscope } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface PreviousExperience {
  prevCompany: string;
  prevRole: string;
  prevYearOfExperience: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  isWhatsApp: boolean;
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
  branch: string;
}

interface FormErrors {
  [key: string]: string | any;
}

const SignUpComponent = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    isWhatsApp: false,
    address: '',
    country: '',
    location: '',
    membershipType: '',
    professionalRole: '',
    company: '',
    college: '',
    degree: '',
    highestDegree: '',
    currentYear: '',
    passOutYear: '',
    yearOfExperience: '',
    previousExperiences: [],
    branch: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  // Password strength calculator (adjusted to better match backend regex)
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[@$!%?&]/.test(password)) strength += 10; // Match backend special chars (removed * for consistency)
    return Math.min(strength, 100);
  };

  // Backend-matching password regex
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password]);

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Membership Type', icon: GraduationCap },
    { number: 3, title: 'Security', icon: Check },
  ];

  // Clear step-specific errors on step change
  useEffect(() => {
    const stepKeys = getStepValidationKeys(activeStep);
    setErrors(prev => {
      const newErrors: FormErrors = { ...prev };
      stepKeys.forEach(key => delete newErrors[key]);
      return newErrors;
    });
  }, [activeStep]);

  const getStepValidationKeys = (step: number): string[] => {
    switch (step) {
      case 1: return ['name', 'email', 'phone', 'address', 'country', 'location'];
      case 2: return ['membershipType', 'branch', 'college', 'degree', 'highestDegree', 'currentYear', 'passOutYear', 'company', 'professionalRole', 'yearOfExperience'];
      case 3: return ['password', 'confirmPassword'];
      default: return [];
    }
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      // Clear current step errors on success
      const stepKeys = getStepValidationKeys(activeStep);
      setErrors(prev => {
        const newErrors: FormErrors = { ...prev };
        stepKeys.forEach(key => delete newErrors[key]);
        return newErrors;
      });
      setActiveStep(prev => Math.min(prev + 1, steps.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Real-time-ish checks for common fields (run on every validate)
    if (step >= 1) {
      if (formData.phone && !/^\+?\d{10,12}$/.test(formData.phone.replace(/\D/g, ''))) { // Strip non-digits for leniency
        newErrors.phone = 'Enter a valid phone number (10-12 digits)';
        isValid = false;
      }
    }
    if (step >= 3) {
      if (formData.password && !strongPasswordRegex.test(formData.password)) { // FIX: Use backend regex for strict validation
        newErrors.password = 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.';
        isValid = false;
      }
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    switch (step) {
      case 1:
        if (!formData.name.trim()) { newErrors.name = 'Name is required'; isValid = false; }
        if (!formData.email.trim()) { newErrors.email = 'Email is required'; isValid = false; }
        else if (!/^\S+@\S+\.\S+$/.test(formData.email)) { newErrors.email = 'Enter a valid email address'; isValid = false; }
        if (!formData.phone.trim()) { newErrors.phone = 'Phone number is required'; isValid = false; }
        else if (formData.phone.replace(/\D/g, '').length < 10 || formData.phone.replace(/\D/g, '').length > 12) {
          newErrors.phone = 'Enter a valid phone number (10-12 digits)'; isValid = false;
        }
        if (!formData.address.trim()) { newErrors.address = 'Address is required'; isValid = false; }
        if (!formData.country) { newErrors.country = 'Country is required'; isValid = false; }
        if (!formData.location.trim()) {
          newErrors.location = `${formData.country === 'Indian' ? 'State/City' : 'Country/State/City'} is required`;
          isValid = false;
        }
        break;
      case 2:
        if (!formData.membershipType) { newErrors.membershipType = 'Please select a membership type'; isValid = false; }
        if (!formData.branch) { newErrors.branch = 'Branch is required'; isValid = false; }
        if (formData.membershipType === 'student' || formData.membershipType === 'scholar') {
          if (!formData.college.trim()) newErrors.college = 'College is required';
          if (!formData.degree.trim()) newErrors.degree = 'Degree is required';
          if (formData.membershipType === 'student' && !formData.highestDegree) {
            newErrors.highestDegree = 'Highest degree is required';
          }
          // FIX: Parse strings to numbers for validation
          const currentYearNum = formData.currentYear ? parseInt(formData.currentYear, 10) : NaN;
          const passOutYearNum = formData.passOutYear ? parseInt(formData.passOutYear, 10) : NaN;
          if (formData.membershipType === 'student' && isNaN(currentYearNum) && isNaN(passOutYearNum)) {
            newErrors.currentYear = 'Current year or pass out year is required';
          }
          // Optional: Validate previous exps if added
          formData.previousExperiences.forEach((exp, i) => {
            if (exp.prevCompany.trim() === '' || exp.prevRole.trim() === '') {
              newErrors[`prevCompany-${i}`] = 'Company and role required if added';
              isValid = false;
            }
          });
        } else if (formData.membershipType === 'faculty' || formData.membershipType === 'industry') {
          if (!formData.company.trim()) newErrors.company = 'Company/Institution is required';
          if (!formData.professionalRole.trim()) newErrors.professionalRole = 'Professional role is required';
          if (!formData.yearOfExperience && formData.previousExperiences.length === 0) {
            newErrors.yearOfExperience = 'Year of experience or previous experience is required';
          }
          if (!formData.highestDegree) newErrors.highestDegree = 'Highest degree is required';
          if (!formData.college.trim()) newErrors.college = 'College is required';
        }
        break;
      case 3:
        if (!formData.password.trim()) { newErrors.password = 'Password is required'; isValid = false; }
        else if (formData.password.length < 8) { newErrors.password = 'Password must be at least 8 characters long'; isValid = false; }
        if (!formData.confirmPassword.trim()) { newErrors.confirmPassword = 'Confirm password is required'; isValid = false; }
        break;
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    if (!isValid) {
      toast.error('Please fix the errors before continuing', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
    return isValid;
  };

  const addPreviousExperience = () => {
    setFormData(prev => ({
      ...prev,
      previousExperiences: [...prev.previousExperiences, { prevCompany: '', prevRole: '', prevYearOfExperience: '' }],
    }));
  };

  const removePreviousExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      previousExperiences: prev.previousExperiences.filter((_, i) => i !== index),
    }));
    // Clear related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`prevCompany-${index}`];
      delete newErrors[`prevRole-${index}`];
      delete newErrors[`prevYearOfExperience-${index}`];
      return newErrors;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, type, value } = target;
    let updatedData = { ...formData };
    if (name.startsWith('prev')) {
      const [field, indexStr] = name.split('-');
      const index = parseInt(indexStr!);
      updatedData = {
        ...formData,
        previousExperiences: formData.previousExperiences.map((exp, i) =>
          i === index ? { ...exp, [field!]: value } : exp
        ),
      };
    } else if (type === 'checkbox') {
      updatedData = { ...formData, [name]: (target as HTMLInputElement).checked };
    } else if (name === 'country') {
      updatedData = { ...formData, [name]: value, location: '' };
    } else if (name === 'phone') {
      // Strip non-digits for storage/validation leniency
      updatedData = { ...formData, [name]: value.replace(/\D/g, '') || value };
    } else {
      updatedData = { ...formData, [name]: value || '' };
      if (name === 'membershipType') {
        if (value === 'student' || value === 'scholar') {
          updatedData = {
            ...updatedData,
            company: '',
            professionalRole: '',
            yearOfExperience: '',
            previousExperiences: [],
            ...(value === 'scholar' ? {
              highestDegree: '',
              currentYear: '',
              passOutYear: '',
            } : {}),
          };
        } else if (value === 'faculty' || value === 'industry') {
          updatedData = {
            ...updatedData,
            degree: '',
            currentYear: '',
            passOutYear: '',
          };
        }
      }
    }
    setFormData(updatedData);
    // Clear error when user starts typing (or changes)
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Real-time validation for password/confirm on change
    if (name === 'password' || name === 'confirmPassword') {
      validateStep(3); // Re-run step 3 validation inline
    }
  };

  const getMembershipOptions = () => {
    return [
      { id: 'student', label: 'Student', icon: GraduationCap, description: 'Currently enrolled student' },
      { id: 'scholar', label: 'Research Scholar', icon: Microscope, description: 'PhD or research student' },
      { id: 'faculty', label: 'Faculty/Clinician', icon: Users, description: 'Academic or medical professional' },
      { id: 'industry', label: 'Industry Professional', icon: Briefcase, description: 'Industry or corporate professional' },
    ];
  };

  // Updated handleSubmit function in the frontend SignUpComponent
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setLoading(true);
    setServerMessage(null);
    // FIX: Send currentYear and passOutYear as strings (empty if falsy)
    const signupData: any = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      country: formData.country,
      location: formData.location.trim(),
      membershipType: formData.membershipType,
      professionalRole: formData.professionalRole.trim(),
      company: formData.company.trim(),
      college: formData.college.trim(),
      degree: formData.degree.trim(),
      highestDegree: formData.highestDegree,  // ← FIX: Include highestDegree in payload
      currentYear: formData.currentYear || '', // FIX: Send as string
      passOutYear: formData.passOutYear || '', // FIX: Send as string
      yearOfExperience: formData.yearOfExperience,
      previousExperiences: formData.previousExperiences.filter(exp =>
        exp.prevCompany.trim() || exp.prevRole.trim() // Filter empty exps on submit
      ),
      branch: formData.branch,
      isWhatsApp: formData.isWhatsApp,
    };
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/signup`,
        signupData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.status === 201 || response.status === 200) {
        const { token, user, message } = response.data;
        if (token && user?.id) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          toast.success(message || 'Account created successfully!', {
            style: { background: '#059669', color: 'white' }
          });
          setTimeout(() => router.push('/Login/Signin'), 2000);
        }
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response) {
        const { status, data } = error.response;
        if (data.errors && Array.isArray(data.errors)) {
          // Map backend errors to frontend errors state
          const backendErrors: FormErrors = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            backendErrors[err.field] = err.message;
          });
          setErrors(backendErrors);
          // Determine the earliest step with errors to navigate back to
          const fieldToStep: { [key: string]: number } = {
            name: 1, email: 1, phone: 1, address: 1, country: 1, location: 1,
            membershipType: 2, branch: 2,
            college: 2, degree: 2, highestDegree: 2, currentYear: 2, passOutYear: 2,
            company: 2, professionalRole: 2, yearOfExperience: 2,
            password: 3, confirmPassword: 3,
          };
          const errorSteps = Object.keys(backendErrors).map(key => fieldToStep[key] || 3);
          if (errorSteps.length > 0) {
            const earliestStep = Math.min(...errorSteps);
            setActiveStep(earliestStep);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          // Toast the first error for immediate feedback
          const firstError = data.errors[0]?.message;
          toast.error(firstError || 'Please fix the errors above', {
            style: { background: '#ef4444', color: 'white' }
          });
          setServerMessage(`Validation failed: ${firstError || 'Check the highlighted fields'}`);
        } else {
          const errorMessage = data.message || 'Signup failed. Please try again.';
          setServerMessage(errorMessage);
          toast.error(errorMessage, { style: { background: '#ef4444', color: 'white' } });
        }
      } else {
        const errorMessage = 'An unexpected error occurred. Please try again.';
        setServerMessage(errorMessage);
        toast.error(errorMessage, { style: { background: '#ef4444', color: 'white' } });
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const inputClassName = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border ${hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    } focus:ring-2 focus:border-transparent transition-all duration-200 text-black bg-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Left Side - Branding */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 lg:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">BioScience Hub</h1>
                </div>

                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                  Join Our Scientific Community
                </h2>
                <p className="text-blue-100 text-lg mb-8">
                  Connect with biology professionals, access cutting-edge research, and advance your scientific career.
                </p>
              </div>
              <div className="space-y-6">
                {[
                  { icon: GraduationCap, text: 'Access premium research materials' },
                  { icon: Briefcase, text: 'Network with industry experts' },
                  { icon: Check, text: 'Verified scientific content' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-blue-100 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
              {/* Progress Steps */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  {steps.map((step, index) => (
                    <div key={step.number} className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${activeStep >= step.number
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-400'
                        } transition-all duration-300`}>
                        {activeStep > step.number ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`text-xs mt-2 ${activeStep >= step.number ? 'text-blue-600 font-medium' : 'text-gray-500'
                        }`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          {/* Right Side - Form */}
          <div className="p-8 lg:p-12" ref={formRef}>
            <div className="max-w-md mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Personal Information */}
                {activeStep === 1 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h3 className="text-2xl font-bold text-black mb-2">Personal Information</h3>
                      <p className="text-gray-600">Tell us about yourself</p>
                    </div>
                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        <User className="w-4 h-4 mr-2" />
                        Full Name
                      </label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputClassName(!!errors.name)}
                        placeholder="Enter your full name"
                      />
                      {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                    </div>
                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Address
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={inputClassName(!!errors.email)}
                        placeholder="your.email@example.com"
                      />
                      {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                    </div>
                    {/* Phone Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        <Phone className="w-4 h-4 mr-2" />
                        Phone Number
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className={inputClassName(!!errors.phone)}
                        placeholder="+1234567890"
                      />
                      {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                    </div>
                    {/* Address Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        <MapPin className="w-4 h-4 mr-2" />
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className={inputClassName(!!errors.address)}
                        placeholder="Enter your complete address"
                      />
                      {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
                    </div>
                    {/* Country and Location Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Country Radio Buttons */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-black">Country</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="country"
                              value="Indian"
                              checked={formData.country === 'Indian'}
                              onChange={handleChange}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-black">Indian</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="country"
                              value="Foreign"
                              checked={formData.country === 'Foreign'}
                              onChange={handleChange}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-black">Foreign</span>
                          </label>
                        </div>
                        {errors.country && <p className="text-sm text-red-600">{errors.country}</p>}
                      </div>
                      {/* Location Field */}
                      {formData.country && (
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <MapPin className="w-4 h-4 mr-2" />
                            {formData.country === 'Indian' ? 'State/City' : 'Country/State/City'}
                          </label>
                          <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className={inputClassName(!!errors.location)}
                            placeholder={formData.country === 'Indian' ? 'Maharashtra, Mumbai' : 'USA, California'}
                          />
                          {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
                        </div>
                      )}
                    </div>
                    {/* WhatsApp Checkbox */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="isWhatsApp"
                        checked={formData.isWhatsApp}
                        onChange={handleChange}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-black">Communication through WhatsApp</span>
                    </div>
                  </div>
                )}
                {/* Step 2: Membership Type and Professional Details */}
                {activeStep === 2 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h3 className="text-2xl font-bold text-black mb-2">Membership & Professional Details</h3>
                      <p className="text-gray-600">Choose your membership type and share your background</p>
                    </div>
                    {/* Membership Type Selection */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-black">Membership Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        {getMembershipOptions().map((option) => (
                          <label
                            key={option.id}
                            className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${formData.membershipType === option.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                              }`}
                          >
                            <input
                              type="radio"
                              name="membershipType"
                              value={option.id}
                              checked={formData.membershipType === option.id}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <div className="flex items-center space-x-3">
                              <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${formData.membershipType === option.id
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-400'
                                }`}>
                                {formData.membershipType === option.id && (
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-black">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {errors.membershipType && <p className="text-sm text-red-600">{errors.membershipType}</p>}
                    </div>
                    {/* Professional Details based on Membership Type */}
                    {(formData.membershipType === 'student' || formData.membershipType === 'scholar') && (
                      <>
                        {/* College Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <Building className="w-4 h-4 mr-2" />
                            College/University
                          </label>
                          <input
                            name="college"
                            value={formData.college}
                            onChange={handleChange}
                            className={inputClassName(!!errors.college)}
                            placeholder="Enter institution name"
                          />
                          {errors.college && <p className="text-sm text-red-600">{errors.college}</p>}
                        </div>
                        {/* Degree Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Degree
                          </label>
                          <input
                            name="degree"
                            value={formData.degree}
                            onChange={handleChange}
                            className={inputClassName(!!errors.degree)}
                            placeholder="e.g., B.Sc. Biology"
                          />
                          {errors.degree && <p className="text-sm text-red-600">{errors.degree}</p>}
                        </div>

                        {formData.membershipType === 'student' && (
                          <>
                            {/* Highest Degree Field */}
                            <div className="space-y-2">
                              <label className="flex items-center text-sm font-medium text-black">
                                <GraduationCap className="w-4 h-4 mr-2" />
                                Highest Degree
                              </label>
                              <select
                                name="highestDegree"
                                value={formData.highestDegree}
                                onChange={handleChange}
                                className={inputClassName(!!errors.highestDegree)}
                              >
                                <option value="">Select Degree</option>
                                <option value="Bachelor">Bachelor</option>
                                <option value="Master">Master</option>
                                <option value="Ph.D.">Ph.D.</option>
                              </select>
                              {errors.highestDegree && <p className="text-sm text-red-600">{errors.highestDegree}</p>}
                            </div>
                            {/* Current Year and Pass Out Year Fields */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-black">
                                  Current Year
                                </label>
                                <input
                                  name="currentYear"
                                  type="number"
                                  value={formData.currentYear}
                                  onChange={handleChange}
                                  className={inputClassName(!!errors.currentYear)}
                                  placeholder="2025"
                                />
                                {errors.currentYear && <p className="text-sm text-red-600">{errors.currentYear}</p>}
                              </div>
                              <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-black">
                                  Pass Out Year
                                </label>
                                <input
                                  name="passOutYear"
                                  type="number"
                                  value={formData.passOutYear}
                                  onChange={handleChange}
                                  className={inputClassName(!!errors.passOutYear)}
                                  placeholder="2028"
                                />
                                {errors.passOutYear && <p className="text-sm text-red-600">{errors.passOutYear}</p>}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {(formData.membershipType === 'faculty' || formData.membershipType === 'industry') && (
                      <>
                        {/* Company Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <Building className="w-4 h-4 mr-2" />
                            Company/Institution
                          </label>
                          <input
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className={inputClassName(!!errors.company)}
                            placeholder="Organization name"
                          />
                          {errors.company && <p className="text-sm text-red-600">{errors.company}</p>}
                        </div>
                        {/* Professional Role Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Professional Role
                          </label>
                          <input
                            name="professionalRole"
                            value={formData.professionalRole}
                            onChange={handleChange}
                            className={inputClassName(!!errors.professionalRole)}
                            placeholder="Your position"
                          />
                          {errors.professionalRole && <p className="text-sm text-red-600">{errors.professionalRole}</p>}
                        </div>
                        {/* Years of Experience Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            Years of Experience
                          </label>
                          <input
                            name="yearOfExperience"
                            type="number"
                            value={formData.yearOfExperience}
                            onChange={handleChange}
                            className={inputClassName(!!errors.yearOfExperience)}
                            placeholder="5"
                          />
                          {errors.yearOfExperience && <p className="text-sm text-red-600">{errors.yearOfExperience}</p>}
                        </div>

                        {/* Previous Experience Section */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-black">Previous Experience</label>
                            <button
                              type="button"
                              onClick={addPreviousExperience}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              + Add Experience
                            </button>
                          </div>

                          {formData.previousExperiences.map((exp, index) => (
                            <div key={index} className="grid grid-cols-3 gap-3 p-4 border rounded-xl">
                              <div className="space-y-2">
                                <input
                                  name={`prevCompany-${index}`}
                                  value={exp.prevCompany}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                                  placeholder="Company"
                                />
                              </div>
                              <div className="space-y-2">
                                <input
                                  name={`prevRole-${index}`}
                                  value={exp.prevRole}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                                  placeholder="Role"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="space-y-2 flex-1">
                                  <input
                                    name={`prevYearOfExperience-${index}`}
                                    type="number"
                                    value={exp.prevYearOfExperience}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                                    placeholder="Years"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePreviousExperience(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Highest Degree Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Highest Degree
                          </label>
                          <select
                            name="highestDegree"
                            value={formData.highestDegree}
                            onChange={handleChange}
                            className={inputClassName(!!errors.highestDegree)}
                          >
                            <option value="">Select Degree</option>
                            <option value="Bachelor">Bachelor</option>
                            <option value="Master">Master</option>
                            <option value="Ph.D.">Ph.D.</option>
                          </select>
                          {errors.highestDegree && <p className="text-sm text-red-600">{errors.highestDegree}</p>}
                        </div>

                        {/* College Field */}
                        <div className="space-y-2">
                          <label className="flex items-center text-sm font-medium text-black">
                            <Building className="w-4 h-4 mr-2" />
                            College (UG/PG)
                          </label>
                          <input
                            name="college"
                            value={formData.college}
                            onChange={handleChange}
                            className={inputClassName(!!errors.college)}
                            placeholder="Your college"
                          />
                          {errors.college && <p className="text-sm text-red-600">{errors.college}</p>}
                        </div>
                      </>
                    )}
                    {/* Branch Field (common) */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        <MapPin className="w-4 h-4 mr-2" />
                        Branch Location
                      </label>
                      <select
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className={inputClassName(!!errors.branch)}
                      >
                        <option value="">Select Branch</option>
                        <option value="Madurai">Madurai</option>
                        <option value="Chennai">Chennai</option>
                      </select>
                      {errors.branch && <p className="text-sm text-red-600">{errors.branch}</p>}
                    </div>
                  </div>
                )}
                {/* Step 3: Security */}
                {activeStep === 3 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h3 className="text-2xl font-bold text-black mb-2">Security</h3>
                      <p className="text-gray-600">Set up your account password</p>
                    </div>
                    {/* Password Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`${inputClassName(!!errors.password)} pr-12`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}

                      {/* Password Strength Meter */}
                      {formData.password && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Password Strength</span>
                            <span>{passwordStrength}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getPasswordStrengthColor(passwordStrength)} transition-all duration-300`}
                              style={{ width: `${passwordStrength}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-black">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`${inputClassName(!!errors.confirmPassword)} pr-12`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Password Requirements</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li className="flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          Minimum 8 characters
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          Uppercase and lowercase letters
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          At least one number
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 mr-2" />
                          Special character (@$!%*?&)
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={activeStep === 1}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeStep === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    Back
                  </button>
                  {activeStep < steps.length ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Create Account</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
              {/* Server Message Display */}
              {serverMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{serverMessage}</p>
                </div>
              )}
              <p className="mt-8 text-center text-gray-600">
                Already have an account?{' '}
                <Link href="/Login/Signin" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SignUpComponent;