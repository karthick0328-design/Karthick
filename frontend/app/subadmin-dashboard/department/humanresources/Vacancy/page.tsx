'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios, { AxiosError, isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Header from '../../../../adminCompontent/Header';
import Sidebar from '../../../../adminCompontent/sidebarAdmin';

// Define interfaces for type safety
interface Vacancy {
  _id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  salaryRange: string;
  status: 'open' | 'closed' | 'interviewing';
  applicationsCount: number;
  postedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Application {
  _id: string;
  vacancy: {
    _id: string;
    title: string;
    department: string;
  };
  user: {
    _id: string;
    uniqueId: string;
    name: string;
    email: string;
    role: string;
  };
  status: 'pending' | 'reviewed' | 'rejected' | 'hired';
  coverLetter?: string;
  appliedAt: string;
}

interface DecodedToken {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  position?: string[];
  subadminCategory?: string[];
  iat?: number;
  exp?: number;
}

interface VacancyApiResponse {
  success: boolean;
  message: string;
  count?: number;
  data?: Vacancy[];
}

interface ApplicationApiResponse {
  success: boolean;
  message: string;
  count?: number;
  data?: Application[];
}

interface CreateEditResponse {
  success: boolean;
  message: string;
  data?: Vacancy | Application;
}

interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data?: Application;
}

