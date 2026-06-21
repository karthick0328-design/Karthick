'use client';

import { useState, useEffect, useMemo } from 'react';
import axios, { AxiosError, isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  Trash2,
  MoreVertical,
  Activity,
  Users,
  TrendingUp,
  AlertCircle,
  Download,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RealTimeMonitoringView from '../../../../Compontent/RealTimeMonitoringView';

// Define TypeScript interfaces
interface User {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  employeeType: string;
  role?: string;
  department?: string;
  dailySalaryRate?: number;
  service?: string;
  phone?: string;
}

interface Attendance {
  _id: string;
  userId: User | null; // Allow null to handle potential backend issues
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  environment?: 'virtual' | 'physical';
  sleepDuration?: number;
  cursorMovements?: string[];
  biometricScanId?: string;
  isApproved: boolean;
  approvedBy?: User;
  notes?: string;
  leaveReason?: string;
  rejectionReason?: string;
  salaryDeductionAmount?: number;
  employeeName?: string;
  employeeUniqueId?: string;
  employeeRole?: string;
  employeeService?: string;
  createdAt: string;
  updatedAt: string;
  sentToFinance: boolean;
  financeProcessed: boolean;
  virtualVerificationImage?: string;
  faceScanImage?: string;
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
  type: 'government' | 'regular';
  createdAt: string;
  updatedAt: string;
}

interface Aggregates {
  total: number;
  present: number;
  absent: number;
  onLeave: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    pages: number;
    total: number;
    page: number;
  };
  aggregates?: Aggregates;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

const AttendancesPage = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'approvals' | 'monitoring'>('all');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterApproved, setFilterApproved] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{ id: string | null; role: string | null; department: string | null; subadminCategory?: string[] }>({ id: null, role: null, department: null });
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [isUnauthorized, setIsUnauthorized] = useState(false); // New state for perm denials
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [isApproving, setIsApproving] = useState<{ [key: string]: boolean }>({});
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'government' as 'government' | 'regular' });
  const [creatingHoliday, setCreatingHoliday] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState<{ [key: string]: boolean }>({});
  const [attendanceToReject, setAttendanceToReject] = useState<string | null>(null);
  const [activeAttendanceName, setActiveAttendanceName] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitMonth, setSubmitMonth] = useState(new Date().getMonth() + 1);
  const [submitYear, setSubmitYear] = useState(new Date().getFullYear());
  const [isSubmittingToFinance, setIsSubmittingToFinance] = useState(false);
  const limit = 10;
  const router = useRouter();

  // Normalize status values to handle backend variations
  const normalizeStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      Present: 'present',
      Absent: 'absent',
      Late: 'late',
      'Half-day': 'half-day',
      'On-leave': 'on-leave',
      'Waiting': 'waiting',
    };
    return statusMap[status] || status.toLowerCase();
  };

  // Get effective status considering holidays - treat as present
  const getEffectiveStatus = (attendance: Attendance) => {
    const attDate = new Date(attendance.date).toISOString().split('T')[0];
    const holiday = holidays.find(h => new Date(h.date).toISOString().split('T')[0] === attDate);
    if (holiday) {
      return { status: 'present' as const, isHoliday: true, name: holiday.name, type: holiday.type };
    }
    return { status: attendance.status, isHoliday: false, name: '', type: '' };
  };

  // Simple debounce hook without external deps
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Check if user is authorized (admin or any subadmin)
  const isAuthorized = useMemo(() => {
    const role = currentUser.role;
    const dept = (currentUser.department || '').toLowerCase();

    // Normalize department check
    const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource');
    const isFinance = dept.includes('financial') || dept.includes('finance');

    return role === 'admin' || role === 'superadmin' || 
           (['manager', 'subadmin', 'admin', 'superadmin'].includes(role || '') && isHR) || 
           (['manager', 'employee'].includes(role || '') && isFinance);
  }, [currentUser]);

  // Compute aggregates client-side if backend doesn't provide them
  const computedAggregates = useMemo(() => {
    if (!attendances.length || activeTab !== 'all') {
      return { total: 0, present: 0, absent: 0, onLeave: 0 };
    }
    const agg: Aggregates = { total: attendances.length, present: 0, absent: 0, onLeave: 0 };
    attendances.forEach((att) => {
      const effective = getEffectiveStatus(att);
      const norm = normalizeStatus(effective.status);
      if (norm === 'present') agg.present++;
      else if (norm === 'absent') agg.absent++;
      else if (norm === 'on-leave' || norm === 'waiting') agg.onLeave++;
    });
    return agg;
  }, [attendances, holidays, activeTab]);

  // Use backend aggregates if available, otherwise computed
  const effectiveAggregates = aggregates || computedAggregates;

  // Fetch current user's ID and role from token
  useEffect(() => {
    const getCurrentUserInfo = (): { id: string | null; role: string | null; department: string | null; subadminCategory?: string[] } => {
      if (typeof window === 'undefined') {
        return { id: null, role: null, department: null };
      }
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Optional: Check expiry
          const exp = payload.exp ? new Date(payload.exp * 1000) : null;
          if (exp && exp < new Date()) {
            localStorage.removeItem('token');
            toast.error('Token expired. Please log in again.', { duration: 4000 });
            router.push('/Login/Signin');
            return { id: null, role: null, department: null };
          }
          const userInfo = {
            id: payload.id || payload._id,
            role: payload.role?.toLowerCase() || null,
            department: payload.department?.toLowerCase() || null,
            subadminCategory: payload.subadminCategory || [],
          };
          // Temp log for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log('Decoded user info:', userInfo);
          }
          return userInfo;
        } catch (e) {
          console.error('Failed to decode token:', e);
          localStorage.removeItem('token');
          return { id: null, role: null, department: null };
        }
      }
      return { id: null, role: null, department: null };
    };

    setCurrentUser(getCurrentUserInfo());
  }, [router]);

  // Fetch holidays on mount if authorized
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!isAuthorized || isUnauthorized) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await api.get<ApiResponse<Holiday[]>>('/api/holidays', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data;
        if (data.success) {
          setHolidays(data.data || []);
        } else {
          toast.error(data.message || 'Failed to fetch holidays', { duration: 4000 });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch holidays:', error);
        }
        const err = error as AxiosError;
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          toast.error('Session expired. Please log in again.', { duration: 4000 });
          router.push('/Login/Signin');
        } else if (err.response?.status === 403) {
          setIsUnauthorized(true);
          toast.error('Only authorized users (Admin or Subadmin) can view holidays', { duration: 4000 });
        } else {
          const message = (err.response?.data as any)?.message || `Failed to fetch holidays: ${err.message}`;
          toast.error(message, { duration: 4000 });
        }
      }
    };
    fetchHolidays();
  }, [isAuthorized, isUnauthorized, router]);

  // Handle create new holiday if authorized
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || isUnauthorized) {
      toast.error('Only authorized users (Admin or Subadmin) can create holidays', { duration: 4000 });
      return;
    }
    setCreatingHoliday(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in', { duration: 4000 });
        return;
      }
      const response = await api.post<ApiResponse<Holiday>>('/api/holidays', newHoliday, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      if (data.success) {
        toast.success('Holiday created successfully', { duration: 4000 });
        setShowHolidayModal(false);
        setNewHoliday({ date: '', name: '', type: 'government' });
        // Refetch holidays
        const fetchRes = await api.get<ApiResponse<Holiday[]>>('/api/holidays', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchData = fetchRes.data;
        if (fetchData.success) {
          setHolidays(fetchData.data || []);
        }
      } else {
        toast.error(data.message || 'Failed to create holiday', { duration: 4000 });
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.', { duration: 4000 });
        router.push('/Login/Signin');
      } else if (err.response?.status === 403) {
        setIsUnauthorized(true);
        toast.error('Only authorized users (Admin or Subadmin) can create holidays', { duration: 4000 });
      } else {
        const message = (err.response?.data as any)?.message || `Failed to create holiday: ${err.message}`;
        toast.error(message, { duration: 4000 });
      }
    } finally {
      setCreatingHoliday(false);
    }
  };

  // Fetch attendances based on tab
  const fetchData = async (pageNum: number = 1) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in', { duration: 4000 });
        router.push('/Login/Signin');
        return;
      }

      let params: any = {
        page: pageNum,
        limit: limit.toString(),
      };

      if (activeTab === 'all') {
        if (debouncedSearchTerm) params.search = debouncedSearchTerm; // Backend should handle name + uniqueId
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (filterStatus !== 'all') params.status = filterStatus;
        if (filterApproved !== 'all') params.isApproved = filterApproved === 'approved';
        if (filterDepartment !== 'all') params.department = filterDepartment;
        if (filterService !== 'all') params.service = filterService;
      } else {
        params.status = 'waiting';
        params.isApproved = false;
      }

      const response = await api.get<ApiResponse<Attendance[]>>('/api/attendance', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data = response.data;
      if (data.success) {
        setAttendances(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setAggregates(data.aggregates || null); // Assume backend provides this
      } else {
        toast.error(data.message || 'Failed to fetch data', { duration: 4000 });
      }
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch attendance data:', error);
      }
      const err = error as AxiosError;
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.', { duration: 4000 });
        router.push('/Login/Signin');
      } else if (err.response?.status === 403) {
        setIsUnauthorized(true);
        toast.error('Only authorized users (Admin or Subadmin) can view this data', { duration: 4000 });
        if (activeTab === 'approvals') router.push('/Admin/Attendance');
      } else {
        const message = (err.response?.data as any)?.message || `Failed to fetch data: ${err.message}`;
        toast.error(message, { duration: 4000 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'approvals' && !isAuthorized) {
      toast.error('Only authorized users (Admin or Subadmin) can manage approvals', { duration: 4000 });
      setActiveTab('all');
      return;
    }
    if (isUnauthorized) {
      setLoading(false);
      return;
    }
    fetchData(page);
  }, [router, activeTab, page, debouncedSearchTerm, filterStatus, filterApproved, filterDepartment, filterService, startDate, endDate, currentUser, isAuthorized, isUnauthorized]);

  // No client-side filtering needed - backend handles all filters and pagination

  const handleNewAttendance = () => {
    console.log('Navigating to new attendance page'); // Debug log
    router.push('/manager-dashboard/department/hr/Attendance/new-create');
  };

  const handleNewHoliday = () => {
    if (!isAuthorized || isUnauthorized) {
      toast.error('Only authorized users (Admin or Subadmin) can create holidays', { duration: 4000 });
      return;
    }
    setShowHolidayModal(true);
  };

  const handleEditAttendance = (id: string) => {
    router.push(`/manager-dashboard/department/hr/Attendance/${id}/edit`);
  };

  const handleViewAttendance = (id: string) => {
    router.push(`/manager-dashboard/department/hr/Attendance/${id}/view`);
  };

  const handleDeleteAttendance = async (id: string, userName: string, date: string) => {
    if (!confirm(`Delete attendance for ${userName || 'Unknown Employee'} on ${date}?`)) return;
    const token = localStorage.getItem('token');
    try {
      const response = await api.delete<ApiResponse<null>>(`/api/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      if (data.success) {
        setAttendances(attendances.filter((attendance) => attendance._id !== id));
        toast.success(`Deleted attendance for ${userName || 'Unknown Employee'} on ${date}`, { duration: 4000 });
      } else {
        toast.error(data.message || 'Failed to delete attendance', { duration: 4000 });
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.', { duration: 4000 });
        router.push('/Login/Signin');
      } else if (err.response?.status === 403) {
        setIsUnauthorized(true);
        toast.error('Only authorized users (Admin or Subadmin) can delete records', { duration: 4000 });
      } else {
        const message = (err.response?.data as any)?.message || `Failed to delete attendance: ${err.message}`;
        toast.error(message, { duration: 4000 });
      }
    }
  };

  // Handle approve - only for approvals tab or pending leaves
  const handleApprove = async (attendanceId: string, userName: string, date: string) => {
    if (!isAuthorized || isUnauthorized) {
      toast.error('Only authorized users (Admin or Subadmin) can approve leave requests', { duration: 4000 });
      return;
    }
    if (!confirm(`Approve leave for ${userName || 'Unknown Employee'} on ${date}?`)) return;
    setIsApproving(prev => ({ ...prev, [attendanceId]: true }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in', { duration: 4000 });
        router.push('/Login/Signin');
        return;
      }

      const response = await api.put<ApiResponse<Attendance>>(`/api/attendance/${attendanceId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      const data = response.data;
      if (data.success) {
        toast.success('Leave request approved successfully', { duration: 4000 });
        // Refresh the list
        fetchData(page);
      } else {
        throw new Error(data.message || 'Failed to approve leave request');
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          toast.error('Session expired. Please log in again.', { duration: 4000 });
          router.push('/Login/Signin');
        } else if (err.response?.status === 403) {
          setIsUnauthorized(true);
          toast.error('Only authorized users (Admin or Subadmin) can approve leave requests', { duration: 4000 });
        } else {
          const message = (err.response?.data as any)?.message || 'Failed to approve leave request';
          toast.error(message, { duration: 4000 });
        }
      } else {
        toast.error('An unexpected error occurred', { duration: 4000 });
      }
    } finally {
      setIsApproving(prev => ({ ...prev, [attendanceId]: false }));
    }
  };

  const handleReject = async (attendanceId: string, reason: string) => {
    if (!isAuthorized || isUnauthorized) {
      toast.error('Only authorized users can reject leave requests');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsRejecting(prev => ({ ...prev, [attendanceId]: true }));
    try {
      const token = localStorage.getItem('token');
      await api.put(`/api/attendance/${attendanceId}/reject`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leave request rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setAttendanceToReject(null);
      fetchData(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject leave request');
    } finally {
      setIsRejecting(prev => ({ ...prev, [attendanceId]: false }));
    }
  };

  const handleSubmitToFinance = async () => {
    setIsSubmittingToFinance(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/salaries/submit-attendance', {
        month: submitMonth,
        year: submitYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Attendance data submitted to Finance successfully');
        setShowSubmitModal(false);
      } else {
        toast.error(response.data.message || 'Failed to submit data');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error submitting to Finance');
    } finally {
      setIsSubmittingToFinance(false);
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case 'present': return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-200/50';
      case 'late': return 'bg-amber-50 text-amber-700 border-amber-100 ring-1 ring-amber-200/50';
      case 'half-day': return 'bg-sky-50 text-sky-700 border-sky-100 ring-1 ring-sky-200/50';
      case 'on-leave': return 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-1 ring-indigo-200/50';
      case 'waiting': return 'bg-amber-50 text-amber-700 border-amber-100 ring-1 ring-amber-200/50';
      case 'absent': return 'bg-rose-50 text-rose-700 border-rose-100 ring-1 ring-rose-200/50';
      default: return 'bg-slate-50 text-slate-700 border-slate-100 ring-1 ring-slate-200/50';
    }
  };

  const getEnvironmentColor = (environment?: string) => {
    if (!environment) return 'bg-slate-50 text-slate-700 border-slate-100';
    return environment === 'virtual'
      ? 'bg-violet-50 text-violet-700 border-violet-100 shadow-sm'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm';
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case 'present':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'late':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'half-day':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 9.586V7z" clipRule="evenodd" />
          </svg>
        );
      case 'on-leave':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        );
      case 'waiting':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'absent':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getApprovalBadge = (isApproved: boolean) => {
    return (
      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${isApproved
        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
        {isApproved ? 'Approved' : 'Pending'}
      </span>
    );
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const currentData = attendances;
  const showFilters = activeTab === 'all';
  const showStats = activeTab === 'all';
  const showNewButton = activeTab === 'all';

  // Use effective aggregates
  const statsTotal = effectiveAggregates.total;
  const statsPresent = effectiveAggregates.present;
  const statsAbsent = effectiveAggregates.absent;
  const statsOnLeave = effectiveAggregates.onLeave;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading {activeTab === 'all' ? 'attendances' : 'pending approvals'}...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if perms denied
  if (isUnauthorized && !isAdmin) {
    return (
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-red-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-600">You lack the necessary permissions (Admin or Subadmin) for this section.</p>
            <button
              onClick={() => router.push('/subadmin/Attendance')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Go to General Attendance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8 overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Attendance <span className="text-indigo-600">Portal</span>
              </h1>
              <p className="text-slate-500 font-medium max-w-lg">
                Comprehensive workforce monitoring and attendance lifecycle management.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {showNewButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <button
                    onClick={handleNewAttendance}
                    className="group bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span>New Record</span>
                  </button>

                  {isAuthorized && !isUnauthorized && (
                    <>
                      <button
                        onClick={() => setShowSubmitModal(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl font-bold border border-slate-200 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Send className="w-4 h-4 text-emerald-500" />
                        <span>Submit Finance</span>
                      </button>

                      <button
                        onClick={handleNewHoliday}
                        className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl font-bold border border-slate-200 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span>New Holiday</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
            {[
              { id: 'all', label: 'Overview', icon: <Users size={16} /> },
              { id: 'approvals', label: 'Approvals', icon: <CheckCircle size={16} /> },
              { id: 'monitoring', label: 'Live Lab', icon: <Activity size={16} /> }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              if (tab.id !== 'all' && (!isAuthorized || isUnauthorized)) return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'approvals' && attendances.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] items-center justify-center text-white font-black">
                        {attendances.length}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Overview */}
        {showStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Records', value: statsTotal, icon: <Users className="text-indigo-600" />, color: 'indigo', bg: 'bg-indigo-50 border-indigo-100' },
              { label: 'Present Today', value: statsPresent, icon: <CheckCircle className="text-emerald-600" />, color: 'emerald', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Absent', value: statsAbsent, icon: <XCircle className="text-rose-600" />, color: 'rose', bg: 'bg-rose-50 border-rose-100' },
              { label: 'Leave Requests', value: statsOnLeave, icon: <Clock className="text-amber-600" />, color: 'amber', bg: 'bg-amber-50 border-amber-100' }
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                className={`p-6 rounded-3xl border ${stat.bg} bg-white transition-all`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">
                      {stat.label}
                    </p>
                    <h3 className="text-3xl font-black text-slate-900 leading-none">
                      {stat.value}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filters and Search */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-4 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Filter size={18} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Advanced Search</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Employee Search</label>
                <div className="relative group">
                  <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by ID or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Attendance Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none pointer-events-auto"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="on-leave">On Leave</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Approval Filter</label>
                <select
                  value={filterApproved}
                  onChange={(e) => setFilterApproved(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
                >
                  <option value="all">All Records</option>
                  <option value="approved">Approved Only</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Date Range Select</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-[10px] font-bold text-slate-700 uppercase"
                    />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-[10px] font-bold text-slate-700 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Department & Service Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
                  >
                    <option value="all">All Departments</option>
                    {Array.from(new Set(attendances.map(a => a.userId?.department || '').filter(Boolean))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Service</label>
                  <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
                  >
                    <option value="all">All Services</option>
                    {Array.from(new Set(attendances.map(a => a.employeeService || a.userId?.service || '').filter(Boolean))).map(svc => (
                      <option key={svc} value={svc}>{svc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary Card for approvals tab */}
        {activeTab === 'approvals' && isAuthorized && !isUnauthorized && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Leave Requests Awaiting Approval</h2>
                <p className="text-gray-600">Review and approve pending on-leave requests</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  {attendances.length} Pending
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
          {activeTab === 'monitoring' ? (
            <RealTimeMonitoringView />
          ) : (
            <>
              {currentData.length === 0 ? (
                <div className="text-center py-24 px-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-slate-100/50">
                    <Activity size={40} className="text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">
                    No results found
                  </h3>
                  <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                    We couldn't find any records matching your current filters. Try refining your search criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterApproved('all');
                      setFilterDepartment('all');
                      setFilterService('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee</th>
                          <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                          {activeTab === 'all' && (
                            <>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Department / Service</th>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification</th>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Finance State</th>
                            </>
                          )}
                          {activeTab === 'approvals' && (
                            <>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Environment</th>
                              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deduction</th>
                            </>
                          )}
                          <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {currentData.map((attendance, idx) => {
                          const effective = getEffectiveStatus(attendance);
                          const normalizedStatus = normalizeStatus(effective.status);
                          const formattedDate = formatDate(attendance.date);
                          const userName = attendance.employeeName || attendance.userId?.name || 'Unknown Employee';
                          const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                          const userUniqueId = attendance.employeeUniqueId || attendance.userId?.uniqueId || 'N/A';
                          const userRole = attendance.employeeRole || attendance.userId?.role || 'Staff';
                          const formattedCheckIn = formatTime(attendance.checkIn);
                          const formattedCheckOut = attendance.checkOut ? formatTime(attendance.checkOut) : '---';

                          return (
                            <motion.tr
                              key={attendance._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="group hover:bg-indigo-50/30 transition-all border-b border-slate-50 last:border-0"
                            >
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100 transform group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                    {userInitials}
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-slate-800 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{userName}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userUniqueId}</span>
                                      <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                      <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-tighter">{userRole}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-700">{formattedDate}</span>
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Logged At</span>
                                </div>
                              </td>

                              {activeTab === 'all' ? (
                                <>
                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      {(attendance.userId?.department) && (
                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-widest w-fit">
                                          {attendance.userId.department}
                                        </span>
                                      )}
                                      {(attendance.employeeService || attendance.userId?.service) && (
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">
                                          {attendance.employeeService || attendance.userId?.service}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <Clock size={10} className="text-indigo-400" />
                                          <span className="text-xs font-black text-slate-700">{formattedCheckIn}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <ArrowRight size={10} className="text-slate-200" />
                                          <span className="text-xs font-bold text-slate-400">{formattedCheckOut}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap">
                                    {effective.isHoliday ? (
                                      <div className="flex flex-col">
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 w-fit">
                                          <Calendar size={10} /> Public Holiday
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-300 mt-1 ml-1 truncate max-w-[120px]">{effective.name}</span>
                                      </div>
                                    ) : (
                                      <span className={`px-4 py-1.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${getStatusColor(attendance.status)}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${normalizedStatus === 'absent' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                        {normalizedStatus.replace('-', ' ')}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap text-center">
                                    <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-1.5 ${getEnvironmentColor(attendance.environment)}`}>
                                      {attendance.environment === 'virtual' ? 'V-Work' : 'P-Duty'}
                                    </span>
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap">
                                    {attendance.financeProcessed ? (
                                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 ring-4 ring-emerald-50/50" title="Processed">
                                        <CheckCircle size={14} />
                                      </div>
                                    ) : attendance.sentToFinance ? (
                                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 ring-4 ring-indigo-50/50" title="Transmitted">
                                        <Send size={14} />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-200" title="Draft">
                                        <MoreVertical size={14} />
                                      </div>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getEnvironmentColor(attendance.environment)}`}>
                                      {attendance.environment || 'REGULAR'}
                                    </span>
                                  </td>
                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="p-2 bg-rose-50 rounded-xl inline-block border border-rose-100">
                                      <span className="text-xs font-black text-rose-600">
                                        -${attendance.salaryDeductionAmount?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}

                              <td className="px-8 py-5 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleViewAttendance(attendance._id)}
                                    className="p-2 bg-slate-50 hover:bg-indigo-500 hover:text-white rounded-2xl text-slate-400 transition-all shadow-sm"
                                    title="View Record"
                                  >
                                    <Eye size={16} />
                                  </button>

                                  {isAuthorized && !isUnauthorized && (
                                    activeTab === 'all' ? (
                                      <button
                                        onClick={() => handleDeleteAttendance(attendance._id, userName, formattedDate)}
                                        className="p-2 bg-slate-50 hover:bg-rose-500 hover:text-white rounded-2xl text-slate-400 transition-all shadow-sm"
                                        title="Purge Entry"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleApprove(attendance._id, userName, formattedDate)}
                                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                          <CheckCircle size={10} /> Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            setAttendanceToReject(attendance._id);
                                            setActiveAttendanceName(userName);
                                            setShowRejectModal(true);
                                          }}
                                          className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100"
                                        >
                                          <XCircle size={18} />
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50/50 px-8 py-5 flex items-center justify-between border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Page <span className="text-slate-900 font-black">{page}</span> of <span className="text-slate-900 font-black">{totalPages}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                          className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={page === totalPages}
                          className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals Container */}
      <AnimatePresence>
        {/* New Holiday Modal */}
        {showHolidayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-500"></div>
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                  <Calendar size={24} />
                </div>
                New Holiday
              </h2>

              <form onSubmit={handleCreateHoliday} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Holiday Name</label>
                  <input
                    type="text"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    placeholder="E.g. Lunar New Year"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all font-bold text-slate-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Date</label>
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all font-bold text-slate-700 uppercase text-[10px]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                    <select
                      value={newHoliday.type}
                      onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all font-bold text-slate-700 text-xs"
                    >
                      <option value="government">Statutory</option>
                      <option value="regular">Regular</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowHolidayModal(false)}
                    className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingHoliday}
                    className="flex-1 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-orange-100 transition-all disabled:opacity-50"
                  >
                    {creatingHoliday ? 'Processing...' : 'Add Holiday'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                  <AlertCircle size={24} />
                </div>
                Reject Request
              </h2>
              <p className="text-slate-500 font-medium text-sm mb-6">
                Please state the reason for rejecting <span className="text-rose-600 font-bold">{activeAttendanceName}</span>'s request.
              </p>

              <textarea
                required
                placeholder="Ex: Conflicting project deadlines..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-rose-100 focus:border-rose-400 outline-none transition-all font-bold text-slate-700 h-32 text-sm"
              />

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all font-bold"
                >
                  Go Back
                </button>
                <button
                  onClick={() => attendanceToReject && handleReject(attendanceToReject, rejectionReason)}
                  disabled={isRejecting[attendanceToReject || ''] || !rejectionReason.trim()}
                  className="flex-1 px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-100 transition-all disabled:opacity-50"
                >
                  {isRejecting[attendanceToReject || ''] ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Submit to Finance Modal */}
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <TrendingUp size={24} />
                </div>
                Finance Review
              </h2>
              <p className="text-slate-500 font-medium text-sm mb-8">
                Batch processing attendance data for payroll integration.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Period Month</label>
                  <select
                    value={submitMonth}
                    onChange={(e) => setSubmitMonth(parseInt(e.target.value))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Period Year</label>
                  <select
                    value={submitYear}
                    onChange={(e) => setSubmitYear(parseInt(e.target.value))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all"
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 mb-8">
                <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
                  Records will be marked as "External Processing" and locked for further editing.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Abort
                </button>
                <button
                  onClick={handleSubmitToFinance}
                  disabled={isSubmittingToFinance}
                  className="flex-1 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingToFinance ? <RefreshCw className="animate-spin" size={16} /> : 'Transmit Data'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AttendancesPage;