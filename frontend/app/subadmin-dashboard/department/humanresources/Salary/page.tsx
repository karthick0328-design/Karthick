'use client';
import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import Header from '../../../../subadmin-compontent/humanresources/header';
import Sidebar from '../../../../subadmin-compontent/humanresources/sidebar';

// Backend API base URL
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://your-production-backend.com' // Replace with your production URL
  : 'http://localhost:5000';

// Define interfaces for type safety
interface Salary {
  _id?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    uniqueId: string;
    employeeType?: string;
    monthlySalaryRate?: number;
    department?: string;
    role?: string;
  };
  month: number;
  year: number;
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
  attendanceDeductions: number;
  holidayIncrements: number;
  tds: number;
  professionalTax: number;
  epf: number;
  esi: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  notes?: string;
  isGenerated: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface Attendance {
  _id: string;
  date: string;
  status: string;
  salaryDeductionAmount: number;
  workedOnHoliday: boolean;
  holidayType: string | null;
}

interface User {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  employeeType?: string;
  monthlySalaryRate?: number;
  department?: string;
  isActive: boolean;
  role?: string;
}

interface UserDetailsResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      uniqueId: string;
      name: string;
      email: string;
      department?: string;
      role?: string;
      isActive: boolean;
      employeeType?: string;
      monthlySalaryRate?: number;
      assignedMonthlyRate: number;
    };
    salaryHistory: Salary[];
    currentSalary: Salary | null;
    salaryPreview: Salary & { isPreview: boolean } | null;
    attendanceRecords: Attendance[];
    attendanceDeductions: number;
    holidayIncrements: number;
  };
}

interface UsersResponse {
  success: boolean;
  data: {
    staffMembers: User[]; // Updated to match backend response structure
  };
  message?: string;
}

interface CreateSalaryResponse {
  success: boolean;
  message: string;
  data?: Salary;
}

interface UpdateDeleteResponse {
  success: boolean;
  message: string;
  data?: Salary;
}