const VacancyManager: React.FC = () => {
  const [allVacancies, setAllVacancies] = useState<Vacancy[]>([]);
  const [openVacancies, setOpenVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    salaryRange: '',
    status: 'open' as 'open' | 'closed' | 'interviewing',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'reviewed' | 'rejected' | 'hired'>('pending');
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('Unknown');
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'applications' | 'create'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const router = useRouter();
  const hasRedirected = useRef<boolean>(false);

  // Helper function to safely access localStorage
  const getToken = (): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token');
      return token;
    }
    return null;
  };

  // Fetch all vacancies
  const fetchAllVacancies = async (token: string): Promise<void> => {
    try {
      const response = await axios.get<VacancyApiResponse>('http://localhost:5000/api/vacancies/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllVacancies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching all vacancies:', error);
      setAllVacancies([]);
    }
  };

  // Fetch open vacancies
  const fetchOpenVacancies = async (token: string): Promise<void> => {
    try {
      const response = await axios.get<VacancyApiResponse>('http://localhost:5000/api/vacancies/open', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpenVacancies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching open vacancies:', error);
      setOpenVacancies([]);
    }
  };

  // Fetch applications
  const fetchApplications = async (token: string): Promise<void> => {
    try {
      const response = await axios.get<ApplicationApiResponse>('http://localhost:5000/api/vacancies/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  };

  // Check if user is admin
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';

  // Filter vacancies based on search term
  const filteredAllVacancies = allVacancies.filter(
    (vacancy) =>
      vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacancy.department.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredOpenVacancies = openVacancies.filter(
    (vacancy) =>
      vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacancy.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter applications based on search term
  const filteredApplications = applications.filter(
    (app) =>
      app.vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch vacancies, applications and decode user role on component mount
  useEffect(() => {
    const initFetch = async () => {
      if (hasRedirected.current) {
        return;
      }
      try {
        setIsLoading(true);
        const token: string | null = getToken();
        if (!token) {
          setMessageType('error');
          setMessage('No authentication token found. Please log in.');
          hasRedirected.current = true;
          setTimeout(() => router.push('/Login/Signin'), 2000);
          return;
        }
        let decoded: DecodedToken;
        try {
          decoded = jwtDecode<DecodedToken>(token);
        } catch (decodeError) {
          console.error('Token decode error:', decodeError);
          setMessageType('error');
          setMessage('Invalid authentication token. Please log in again.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          hasRedirected.current = true;
          setTimeout(() => router.push('/Login/Signin'), 2000);
          return;
        }
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.error('Token expired');
          setMessageType('error');
          setMessage('Session expired. Please log in again.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          hasRedirected.current = true;
          setTimeout(() => router.push('/Login/SignIn'), 2000);
          return;
        }
        setUserRole(decoded.role || 'Unknown');
        const role = decoded.role?.toLowerCase();
        let hasCategoryAccess = false;
        if (role === 'admin' || role === 'superadmin') {
          hasCategoryAccess = true;
        } else if (role === 'subadmin' && decoded.subadminCategory) {
          hasCategoryAccess = decoded.subadminCategory.includes('HR');
        }
        if (!hasCategoryAccess) {
          setMessageType('error');
          setMessage('Access denied. Admin or Subadmin with HR privileges required for Vacancy Management.');
          setHasAccess(false);
          hasRedirected.current = true;
          setTimeout(() => router.push('/admin/dashboard'), 2000);
          return;
        }
        setHasAccess(true);
        await fetchAllVacancies(token);
        await fetchOpenVacancies(token);
        await fetchApplications(token);
        setMessageType('success');
        setMessage('Data loaded successfully');
      } catch (error) {
        console.error('Init fetch error:', error);
        if (isAxiosError(error)) {
          const err = error as AxiosError<VacancyApiResponse>; // Use a common type for error handling
          if (err.response?.status === 401) {
            setMessageType('error');
            setMessage(err.response?.data?.message || 'Authentication failed. Please log in again.');
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
            }
            if (!hasRedirected.current) {
              hasRedirected.current = true;
              setTimeout(() => router.push('/Login/Signin'), 2000);
            }
            return;
          } else if (err.response?.status === 403) {
            setMessageType('error');
            setMessage(err.response?.data?.message || 'Access denied. Insufficient privileges for Vacancy Management.');
            setHasAccess(false);
            return;
          }
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Error fetching data. Check backend server.');
        } else {
          setMessageType('error');
          setMessage('An unexpected error occurred while initializing. Please refresh the page.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    initFetch();
    return () => {
      hasRedirected.current = false;
    };
  }, [router]);

  // Reset form when editing changes
  useEffect(() => {
    if (editingId) {
      const editingVacancy = allVacancies.find((v) => v._id === editingId);
      if (editingVacancy) {
        setFormData({
          title: editingVacancy.title,
          department: editingVacancy.department,
          description: editingVacancy.description,
          requirements: editingVacancy.requirements.join('\n'),
          salaryRange: editingVacancy.salaryRange,
          status: editingVacancy.status,
        });
      }
    } else {
      setFormData({
        title: '',
        department: '',
        description: '',
        requirements: '',
        salaryRange: '',
        status: 'open',
      });
    }
  }, [editingId, allVacancies]);

  const handleCreateOrEdit = async () => {
    if (!formData.title.trim() || !formData.department.trim()) {
      setMessageType('error');
      setMessage('Title and department are required');
      return;
    }
    const requirementsArray = formData.requirements
      .split('\n')
      .map((req) => req.trim())
      .filter((req) => req.length > 0);
    const payload = {
      title: formData.title,
      department: formData.department,
      description: formData.description,
      requirements: requirementsArray,
      salaryRange: formData.salaryRange,
      status: formData.status,
    };
    const token: string | null = getToken();
    if (!token) {
      setMessageType('error');
      setMessage('No authentication token found. Please log in.');
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        setTimeout(() => router.push('/Login/Signin'), 2000);
      }
      return;
    }
    try {
      setIsProcessing(true);
      let response;
      if (editingId) {
        response = await axios.put<CreateEditResponse>(`http://localhost:5000/api/vacancies/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.post<CreateEditResponse>('http://localhost:5000/api/vacancies/', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setMessageType('success');
      setMessage(response.data.message || (editingId ? 'Vacancy updated successfully' : 'Vacancy created successfully'));
      setEditingId(null);
      await fetchAllVacancies(token);
      await fetchOpenVacancies(token);
    } catch (error) {
      console.error('Create/Edit Error:', error);
      if (isAxiosError(error)) {
        const err = error as AxiosError<CreateEditResponse>;
        if (err.response?.status === 401) {
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Authentication failed. Please log in again.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            setTimeout(() => router.push('/Login/SignIn'), 2000);
          }
        } else if (err.response?.status === 403) {
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Access denied. Insufficient privileges.');
        } else {
          setMessageType('error');
          setMessage(err.response?.data?.message || `Error ${editingId ? 'updating' : 'creating'} vacancy`);
        }
      } else {
        setMessageType('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (vacancyId: string) => {
    setEditingId(vacancyId);
    setActiveTab('create');
    setMessageType('info');
    setMessage('Editing vacancy. Update the form and click Save.');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setMessageType('info');
    setMessage('');
  };

  const handleDelete = async (vacancyId: string) => {
    const token: string | null = getToken();
    if (!token) {
      setMessageType('error');
      setMessage('No authentication token found. Please log in.');
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        setTimeout(() => router.push('/Login/SignIn'), 2000);
      }
      return;
    }
    try {
      setIsProcessing(true);
      const response = await axios.delete<{ success: boolean; message: string }>(`http://localhost:5000/api/vacancies/${vacancyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessageType('success');
      setMessage(response.data.message || 'Vacancy deleted successfully');
      await fetchAllVacancies(token);
      await fetchOpenVacancies(token);
    } catch (error) {
      console.error('Delete Error:', error);
      if (isAxiosError(error)) {
        const err = error as AxiosError<{ success: boolean; message: string }>;
        if (err.response?.status === 401) {
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Authentication failed. Please log in again.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          if (!hasRedirected.current) {
            hasRedirected.current = true;
            setTimeout(() => router.push('/Login/SignIn'), 2000);
          }
        } else if (err.response?.status === 403) {
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Access denied. Insufficient privileges.');
        } else {
          setMessageType('error');
          setMessage(err.response?.data?.message || 'Error deleting vacancy');
        }
      } else {
        setMessageType('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Update application status
  const handleUpdateApplicationStatus = async () => {
    if (!selectedApplicationId) {
      setMessageType('error');
      setMessage('Please select an application.');
      return;
    }
    const token: string | null = getToken();
    if (!token) {
      setMessageType('error');
      setMessage('No authentication token found. Please log in.');
      return;
    }
    try {
      setIsProcessing(true);
      const response = await axios.put<UpdateStatusResponse>(
        `http://localhost:5000/api/vacancies/applications/${selectedApplicationId}/status`,
        { status: selectedStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageType('success');
      setMessage(response.data.message || 'Application status updated successfully');
      setSelectedApplicationId('');
      setSelectedStatus('pending');
      await fetchApplications(token);
    } catch (error) {
      console.error('Update Status Error:', error);
      if (isAxiosError(error)) {
        const err = error as AxiosError<UpdateStatusResponse>;
        setMessageType('error');
        setMessage(err.response?.data?.message || 'Failed to update status.');
      } else {
        setMessageType('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Update form data handler
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Professional Icons
  const ProfessionalIcons = {
    all: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    open: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    applications: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    create: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  };

  if (!hasAccess && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <Header />
        <div className="flex flex-1 pt-16">
          <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64">
            <Sidebar />
          </div>
          <main className="flex-1 ml-64 p-6 lg:ml-64">
            <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
              <div className="text-center bg-white rounded-2xl shadow-2xl p-8 max-w-md border border-blue-100 transform hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-blue-600 mb-4">Access Denied</h1>
                <p className="text-gray-600 mb-4">Admin or Subadmin with HR privileges required for Vacancy Management.</p>
                {message && (
                  <div className={`mt-4 p-4 rounded-lg border bg-blue-50 border-blue-200 text-blue-700`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />
      <div className="flex flex-1 pt-16">
        <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64">
          <Sidebar />
        </div>
        <main className="flex-1 ml-64 p-6 lg:ml-64">
          <div className="flex justify-center">
            <div className="w-full max-w-7xl">
              <br />
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100 transform hover:shadow-2xl transition-all duration-300">
                {/* Enhanced Header with Professional Blue Theme */}
                <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 p-8 text-white overflow-hidden">
                  <div className="absolute inset-0 bg-pattern opacity-10"></div>
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                  <div className="absolute -right-20 top-20 w-32 h-32 bg-white opacity-5 rounded-full"></div>
                  <div className="absolute left-10 bottom-0 w-20 h-20 bg-white opacity-5 rounded-full"></div>
              
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="p-3 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                          Vacancy Management System
                        </h1>
                        <p className="opacity-90 text-blue-100">Role: {userRole} | Manage job openings, applications, and roles</p>
                        {isAdmin && <p className="opacity-90 text-blue-100">Admin mode: Full control enabled</p>}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Navigation Tabs */}
                <div className="border-b border-blue-100 bg-white">
                  <nav className="flex space-x-8 px-8">
                    {[
                      { id: 'all', label: 'All Vacancies', icon: ProfessionalIcons.all },
                      { id: 'open', label: 'Open Vacancies', icon: ProfessionalIcons.open },
                      { id: 'applications', label: 'Applications', icon: ProfessionalIcons.applications },
                      { id: 'create', label: 'Create/Edit Vacancy', icon: ProfessionalIcons.create },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="p-8">
                  {/* Status Message */}
                  {message && (
                    <div
                      className={`mb-8 p-4 rounded-xl border-2 backdrop-blur-sm ${
                        messageType === 'success'
                          ? 'bg-green-50 border-green-200 text-green-800 shadow-lg'
                          : messageType === 'error'
                          ? 'bg-red-50 border-red-200 text-red-800 shadow-lg'
                          : 'bg-blue-50 border-blue-200 text-blue-800 shadow-lg'
                      } transform transition-all duration-300`}
                    >
                      <div className="flex items-center">
                        {messageType === 'success' && (
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {messageType === 'error' && (
                          <div className="p-2 bg-red-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {messageType === 'info' && (
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <span className="font-medium">{message}</span>
                      </div>
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex justify-center items-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading data...</p>
                      </div>
                    </div>
                  )}
                  {!isLoading && hasAccess && (
                    <>
                      {/* All Vacancies Tab */}
                      {activeTab === 'all' && (
                        <div className="space-y-8">
                          <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">All Vacancies ({filteredAllVacancies.length})</h2>
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search by title or department..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10 pr-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </div>
                            {filteredAllVacancies.length === 0 ? (
                              <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-sm">No vacancies found.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-blue-100">
                                  <thead className="bg-blue-50">
                                    <tr>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Title</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Department</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Status</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Salary Range</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Posted By</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Applications</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Created</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-blue-100">
                                    {filteredAllVacancies.map((vacancy) => (
                                      <tr key={vacancy._id} className="hover:bg-blue-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vacancy.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                            vacancy.status === 'open'
                                              ? 'bg-green-100 text-green-800'
                                              : vacancy.status === 'interviewing'
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {vacancy.status}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.salaryRange}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.postedBy.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.applicationsCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(vacancy.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => handleEdit(vacancy._id)}
                                              disabled={isProcessing}
                                              className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center space-x-1 transform hover:scale-110"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              onClick={() => handleDelete(vacancy._id)}
                                              disabled={isProcessing}
                                              className="text-red-600 hover:text-red-900 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center space-x-1 transform hover:scale-110"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                              <span>Delete</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Open Vacancies Tab */}
                      {activeTab === 'open' && (
                        <div className="space-y-8">
                          <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">Open Vacancies ({filteredOpenVacancies.length})</h2>
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search by title or department..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10 pr-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                            </div>
                            {filteredOpenVacancies.length === 0 ? (
                              <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-sm">No open vacancies found.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-blue-100">
                                  <thead className="bg-green-50">
                                    <tr>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Title</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Department</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Salary Range</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Posted By</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Applications</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Created</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-blue-100">
                                    {filteredOpenVacancies.map((vacancy) => (
                                      <tr key={vacancy._id} className="hover:bg-green-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vacancy.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.department}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.salaryRange}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.postedBy.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vacancy.applicationsCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(vacancy.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => handleEdit(vacancy._id)}
                                              disabled={isProcessing}
                                              className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center space-x-1 transform hover:scale-110"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              onClick={() => handleDelete(vacancy._id)}
                                              disabled={isProcessing}
                                              className="text-red-600 hover:text-red-900 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center space-x-1 transform hover:scale-110"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                              <span>Delete</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Applications Tab */}
                      {activeTab === 'applications' && (
                        <div className="space-y-8">
                          <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center space-x-3 mb-6">
                              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <h2 className="text-xl font-semibold text-gray-800">Application Tracking</h2>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Application</label>
                                <select
                                  value={selectedApplicationId}
                                  onChange={(e) => setSelectedApplicationId(e.target.value)}
                                  className="w-full p-4 border-2 text-black border-blue-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                  <option value="">Choose an application</option>
                                  {applications.map((app) => (
                                    <option key={app._id} value={app._id}>
                                      {app.vacancy.title} - {app.user.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Update Status</label>
                                <select
                                  value={selectedStatus}
                                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                                  className="w-full p-4 border-2 text-black border-blue-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="reviewed">Reviewed</option>
                                  <option value="rejected">Rejected</option>
                                  <option value="hired">Hired</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={handleUpdateApplicationStatus}
                                  disabled={isProcessing || !selectedApplicationId}
                                  className="w-full py-4 px-8 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                >
                                  {isProcessing ? 'Updating...' : 'Update Status'}
                                </button>
                              </div>
                            </div>
                            <div className="relative mb-6">
                              <input
                                type="text"
                                placeholder="Search applications by vacancy, user, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              />
                              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            {filteredApplications.length === 0 ? (
                              <div className="text-center py-8">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-500 text-sm">No applications found.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-blue-100">
                                  <thead className="bg-purple-50">
                                    <tr>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Vacancy</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Applicant</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Email</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Status</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Applied Date</th>
                                      <th className="px-6 py-4 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">Cover Letter</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-blue-100">
                                    {filteredApplications.map((app) => (
                                      <tr key={app._id} className="hover:bg-purple-50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.vacancy.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.user.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                            app.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : app.status === 'reviewed'
                                              ? 'bg-blue-100 text-blue-800'
                                              : app.status === 'rejected'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-green-100 text-green-800'
                                          }`}>
                                            {app.status}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.appliedAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                          {app.coverLetter ? (
                                            <span className="text-sm text-gray-500 italic">Yes</span>
                                          ) : (
                                            <span className="text-sm text-gray-400">No</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Create/Edit Vacancy Tab */}
                      {activeTab === 'create' && (
                        <div className="space-y-8">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Create/Edit Vacancy Form Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 transform hover:scale-105 transition-all duration-300">
                              <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                  {editingId ? 'Edit Vacancy' : 'Create New Vacancy'}
                                </h2>
                              </div>
                              <div className="space-y-6">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Title *</label>
                                  <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleFormChange}
                                    className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter vacancy title"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Department *</label>
                                  <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleFormChange}
                                    className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter department"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Description</label>
                                  <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    rows={3}
                                    className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter job description"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">Requirements</label>
                                  <textarea
                                    name="requirements"
                                    value={formData.requirements}
                                    onChange={handleFormChange}
                                    rows={4}
                                    className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    placeholder="Enter requirements (one per line)"
                                  />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Salary Range</label>
                                    <input
                                      type="text"
                                      name="salaryRange"
                                      value={formData.salaryRange}
                                      onChange={handleFormChange}
                                      className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                      placeholder="e.g., $70K-$90K"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                                    <select
                                      name="status"
                                      value={formData.status}
                                      onChange={handleFormChange}
                                      className="w-full p-4 border-2 border-blue-100 rounded-xl shadow-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    >
                                      <option value="open">Open</option>
                                      <option value="interviewing">Interviewing</option>
                                      <option value="closed">Closed</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex gap-4">
                                  <button
                                    onClick={handleCreateOrEdit}
                                    disabled={isProcessing || !formData.title.trim() || !formData.department.trim()}
                                    className="flex-1 flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                  >
                                    {isProcessing ? (
                                      <>
                                        <svg
                                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                                        {editingId ? 'Updating...' : 'Creating...'}
                                      </>
                                    ) : (
                                      editingId ? 'Update Vacancy' : 'Create Vacancy'
                                    )}
                                  </button>
                                  {editingId && (
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={isProcessing}
                                      className="flex-1 py-4 px-6 border-2 border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Quick Stats Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100">
                              <h3 className="text-lg font-semibold text-gray-800 mb-6">Vacancy Overview</h3>
                              <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl">
                                  <span className="text-sm text-gray-600">Total Vacancies</span>
                                  <span className="text-xl font-bold text-blue-600">{allVacancies.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
                                  <span className="text-sm text-gray-600">Open Positions</span>
                                  <span className="text-xl font-bold text-green-600">{openVacancies.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl">
                                  <span className="text-sm text-gray-600">Total Applications</span>
                                  <span className="text-xl font-bold text-purple-600">{applications.length}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Footer */}
                <div className="bg-gradient-to-r from-blue-50 to-white px-8 py-6 text-sm text-gray-600 border-t border-blue-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <p>Vacancy Management System • {new Date().getFullYear()}</p>
                    <div className="flex items-center space-x-4 mt-2 md:mt-0">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Secure Enterprise Environment</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <style jsx>{`
        .bg-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  );
};

export default VacancyManager;