interface DepartmentRate {
  _id: string;
  department: string;
  role: string;
  monthlyRate: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DepartmentRatesResponse {
  success: boolean;
  message: string;
  data: DepartmentRate[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
}

const SalaryManagement: React.FC = () => {
  const currentDate = new Date();
  const defaultMonth = currentDate.getMonth() + 1;
  const defaultYear = currentDate.getFullYear();
  const roles = ['head', 'manager', 'team manager', 'tl', 'employee'];

  const [viewMode, setViewMode] = useState<'salary' | 'rates'>('salary');
  const [users, setUsers] = useState<User[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string>('');
  const [selectedSalaryId, setSelectedSalaryId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [workingDays, setWorkingDays] = useState<number>(22);
  const [monthlyRate, setMonthlyRate] = useState<number>(1100);
  const [totalAllowances, setTotalAllowances] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);
  const [professionalTax, setProfessionalTax] = useState<number>(0);
  const [epf, setEpf] = useState<number>(0);
  const [esi, setEsi] = useState<number>(0);
  const [holidayIncrements, setHolidayIncrements] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [userDetails, setUserDetails] = useState<UserDetailsResponse['data'] | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [departmentRates, setDepartmentRates] = useState<DepartmentRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [dept, setDept] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('head');
  const [rateMonthly, setRateMonthly] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Helper: Get token with validation
  const getToken = (): string | null => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessageType('error');
      setMessage('Authentication token missing. Please log in again.');
      return null;
    }
    return token;
  };

  // Helper: Enhanced error logging and handling
  const handleApiError = (error: unknown, context: string) => {
    console.error(`Raw API Error (${context}):`, error);

    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<ErrorResponse>;
      console.error(`API Error (${context}):`, {
        message: err.message,
        response: err.response?.data || 'Empty response body (common for 404s)',
        status: err.response?.status,
        url: err.config?.url, // Log the exact URL attempted
        headers: err.response?.headers,
      });

      let errorMessage = `Error in ${context}. Ensure backend API is running.`;
      if (err.response?.status === 401) {
        errorMessage = 'Unauthorized: Please log in as an admin.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Forbidden: Admin access required.';
      } else if (err.message.includes('Network Error') || err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Unable to connect to the backend server.';
      } else if (err.response?.status === 404) {
        errorMessage = `Endpoint not found (e.g., /api/salaries/user/${selectedUniqueId}). Verify backend route exists and server restarted.`;
      }
      setMessage(err.response?.data?.message || errorMessage);
    } else {
      // Non-Axios error (e.g., TypeError, ReferenceError)
      const errorMessage = `Unexpected error in ${context}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`Non-Axios Error (${context}):`, errorMessage);
      setMessage(errorMessage);
    }
    setMessageType('error');
  };

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        if (!token) return;
        const response = await axios.get<UsersResponse>(`${API_BASE}/api/auth/admin/staff`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('API Response (fetchUsers):', JSON.stringify(response.data, null, 2));
        setUsers(response.data.data?.staffMembers || []);
        setMessageType('success');
        setMessage('Staff members loaded successfully');
      } catch (error) {
        handleApiError(error, 'fetchUsers');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Fetch user details and salaries when a unique ID is selected
  useEffect(() => {
    const fetchUserDetailsAndSalaries = async () => {
      if (!selectedUniqueId) {
        setUserDetails(null);
        setSalaries([]);
        setSelectedSalary(null);
        setMonthlyRate(1100);
        setHolidayIncrements(0);
        return;
      }
      try {
        const token = getToken();
        if (!token) return;
        const url = selectedMonth && selectedYear
          ? `${API_BASE}/api/salaries/user/${selectedUniqueId}?month=${selectedMonth}&year=${selectedYear}`
          : `${API_BASE}/api/salaries/user/${selectedUniqueId}`;
        const response = await axios.get<UserDetailsResponse>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('API Response (fetchUserDetailsAndSalaries):', JSON.stringify(response.data, null, 2));
        if (response.data.success && response.data.data) {
          // Validate salaryHistory to ensure all required fields are present
          const validSalaries = response.data.data.salaryHistory.filter(
            (salary) =>
              typeof salary.grossSalary === 'number' &&
              typeof salary.totalDeductions === 'number' &&
              typeof salary.holidayIncrements === 'number' &&
              typeof salary.netSalary === 'number'
          );
          setUserDetails(response.data.data);
          setSalaries(validSalaries);
          setMonthlyRate(response.data.data.user.assignedMonthlyRate || 1100);
          setHolidayIncrements(response.data.data.holidayIncrements || 0);
          setMessageType('success');
          setMessage('User details and salaries loaded');
        } else {
          setUserDetails(null);
          setSalaries([]);
          setMonthlyRate(1100);
          setHolidayIncrements(0);
          setMessageType('error');
          setMessage(response.data.message || 'Error fetching user details and salaries');
        }
      } catch (error) {
        handleApiError(error, 'fetchUserDetailsAndSalaries');
        setUserDetails(null);
        setSalaries([]);
        setMonthlyRate(1100);
        setHolidayIncrements(0);
      }
    };
    fetchUserDetailsAndSalaries();
  }, [selectedUniqueId, selectedMonth, selectedYear]);

  // Fetch selected salary details
  useEffect(() => {
    const fetchSelectedSalary = async () => {
      if (!selectedSalaryId) {
        setSelectedSalary(null);
        return;
      }
      try {
        const token = getToken();
        if (!token) return;
        const response = await axios.get<UpdateDeleteResponse>(
          `${API_BASE}/api/salaries/${selectedSalaryId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('API Response (fetchSelectedSalary):', JSON.stringify(response.data, null, 2));
        if (response.data.success && response.data.data) {
          setSelectedSalary(response.data.data);
          setSelectedMonth(response.data.data.month);
          setSelectedYear(response.data.data.year);
          setWorkingDays(response.data.data.workingDays);
          setMonthlyRate(response.data.data.basicSalary);
          setTotalAllowances(response.data.data.totalAllowances);
          setTds(response.data.data.tds);
          setProfessionalTax(response.data.data.professionalTax);
          setEpf(response.data.data.epf);
          setEsi(response.data.data.esi);
          setHolidayIncrements(response.data.data.holidayIncrements || 0);
          setNotes(response.data.data.notes || '');
        } else {
          setSelectedSalary(null);
          setMessageType('error');
          setMessage(response.data.message || 'Error fetching salary details');
        }
      } catch (error) {
        handleApiError(error, 'fetchSelectedSalary');
        setSelectedSalary(null);
      }
    };
    fetchSelectedSalary();
  }, [selectedSalaryId]);

  // Fetch department rates when view mode changes to 'rates'
  useEffect(() => {
    if (viewMode === 'rates') {
      fetchDepartmentRates();
    }
  }, [viewMode]);

  const fetchDepartmentRates = async () => {
    try {
      setIsLoadingRates(true);
      const token = getToken();
      if (!token) return;
      const response = await axios.get<DepartmentRatesResponse>(`${API_BASE}/api/salaries/department-rates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API Response (fetchDepartmentRates):', JSON.stringify(response.data, null, 2));
      if (response.data.success) {
        setDepartmentRates(response.data.data || []);
        setMessageType('success');
        setMessage('Department rates loaded successfully');
      } else {
        setDepartmentRates([]);
        setMessageType('error');
        setMessage(response.data.message || 'Error fetching department rates');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setMessageType('error');
        setMessage('HR subadmin access required for department rates management.');
        setViewMode('salary');
      } else {
        handleApiError(error, 'fetchDepartmentRates');
      }
      setDepartmentRates([]);
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleSaveRate = async () => {
    if (!dept.trim() || !selectedRole || rateMonthly < 0) {
      setMessageType('error');
      setMessage('Please provide valid department, role, and non-negative monthly rate');
      return;
    }
    try {
      setIsProcessing(true);
      const token = getToken();
      if (!token) return;
      const payload = {
        department: dept.trim(),
        role: selectedRole,
        monthlyRate: rateMonthly,
      };
      const response = await axios.post<UpdateDeleteResponse>(
        `${API_BASE}/api/salaries/department-rate`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API Response (handleSaveRate):', JSON.stringify(response.data, null, 2));
      setMessageType('success');
      setMessage(response.data.message || 'Department rate saved successfully');
      fetchDepartmentRates();
      if (!selectedRateId) {
        setDept('');
        setSelectedRole('head');
        setRateMonthly(0);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setMessageType('error');
        setMessage('HR subadmin access required for department rates.');
        setViewMode('salary');
      } else {
        handleApiError(error, 'handleSaveRate');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRate = async () => {
    if (!selectedRateId) {
      setMessageType('error');
      setMessage('Please select a rate to delete');
      return;
    }
    if (!confirm('Are you sure you want to delete this department rate?')) return;
    try {
      setIsProcessing(true);
      const token = getToken();
      if (!token) return;
      const response = await axios.delete<UpdateDeleteResponse>(
        `${API_BASE}/api/salaries/department-rate/${selectedRateId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API Response (handleDeleteRate):', JSON.stringify(response.data, null, 2));
      setMessageType('success');
      setMessage(response.data.message || 'Department rate deleted successfully');
      fetchDepartmentRates();
      setSelectedRateId('');
      setDept('');
      setSelectedRole('head');
      setRateMonthly(0);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setMessageType('error');
        setMessage('HR subadmin access required for department rates.');
        setViewMode('salary');
      } else {
        handleApiError(error, 'handleDeleteRate');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle salary creation
  const handleCreateSalary = async () => {
    if (!selectedUniqueId || !selectedMonth || !selectedYear) {
      setMessageType('error');
      setMessage('Please select a user, month, and year');
      return;
    }
    if (selectedMonth < 1 || selectedMonth > 12) {
      setMessageType('error');
      setMessage('Month must be between 1 and 12');
      return;
    }
    if (selectedYear < 2020) {
      setMessageType('error');
      setMessage('Year must be 2020 or later');
      return;
    }
    if (monthlyRate < 0) {
      setMessageType('error');
      setMessage('Monthly salary rate must be non-negative');
      return;
    }
    const token = getToken();
    if (!token) return;
    const payload = {
      uniqueId: selectedUniqueId,
      month: selectedMonth,
      year: selectedYear,
      workingDays,
      monthlySalaryRate: monthlyRate,
      totalAllowances,
      tds,
      professionalTax,
      epf,
      esi,
      holidayIncrements,
      notes: notes.trim(),
    };
    console.log('Sending create salary payload:', payload);
    try {
      setIsProcessing(true);
      const response = await axios.post<CreateSalaryResponse>(
        `${API_BASE}/api/salaries`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API Response (handleCreateSalary):', JSON.stringify(response.data, null, 2));
      setMessageType('success');
      setMessage(response.data.message);
      setNotes('');
      setTotalAllowances(0);
      setTds(0);
      setProfessionalTax(0);
      setEpf(0);
      setEsi(0);
      setHolidayIncrements(0);
      const fetchResponse = await axios.get<UserDetailsResponse>(
        `${API_BASE}/api/salaries/user/${selectedUniqueId}?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserDetails(fetchResponse.data.data || null);
      setSalaries(fetchResponse.data.data?.salaryHistory || []);
    } catch (error) {
      handleApiError(error, 'handleCreateSalary');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle salary update
  const handleUpdateSalary = async () => {
    if (!selectedSalaryId) {
      setMessageType('error');
      setMessage('Please select a salary to update');
      return;
    }
    if (monthlyRate < 0) {
      setMessageType('error');
      setMessage('Monthly salary rate must be non-negative');
      return;
    }
    const token = getToken();
    if (!token) return;
    const updateData: Partial<{
      workingDays: number;
      monthlySalaryRate: number;
      totalAllowances: number;
      tds: number;
      professionalTax: number;
      epf: number;
      esi: number;
      holidayIncrements: number;
      notes: string;
    }> = {
      workingDays,
      monthlySalaryRate: monthlyRate,
      totalAllowances,
      tds,
      professionalTax,
      epf,
      esi,
      holidayIncrements,
      notes: notes.trim(),
    };
    try {
      setIsProcessing(true);
      const response = await axios.put<UpdateDeleteResponse>(
        `${API_BASE}/api/salaries/${selectedSalaryId}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API Response (handleUpdateSalary):', JSON.stringify(response.data, null, 2));
      setMessageType('success');
      setMessage(response.data.message);
      const fetchResponse = await axios.get<UserDetailsResponse>(
        `${API_BASE}/api/salaries/user/${selectedUniqueId}?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserDetails(fetchResponse.data.data || null);
      setSalaries(fetchResponse.data.data?.salaryHistory || []);
      const salaryResponse = await axios.get<UpdateDeleteResponse>(
        `${API_BASE}/api/salaries/${selectedSalaryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (salaryResponse.data.data) {
        setSelectedSalary(salaryResponse.data.data);
      }
    } catch (error) {
      handleApiError(error, 'handleUpdateSalary');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle salary deletion
  const handleDeleteSalary = async () => {
    if (!selectedSalaryId) {
      setMessageType('error');
      setMessage('Please select a salary to delete');
      return;
    }
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      setIsProcessing(true);
      const token = getToken();
      if (!token) return;
      const response = await axios.delete<UpdateDeleteResponse>(
        `${API_BASE}/api/salaries/${selectedSalaryId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('API Response (handleDeleteSalary):', JSON.stringify(response.data, null, 2));
      setMessageType('success');
      setMessage(response.data.message);
      setSelectedSalaryId('');
      setSelectedSalary(null);
      const fetchResponse = await axios.get<UserDetailsResponse>(
        `${API_BASE}/api/salaries/user/${selectedUniqueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserDetails(fetchResponse.data.data || null);
      setSalaries(fetchResponse.data.data?.salaryHistory || []);
    } catch (error) {
      handleApiError(error, 'handleDeleteSalary');
    } finally {
      setIsProcessing(false);
    }
  };

  const capitalizeWords = (str: string): string => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="flex justify-center">
            <div className="w-full max-w-6xl">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white">
                  <h1 className="text-2xl font-bold">Salary Management System</h1>
                  <p className="opacity-90">Manage salary records for employees</p>
                </div>
                <div className="p-6">
                  {message && (
                    <div
                      className={`mb-6 p-4 rounded-lg border ${
                        messageType === 'success'
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : messageType === 'error'
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}
                    >
                      <div className="flex items-center">
                        {messageType === 'success' && (
                          <svg className="w-5 h-5 mr-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {messageType === 'error' && (
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {messageType === 'info' && (
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        <span>{message}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex mb-4">
                    <button
                      onClick={() => setViewMode('salary')}
                      className={`px-4 py-2 rounded ${viewMode === 'salary' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Salaries
                    </button>
                    <button
                      onClick={() => setViewMode('rates')}
                      className={`ml-2 px-4 py-2 rounded ${viewMode === 'rates' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Department Rates
                    </button>
                  </div>
                  {isLoading && viewMode === 'salary' && (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                    </div>
                  )}
                  {viewMode === 'salary' && !isLoading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-black">
                      <div className="bg-gray-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Select User & Salaries</h2>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">User List</label>
                          <select
                            value={selectedUniqueId}
                            onChange={(e) => setSelectedUniqueId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Select a user by Unique ID</option>
                            {users.map((user) => (
                              <option key={user._id} value={user.uniqueId}>
                                {user.uniqueId} - {user.name} {user.department ? `(${user.department})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month/Year</label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(parseInt(e.target.value) || 0)}
                              min={1}
                              max={12}
                              placeholder="Month (1-12)"
                              className="w-1/2 p-2 border text-black border-gray-300 rounded-md text-sm"
                            />
                            <input
                              type="number"
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(parseInt(e.target.value) || 0)}
                              min={2020}
                              placeholder="Year"
                              className="w-1/2 p-2 border text-black border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                        {userDetails && (
                          <div className="mt-6 p-4 bg-white rounded-md text-black shadow border border-gray-200 mb-4">
                            <h3 className="text-md font-medium text-gray-800 mb-3">User Information</h3>
                            <div className="space-y-3">
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Name:</span>
                                <span>{userDetails.user.name}</span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Email:</span>
                                <span>  {userDetails.user.email}</span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Unique ID:</span>
                                <span className="font-mono bg-gray-100 px-2 py-1 text-black rounded text-sm">{userDetails.user.uniqueId}</span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Status:</span>
                                <span
                                  className={`px-2 py-1 text-black rounded-full text-xs font-medium ${
                                    userDetails.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {userDetails.user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Department:</span>
                                <span>{userDetails.user.department || 'N/A'}</span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Role:</span>
                                <span>{userDetails.user.role ? capitalizeWords(userDetails.user.role) : 'N/A'}</span>
                              </div>
                              <div className="flex">
                                <span className="text-gray-600 font-medium w-32">Monthly Rate:</span>
                                <span>${userDetails.user.assignedMonthlyRate.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {salaries.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Existing Salaries</h3>
                            <div className="space-y-2 max-h-60  overflow-y-auto">
                              {salaries.map((salary) => (
                                <div
                                  key={salary._id}
                                  onClick={() => setSelectedSalaryId(salary._id || '')}
                                  className={`p-3 rounded-md cursor-pointer text-black border ${
                                    selectedSalaryId === salary._id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{salary.month}/{salary.year}</span>
                                    <span className="text-sm">
                                      ${typeof salary.netSalary === 'number' ? salary.netSalary.toFixed(2) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Gross: ${typeof salary.grossSalary === 'number' ? salary.grossSalary.toFixed(2) : 'N/A'} | 
                                    Deductions: ${typeof salary.totalDeductions === 'number' ? salary.totalDeductions.toFixed(2) : 'N/A'} | 
                                    Holiday Increments: ${typeof salary.holidayIncrements === 'number' ? salary.holidayIncrements.toFixed(2) : 'N/A'} | 
                                    Days: {salary.workingDays ?? 'N/A'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {salaries.length === 0 && selectedUniqueId && (
                          <p className="text-sm text-gray-500 mt-4">No salaries found for this user.</p>
                        )}
                        {userDetails?.salaryPreview && (
                          <div className="mt-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">Salary Preview</h3>
                            <div className="text-sm space-y-2 text-black">
                              <div>Month/Year: {userDetails.salaryPreview.month}/{userDetails.salaryPreview.year}</div>
                              <div>Basic Salary: ${typeof userDetails.salaryPreview.basicSalary === 'number' ? userDetails.salaryPreview.basicSalary.toFixed(2) : 'N/A'}</div>
                              <div>Holiday Increments: ${typeof userDetails.salaryPreview.holidayIncrements === 'number' ? userDetails.salaryPreview.holidayIncrements.toFixed(2) : 'N/A'}</div>
                              <div>Gross Salary: ${typeof userDetails.salaryPreview.grossSalary === 'number' ? userDetails.salaryPreview.grossSalary.toFixed(2) : 'N/A'}</div>
                              <div>Attendance Deductions: ${typeof userDetails.salaryPreview.attendanceDeductions === 'number' ? userDetails.salaryPreview.attendanceDeductions.toFixed(2) : 'N/A'}</div>
                              <div>Net Salary: ${typeof userDetails.salaryPreview.netSalary === 'number' ? userDetails.salaryPreview.netSalary.toFixed(2) : 'N/A'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Salary Management</h2>
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Generate New Salary</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Month (1-12)</label>
                              <input
                                type="number"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value) || 0)}
                                min={1}
                                max={12}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                              <input
                                type="number"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value) || 0)}
                                min={2020}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Salary Rate</label>
                              <input
                                type="number"
                                value={monthlyRate}
                                onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 1100)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Total Allowances</label>
                              <input
                                type="number"
                                value={totalAllowances}
                                onChange={(e) => setTotalAllowances(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">TDS</label>
                              <input
                                type="number"
                                value={tds}
                                onChange={(e) => setTds(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Professional Tax</label>
                              <input
                                type="number"
                                value={professionalTax}
                                onChange={(e) => setProfessionalTax(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">EPF</label>
                              <input
                                type="number"
                                value={epf}
                                onChange={(e) => setEpf(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">ESI</label>
                              <input
                                type="number"
                                value={esi}
                                onChange={(e) => setEsi(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Holiday Increments</label>
                              <input
                                type="number"
                                value={holidayIncrements}
                                onChange={(e) => setHolidayIncrements(parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Working Days</label>
                              <input
                                type="number"
                                value={workingDays}
                                onChange={(e) => setWorkingDays(parseInt(e.target.value) || 22)}
                                min={1}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <button
                              onClick={handleCreateSalary}
                              disabled={isProcessing || !selectedUniqueId || !selectedMonth || !selectedYear || !getToken()}
                              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? (
                                <>
                                  <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Generating...
                                </>
                              ) : (
                                'Generate Salary'
                              )}
                            </button>
                          </div>
                        </div>
                        {selectedSalary && (
                          <div className="border-t pt-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Update Selected Salary</h3>
                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between text-black text-sm">
                                <span>Gross Salary:</span>
                                <span>${typeof selectedSalary.grossSalary === 'number' ? selectedSalary.grossSalary.toFixed(2) : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Total Deductions:</span>
                                <span>${typeof selectedSalary.totalDeductions === 'number' ? selectedSalary.totalDeductions.toFixed(2) : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Holiday Increments:</span>
                                <span>${typeof selectedSalary.holidayIncrements === 'number' ? selectedSalary.holidayIncrements.toFixed(2) : 'N/A'}</span>
                              </div>
                              <div className="grid grid-cols-2 text-black gap-2 text-xs">
                                <div>Basic: ${typeof selectedSalary.basicSalary === 'number' ? selectedSalary.basicSalary.toFixed(2) : 'N/A'}</div>
                                <div>Allowances: ${typeof selectedSalary.totalAllowances === 'number' ? selectedSalary.totalAllowances.toFixed(2) : 'N/A'}</div>
                                <div>TDS: ${typeof selectedSalary.tds === 'number' ? selectedSalary.tds.toFixed(2) : 'N/A'}</div>
                                <div>Prof. Tax: ${typeof selectedSalary.professionalTax === 'number' ? selectedSalary.professionalTax.toFixed(2) : 'N/A'}</div>
                                <div>EPF: ${typeof selectedSalary.epf === 'number' ? selectedSalary.epf.toFixed(2) : 'N/A'}</div>
                                <div>ESI: ${typeof selectedSalary.esi === 'number' ? selectedSalary.esi.toFixed(2) : 'N/A'}</div>
                                <div>Attendance Ded.: ${typeof selectedSalary.attendanceDeductions === 'number' ? selectedSalary.attendanceDeductions.toFixed(2) : 'N/A'}</div>
                                <div>Other Ded.: ${typeof selectedSalary.otherDeductions === 'number' ? selectedSalary.otherDeductions.toFixed(2) : 'N/A'}</div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Salary Rate</label>
                                <input
                                  type="number"
                                  value={monthlyRate}
                                  onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 1100)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Total Allowances</label>
                                <input
                                  type="number"
                                  value={totalAllowances}
                                  onChange={(e) => setTotalAllowances(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">TDS</label>
                                <input
                                  type="number"
                                  value={tds}
                                  onChange={(e) => setTds(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Professional Tax</label>
                                <input
                                  type="number"
                                  value={professionalTax}
                                  onChange={(e) => setProfessionalTax(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">EPF</label>
                                <input
                                  type="number"
                                  value={epf}
                                  onChange={(e) => setEpf(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">ESI</label>
                                <input
                                  type="number"
                                  value={esi}
                                  onChange={(e) => setEsi(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Holiday Increments</label>
                                <input
                                  type="number"
                                  value={holidayIncrements}
                                  onChange={(e) => setHolidayIncrements(parseFloat(e.target.value) || 0)}
                                  min={0}
                                  step={0.01}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={2}
                                  className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <button
                                onClick={handleUpdateSalary}
                                disabled={isProcessing}
                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isProcessing ? 'Updating...' : 'Update Salary'}
                              </button>
                              <button
                                onClick={handleDeleteSalary}
                                disabled={isProcessing}
                                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isProcessing ? 'Deleting...' : 'Delete Salary'}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-6 p-4 bg-emerald-50 rounded-md border border-emerald-200">
                          <h3 className="text-sm font-medium text-emerald-800 mb-2">Instructions</h3>
                          <ul className="text-sm text-emerald-700 list-disc pl-5 space-y-1">
                            <li>Select a user by their Unique ID from the dropdown</li>
                            <li>Optionally filter by month and year to view specific salary details</li>
                            <li>Click a salary record to update or delete it</li>
                            <li>Fill in details to generate a new salary</li>
                            <li>Use Update/Delete buttons for selected records</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {viewMode === 'rates' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-black">
                      <div className="bg-gray-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Department Rates List</h2>
                        {isLoadingRates ? (
                          <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {departmentRates.map((rate) => (
                              <div
                                key={rate._id}
                                onClick={() => {
                                  setSelectedRateId(rate._id || '');
                                  setDept(rate.department);
                                  setSelectedRole(rate.role);
                                  setRateMonthly(rate.monthlyRate);
                                }}
                                className={`p-3 rounded-md cursor-pointer text-black border ${
                                  selectedRateId === rate._id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">{rate.department} - {capitalizeWords(rate.role)}</span>
                                  <span className="text-sm text-green-600">${rate.monthlyRate.toLocaleString()}</span>
                                </div>
                                {rate.updatedAt && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Updated: {new Date(rate.updatedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ))}
                            {departmentRates.length === 0 && (
                              <p className="text-sm text-gray-500 mt-4">No department rates defined. Create one below.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-5 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Department Rate</h2>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <input
                              type="text"
                              value={dept}
                              onChange={(e) => setDept(e.target.value)}
                              placeholder="e.g., IT"
                              className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                              {roles.map((r) => (
                                <option key={r} value={r}>
                                  {capitalizeWords(r)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate ($)</label>
                            <input
                              type="number"
                              value={rateMonthly}
                              onChange={(e) => setRateMonthly(parseFloat(e.target.value) || 0)}
                              min={0}
                              step={0.01}
                              className="w-full p-2 border text-black border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <button
                            onClick={handleSaveRate}
                            disabled={isProcessing || !dept.trim() || !selectedRole || rateMonthly < 0}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Saving...
                              </>
                            ) : selectedRateId ? (
                              'Update Rate'
                            ) : (
                              'Create Rate'
                            )}
                          </button>
                          {selectedRateId && (
                            <button
                              onClick={handleDeleteRate}
                              disabled={isProcessing}
                              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? 'Deleting...' : 'Delete Rate'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRateId('');
                              setDept('');
                              setSelectedRole('head');
                              setRateMonthly(0);
                            }}
                            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
                          >
                            Clear Form
                          </button>
                        </div>
                        <div className="mt-6 p-4 bg-emerald-50 rounded-md border border-emerald-200">
                          <h3 className="text-sm font-medium text-emerald-800 mb-2">Instructions</h3>
                          <ul className="text-sm text-emerald-700 list-disc pl-5 space-y-1">
                            <li>Enter department name, select role, and set monthly rate</li>
                            <li>Click "Create Rate" for new or select from list and "Update Rate"</li>
                            <li>Use "Delete Rate" for selected entries (HR access required)</li>
                            <li>Rates apply automatically to salaries based on user department and role</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gray-100 px-6 py-4 text-sm text-gray-500 border-t border-gray-200">
                  <p>Salary Management System • {defaultYear}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SalaryManagement;