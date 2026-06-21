'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios, { AxiosError, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';

import {
  ArrowLeft, Calendar, Clock, User as UserIcon, Briefcase, MapPin,
  Activity, Moon, MousePointer, Fingerprint, PenTool, CreditCard,
  Scan, FileText, Plus, Save, Download, Info, CheckCircle, AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types & Interfaces
interface User {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  service?: string;
  dailySalaryRate?: number;
  isActive?: boolean;
  attendanceMode?: 'physical' | 'virtual';
}


interface Attendance {
  _id: string;
  userId: User;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  environment?: 'virtual' | 'physical';
  sleepDuration?: number;
  cursorMovements?: string[];
  verificationMethod?: 'biometric' | 'signature' | 'punch-card' | 'rfid-qr';
  biometricScanId?: string;
  signatureData?: string;
  punchCardId?: string;
  scanData?: string;
  isApproved: boolean;
  approvedBy?: User;
  notes?: string;
  salaryDeductionAmount?: number;
  overtimeHours?: number;
  workedOnHoliday?: boolean;
  holidayType?: 'government' | 'regular' | null;
  createdAt: string;
  updatedAt: string;
}

interface Holiday {
  _id: string;
  date: string;
  name: string;
  type: 'government' | 'regular';
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  uniqueId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  notes?: string;
  environment: 'virtual' | 'physical';
  sleepDuration?: number;
  cursorMovements: string;
  verificationMethod: 'biometric' | 'signature' | 'punch-card' | 'rfid-qr';
  biometricScanId: string;
  signatureData: string;
  punchCardId: string;
  scanData: string;
  overtimeHours?: number;
  department: string;
  role: string;
  service: string;
  userAttendanceMode?: 'virtual' | 'physical';
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  users?: User[];
  staffMembers?: User[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

interface AttendanceSummary {
  summary: Array<{
    _id: string;
    count: number;
    totalOvertimeHours: number;
    totalHolidayWorkdays: number;
    totalSalaryDeductions: number;
    totalHolidayBonuses: number;
  }>;
  totalRecords: number;
}

interface ApiErrorResponse {
  message?: string;
  errorCode?: string;
}

interface ApiError extends AxiosError {
  response?: AxiosResponse<ApiErrorResponse>;
}

// Configure axios with retry
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosRetry(api, { retries: 3, retryDelay: (retryCount) => retryCount * 1000 });

const CreateAttendancePage = () => {
  const [formData, setFormData] = useState<FormData>({
    uniqueId: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'present',
    notes: '',
    environment: 'physical',
    sleepDuration: undefined,
    cursorMovements: '',
    verificationMethod: 'biometric',
    biometricScanId: '',
    signatureData: '',
    punchCardId: '',
    scanData: '',
    overtimeHours: 0,
    department: '',
    role: '',
    service: '',
    userAttendanceMode: undefined,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string | null; role: string | null; department: string | null }>({ id: null, role: null, department: null });
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [holidayPreview, setHolidayPreview] = useState<{ isHoliday: boolean; type?: 'government' | 'regular'; bonus?: number }>({ isHoliday: false });
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayFormData, setHolidayFormData] = useState<{ date: string; name: string; type: 'government' | 'regular' }>({ date: '', name: '', type: 'government' });
  const [isCreatingHoliday, setIsCreatingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [dailyRate, setDailyRate] = useState<number>(50);
  const router = useRouter();

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch current user's info
  const getCurrentUserInfo = useCallback((): { id: string | null; role: string | null; department: string | null } => {
    if (typeof window === 'undefined') {
      return { id: null, role: null, department: null };
    }
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in', { duration: 4000 });
      router.push('/Login/Signin');
      return { id: null, role: null, department: null };
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role?.toLowerCase() || null;
      return {
        id: payload.id || payload._id,
        role: (role === 'admin' || role === 'superadmin') ? 'admin' : role, // Treat superadmin as admin for existing logic
        department: payload.department?.toLowerCase() || null,
      };
    } catch (e) {
      console.error('Failed to decode token:', e);
      toast.error('Invalid token. Please log in again.', { duration: 4000 });
      router.push('/Login/Signin');
      return { id: null, role: null, department: null };
    }
  }, [router]);

  useEffect(() => {
    const userInfo = getCurrentUserInfo();
    const role = userInfo.role;
    const dept = userInfo.department || '';
    const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource');

    // Only admins can create attendance for others
    // HR Managers can access this page ONLY for holiday management
    const isAuthorized = role === 'admin' || role === 'superadmin' || (role === 'manager' && isHR);
    const canAccessPage = isAuthorized;

    if (!canAccessPage) {
      toast.error('Only Admins and HR Managers can access this page', { duration: 4000 });
      router.push('/manager-dashboard/department/hr/Attendance');
      return;
    }


    setCurrentUser(userInfo);
  }, [getCurrentUserInfo, router]);

  // Set daily rate, department/role, and attendance mode based on selected user
  useEffect(() => {
    if (formData.uniqueId) {
      const user = users.find(u => u.uniqueId === formData.uniqueId);
      if (user) {
        setDailyRate(user.dailySalaryRate || 50);
        const userMode = user.attendanceMode || 'physical';
        setFormData(prev => ({
          ...prev,
          department: user.department || '',
          role: user.role || '',
          service: user.service || '',
          userAttendanceMode: userMode,
          environment: userMode, // Set environment to match user's mode
        }));
      }
    }
  }, [formData.uniqueId, users]);

  // Reset and prefill environment-specific fields when environment or verification method changes
  useEffect(() => {
    setFormData((prev) => {
      let newSleep = prev.sleepDuration;
      let newCursor = prev.cursorMovements;
      let newBiometric = prev.biometricScanId;
      let newSignature = prev.signatureData;
      let newPunchCard = prev.punchCardId;
      let newScanData = prev.scanData;

      if (formData.environment === 'virtual' && formData.status === 'present') {
        if (newSleep === undefined) {
          newSleep = 300;
        }
        if (!newCursor.trim()) {
          const currentDate = formData.date || today;
          const exampleMovement = `${currentDate}T09:00:00.000Z`;
          newCursor = JSON.stringify([exampleMovement]);
        }
        // Clear physical verification data
        newBiometric = '';
        newSignature = '';
        newPunchCard = '';
        newScanData = '';
      } else if (formData.environment === 'physical' && formData.status === 'present') {
        // Clear virtual data
        newSleep = undefined;
        newCursor = '';

        // Prefill based on verification method
        if (formData.verificationMethod === 'biometric' && !newBiometric.trim()) {
          newBiometric = 'BIO-123456789';
        } else if (formData.verificationMethod === 'signature' && !newSignature.trim()) {
          newSignature = 'data:image/png;base64,example';
        } else if (formData.verificationMethod === 'punch-card' && !newPunchCard.trim()) {
          newPunchCard = 'PC-12345';
        } else if (formData.verificationMethod === 'rfid-qr' && !newScanData.trim()) {
          newScanData = 'QR-DATA-XYZ';
        }
      }

      return {
        ...prev,
        sleepDuration: formData.environment === 'virtual' ? newSleep : undefined,
        cursorMovements: formData.environment === 'virtual' ? newCursor : '',
        biometricScanId: formData.environment === 'physical' && formData.verificationMethod === 'biometric' ? newBiometric : '',
        signatureData: formData.environment === 'physical' && formData.verificationMethod === 'signature' ? newSignature : '',
        punchCardId: formData.environment === 'physical' && formData.verificationMethod === 'punch-card' ? newPunchCard : '',
        scanData: formData.environment === 'physical' && formData.verificationMethod === 'rfid-qr' ? newScanData : '',
      };
    });
    setFormErrors((prev) => ({
      ...prev,
      sleepDuration: undefined,
      cursorMovements: undefined,
      biometricScanId: undefined,
      signatureData: undefined,
      punchCardId: undefined,
      scanData: undefined,
    }));
  }, [formData.environment, formData.verificationMethod, formData.status, formData.date, today]);

  // Reset fields when status changes
  useEffect(() => {
    if (formData.status !== 'present') {
      setFormData((prev) => ({
        ...prev,
        biometricScanId: '',
      }));
      setFormErrors((prev) => ({
        ...prev,
        biometricScanId: undefined,
      }));
    }
    if (formData.status === 'on-leave') {
      setFormData((prev) => ({
        ...prev,
        sleepDuration: undefined,
        cursorMovements: '',
      }));
      setFormErrors((prev) => ({
        ...prev,
        sleepDuration: undefined,
        cursorMovements: undefined,
      }));
    }
  }, [formData.status]);

  // Auto-set status to 'absent' for virtual environment based on inactivity
  useEffect(() => {
    if (formData.environment === 'virtual' && formData.status === 'present') {
      let shouldBeAbsent = false;
      if (formData.sleepDuration !== undefined && formData.sleepDuration >= 480) {
        shouldBeAbsent = true;
      }
      if (formData.cursorMovements.trim()) {
        try {
          const movements = JSON.parse(formData.cursorMovements);
          if (Array.isArray(movements) && movements.length === 0) {
            shouldBeAbsent = true;
          }
        } catch {
          // Invalid JSON, treat as no movements
          shouldBeAbsent = true;
        }
      } else {
        // No cursor movements provided
        shouldBeAbsent = true;
      }
      if (shouldBeAbsent) {
        setFormData(prev => ({ ...prev, status: 'absent' }));
        toast('Status auto-set to Absent due to inactivity (sleep >= 8 hours or no cursor movements)', { icon: '⚠️' });
      }
    }
  }, [formData.environment, formData.status, formData.sleepDuration, formData.cursorMovements]);

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    try {
      setIsFetchingHolidays(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const res = await api.get<ApiResponse<Holiday[]>>('/api/holidays', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data) {
        setHolidays(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch holidays');
      }
    } catch (err) {
      const error = err as ApiError;
      const message = error.response?.data?.message || error.message || 'Failed to fetch holidays';
      setHolidayError(message);
      toast.error(message, { duration: 4000 });
    } finally {
      setIsFetchingHolidays(false);
    }
  }, []);

  // Check if selected date is a holiday
  const checkHolidayForDate = useCallback((date: string) => {
    const selectedDate = new Date(date).toISOString().split('T')[0];
    const matchingHoliday = holidays.find(h => new Date(h.date).toISOString().split('T')[0] === selectedDate);
    if (matchingHoliday) {
      setSelectedHoliday(matchingHoliday);
      // Preview bonus using current dailyRate
      const rate = matchingHoliday.type === 'government' ? 1.0 : 0.3;
      const bonus = dailyRate * rate;
      setHolidayPreview({ isHoliday: true, type: matchingHoliday.type, bonus });
      // Automatically set status to 'present' for holidays
      setFormData(prev => ({ ...prev, status: 'present' }));
      toast.success(`Status auto-set to Present for holiday: ${matchingHoliday.name}`, { duration: 3000 });
    } else {
      setSelectedHoliday(null);
      setHolidayPreview({ isHoliday: false });
    }
  }, [holidays, dailyRate]);

  // Create holiday
  const createHoliday = useCallback(async () => {
    if (!holidayFormData.date || !holidayFormData.name || !holidayFormData.type) {
      setHolidayError('All holiday fields are required');
      return;
    }
    try {
      setIsCreatingHoliday(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const res = await api.post<ApiResponse<Holiday>>('/api/holidays', holidayFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data) {
        setHolidays(prev => [...prev, res.data.data!]);
        toast.success('Holiday created successfully', { duration: 4000 });
        setShowHolidayModal(false);
        setHolidayFormData({ date: '', name: '', type: 'government' });
        // Re-check holiday for current date
        if (formData.date) checkHolidayForDate(formData.date);
      } else {
        throw new Error(res.data.message || 'Failed to create holiday');
      }
    } catch (err) {
      const error = err as ApiError;
      const message = error.response?.data?.message || error.message || 'Failed to create holiday';
      setHolidayError(message);
      toast.error(message, { duration: 4000 });
    } finally {
      setIsCreatingHoliday(false);
    }
  }, [holidayFormData, formData.date, checkHolidayForDate]);

  // Fetch users with fallback endpoint - FIXED: Handle non-array rawUsers
  const fetchUsers = useCallback(async (): Promise<User[]> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    try {
      const res = await api.get<ApiResponse<{ staffMembers: User[]; users: User[] }>>('/api/auth/admin/staff', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetch users response:', res.data); // DEBUG LOG
      if (res.data.success) {
        // Handle various response structures for robustness
        let rawUsers: User[] = [];
        if (res.data.data?.staffMembers && Array.isArray(res.data.data.staffMembers)) {
          rawUsers = res.data.data.staffMembers;
        } else if (res.data.data?.users && Array.isArray(res.data.data.users)) {
          rawUsers = res.data.data.users;
        } else if (res.data.staffMembers && Array.isArray(res.data.staffMembers)) {
          rawUsers = res.data.staffMembers;
        } else if (res.data.users && Array.isArray(res.data.users)) {
          rawUsers = res.data.users;
        } else if (Array.isArray(res.data.data)) {
          rawUsers = res.data.data as unknown as User[];
        }

        console.log('Raw users found:', rawUsers.length); // DEBUG LOG

        const validUsers = rawUsers.filter(
          (user: User) => {
            const hasUniqueId = !!user.uniqueId;
            const hasName = !!user.name;
            const isActive = user.isActive !== false;
            return hasUniqueId && hasName && isActive;
          }
        );
        console.log('Valid users after filtering:', validUsers.length); // DEBUG LOG
        return Array.from(new Map(validUsers.map((user: User) => [user.uniqueId, user])).values()) as User[];
      }
      throw new Error(res.data.message || 'Failed to fetch users');
    } catch (err) {
      const error = err as ApiError;
      console.error('Fetch users error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to fetch users';
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.', { duration: 4000 });
        router.push('/Login/Signin');
      } else if (error.response?.status === 403) {
        toast.error('Only admins can access user data.', { duration: 4000 });
        router.push('/manager-dashboard/department/hr/Attendance/new-create');
      } else {
        setError(message);
      }
      return [];
    }
  }, [router]);

  // Fetch attendance summary
  const fetchAttendanceSummary = useCallback(async () => {
    try {
      setIsFetchingSummary(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const res = await api.get<ApiResponse<AttendanceSummary>>('/api/attendance/summary', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          uniqueId: formData.uniqueId || undefined,
          startDate: formData.date || undefined,
        },
      });
      if (res.data.success && res.data.data) {
        setSummary(res.data.data);
        toast.success('Attendance summary fetched successfully', { duration: 4000 });
      } else {
        throw new Error(res.data.message || 'Failed to fetch summary');
      }
    } catch (err) {
      const error = err as ApiError;
      const message = error.response?.data?.message || error.message || 'Failed to fetch attendance summary';
      setError(message);
      toast.error(message, { duration: 4000 });
    } finally {
      setIsFetchingSummary(false);
    }
  }, [formData.uniqueId, formData.date]);

  // Export attendance report
  const exportAttendanceReport = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const res = await api.get('/api/attendance/export', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          uniqueId: formData.uniqueId || undefined,
          startDate: formData.date || undefined,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_report.csv');
      link.style.display = 'none';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance report exported successfully', { duration: 4000 });
    } catch (err) {
      const error = err as ApiError;
      const message = error.response?.data?.message || error.message || 'Failed to export attendance report';
      setError(message);
      toast.error(message, { duration: 4000 });
    }
  }, [formData.uniqueId, formData.date]);

  useEffect(() => {
    const fetchData = async () => {
      const role = currentUser.role;
      const dept = currentUser.department || '';
      const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource');
      const isAuthorized = role === 'admin' || role === 'superadmin' || (role === 'manager' && isHR);

      if (!isAuthorized) return;
      setLoading(true);
      try {
        await fetchHolidays();  // Fetch holidays on load
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
        // Prefill form with defaults to enable button immediately
        if (fetchedUsers.length > 0) {
          const exampleMovement = `${today}T09:00:00.000Z`;
          setFormData(prev => ({
            ...prev,
            uniqueId: fetchedUsers[0].uniqueId,
            department: fetchedUsers[0].department || '',
            role: fetchedUsers[0].role || '',
            service: fetchedUsers[0].service || '',
            date: today,
            checkIn: '09:00',
            checkOut: '17:00',
            status: 'present',
            sleepDuration: 300, // 5 hours example (less than 8 to avoid auto-absent)
            cursorMovements: JSON.stringify([exampleMovement]), // Valid JSON array example
          }));
        }
      } catch (err) {
        console.error('Fetch data error:', err);
        setError('Failed to load data. Please check the backend server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser.role, currentUser.department, fetchHolidays, fetchUsers, today]);

  useEffect(() => {
    if (formData.date) {
      checkHolidayForDate(formData.date);  // Check holiday when date changes
    }
  }, [formData.date, checkHolidayForDate]);

  useEffect(() => {
    if (!loading && users.length === 0) {
      toast.error('No active staff members available. Please add staff first.', { duration: 5000 });
    }
  }, [loading, users.length]);

  // Improved validation for cursor movements
  const validateCursorMovements = useCallback((movements: string[], attendanceDate: string) => {
    const startOfDay = new Date(attendanceDate + 'T00:00:00.000Z').getTime();
    const endOfDay = new Date(attendanceDate + 'T23:59:59.999Z').getTime();
    return movements.every((dateStr) => {
      const d = new Date(dateStr).getTime();
      return d >= startOfDay && d <= endOfDay && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(dateStr);
    });
  }, []);

  const validateForm = useCallback(() => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.uniqueId) {
      errors.uniqueId = 'Please select a staff member';
    }
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    // Removed past date validation - admins can create for past dates
    if (!formData.checkIn) {
      errors.checkIn = 'Check-in time is required';
    }
    if (!formData.status) {
      errors.status = 'Status is required';
    }
    if (!formData.environment) {
      errors.environment = 'Environment is required';
    }
    if (formData.overtimeHours !== undefined && (formData.overtimeHours < 0 || formData.overtimeHours > 8)) {
      errors.overtimeHours = 'Overtime hours must be between 0 and 8';
    }
    // Skip environment-specific validation for on-leave
    if (formData.status !== 'on-leave') {
      // Check if environment matches user's attendance mode
      if (formData.userAttendanceMode && formData.environment !== formData.userAttendanceMode) {
        errors.environment = `This user is configured for '${formData.userAttendanceMode}' attendance only`;
      }

      if (formData.environment === 'virtual') {
        if (formData.sleepDuration === undefined || formData.sleepDuration < 0) {
          errors.sleepDuration = 'Sleep duration is required and must be a valid number (minutes)';
        }
        if (!formData.cursorMovements.trim()) {
          errors.cursorMovements = 'Cursor movements are required (provide as JSON array)';
        } else {
          try {
            const cursorMovementsArray = JSON.parse(formData.cursorMovements);
            if (!Array.isArray(cursorMovementsArray)) {
              errors.cursorMovements = 'Cursor movements must be a valid JSON array';
            } else if (!validateCursorMovements(cursorMovementsArray, formData.date)) {
              errors.cursorMovements = 'Cursor movements must be valid ISO date strings within the attendance date';
            }
          } catch {
            errors.cursorMovements = 'Cursor movements must be a valid JSON array of ISO date strings';
          }
        }
      } else if (formData.environment === 'physical' && formData.status === 'present') {
        // Validate based on verification method
        if (formData.verificationMethod === 'biometric') {
          if (!formData.biometricScanId.trim() || !/^BIO-\d{9}$/.test(formData.biometricScanId)) {
            errors.biometricScanId = 'Valid biometric scan ID (BIO-<9 digits>) is required';
          }
        } else if (formData.verificationMethod === 'signature') {
          if (!formData.signatureData.trim()) {
            errors.signatureData = 'Signature data is required for signature verification';
          }
        } else if (formData.verificationMethod === 'punch-card') {
          if (!formData.punchCardId.trim()) {
            errors.punchCardId = 'Punch Card ID is required for punch-card verification';
          }
        } else if (formData.verificationMethod === 'rfid-qr') {
          if (!formData.scanData.trim()) {
            errors.scanData = 'Scan data is required for RFID/QR verification';
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateCursorMovements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError(null);
    const isValid = validateForm();

    if (!isValid) {
      setError('Please correct the form errors');
      return;
    }

    const isoDate = new Date(formData.date);
    const checkInTime = formData.checkIn ? `${formData.date}T${formData.checkIn}:00.000Z` : undefined;
    const checkOutTime = formData.checkOut ? `${formData.date}T${formData.checkOut}:00.000Z` : undefined;

    const payload: Record<string, unknown> = {
      uniqueId: formData.uniqueId,
      date: isoDate.toISOString().split('T')[0],
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: formData.status,
      notes: formData.notes || '',
      environment: formData.environment,
      overtimeHours: formData.overtimeHours || 0,
    };

    if (formData.environment === 'virtual') {
      payload.sleepDuration = formData.sleepDuration;
      payload.cursorMovements = JSON.parse(formData.cursorMovements);
    } else if (formData.environment === 'physical') {
      payload.verificationMethod = formData.verificationMethod;

      if (formData.verificationMethod === 'biometric') {
        payload.biometricScanId = formData.biometricScanId;
      } else if (formData.verificationMethod === 'signature') {
        payload.signatureData = formData.signatureData;
      } else if (formData.verificationMethod === 'punch-card') {
        payload.punchCardId = formData.punchCardId;
      } else if (formData.verificationMethod === 'rfid-qr') {
        payload.scanData = formData.scanData;
      }
    }

    // Set holiday-related fields if it's a holiday and status is present
    if (selectedHoliday && formData.status === 'present') {
      payload.workedOnHoliday = true;
      payload.holidayType = selectedHoliday.type;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const res = await api.post<ApiResponse<Attendance>>('/api/attendance', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.data.success) {
        toast.success('Attendance created successfully', {
          duration: 4000,
        });
        router.push('/Admin/Attendance');
      } else {
        throw new Error(res.data.message || 'Operation failed');
      }
    } catch (err) {
      const error = err as ApiError;
      const message = error.response?.data?.message || error.message || 'Failed to create attendance';
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.', { duration: 4000 });
        router.push('/Login/Signin');
      } else if (error.response?.status === 403) {
        toast.error('Only admins can perform this action', { duration: 4000 });
      } else {
        setError(`Error: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = useCallback((field: keyof FormData, value: string | number | undefined) => {
    let trimmedValue = value;
    if (field === 'biometricScanId' && typeof value === 'string') {
      trimmedValue = value.trim();
    }
    setFormData((prev) => ({ ...prev, [field]: trimmedValue }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  }, []);

  const handleHolidayInputChange = useCallback((field: keyof typeof holidayFormData, value: string | 'government' | 'regular') => {
    setHolidayFormData((prev) => ({ ...prev, [field]: value }));
    setHolidayError(null);
  }, []);

  const isFormValid = useMemo(
    () =>
      formData.uniqueId &&
      formData.date &&
      formData.checkIn &&
      formData.status &&
      formData.environment &&
      (formData.overtimeHours === undefined || (formData.overtimeHours >= 0 && formData.overtimeHours <= 8)) &&
      users.length > 0 &&
      (formData.status === 'on-leave' ||
        (formData.environment === 'virtual'
          ? formData.sleepDuration !== undefined &&
          formData.sleepDuration >= 0 &&
          formData.cursorMovements.trim()
          : formData.environment === 'physical'
            ? formData.status !== 'present' || (formData.biometricScanId.trim() && /^BIO-\d{9}$/.test(formData.biometricScanId.trim()))
            : true)),
    [formData, users.length]
  );

  const role = currentUser.role;
  const dept = currentUser.department || '';
  const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource');
  const isAuthorized = role === 'admin' || (role === 'manager' && isHR);

  if (!isAuthorized) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
      >
        <div className="space-y-4">
          <Link
            href="/manager-dashboard/department/hr/Attendance"
            className="group inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shadow-sm">
              <ArrowLeft size={14} />
            </div>
            <span>Back to Attendance</span>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {['admin', 'superadmin'].includes(currentUser.role || '') ? 'New Entry' : 'Holidays'}
            </h1>
            <p className="text-slate-500 font-medium max-w-xl mt-2 leading-relaxed">
              {['admin', 'superadmin'].includes(currentUser.role || '')
                ? 'Manually record attendance or scheduled leaves, and manage verification details.'
                : 'Configure the organization holiday calendar.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchAttendanceSummary}
            disabled={isFetchingSummary || !formData.uniqueId}
            className="group flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 rounded-2xl font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
            <span>View Summary</span>
          </button>

          <button
            onClick={exportAttendanceReport}
            disabled={!formData.uniqueId}
            className="group flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 rounded-2xl font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => setShowHolidayModal(true)}
            disabled={isFetchingHolidays}
            className="group flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 text-slate-600 hover:text-orange-700 rounded-2xl font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar size={18} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
            <span>Manage Holidays</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden relative"
      >
        {/* Decorative gradient top bar */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-8 lg:p-12 space-y-10">
          {/* Notices */}
          <AnimatePresence>
            {holidayPreview.isHoliday && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-amber-50/80 rounded-2xl border border-amber-100 flex items-start gap-4"
              >
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shadow-sm ring-1 ring-amber-200/50">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="font-black text-amber-900 text-sm uppercase tracking-wide">Scheduled Holiday</h4>
                  <p className="text-amber-700 font-medium text-sm mt-0.5">
                    {selectedHoliday?.name} <span className="px-2 py-0.5 rounded-lg bg-amber-200/50 text-[10px] font-bold uppercase ml-1 opacity-80">{selectedHoliday?.type}</span>
                  </p>
                  <p className="text-amber-600/80 text-xs font-bold mt-1">Estimated Bonus: ${holidayPreview.bonus?.toFixed(2)}</p>
                </div>
              </motion.div>
            )}

            {currentUser.role === 'manager' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-start gap-4"
              >
                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm ring-1 ring-indigo-200/50">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="font-black text-indigo-900 text-sm uppercase tracking-wide">Holiday Management Mode</h4>
                  <p className="text-indigo-700 font-medium text-sm mt-1 leading-relaxed">
                    As an HR Manager, use the <strong>Manage Holidays</strong> button above to configure the calendar.
                    Attendance marking is restricted to Admins only.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-24">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Resources...</p>
              </div>
            ) : (
              <>
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-10 p-6 bg-slate-50/50 rounded-3xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-indigo-500">
                        <Activity size={16} />
                      </div>
                      <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Daily Snapshot</h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                        <p className="text-2xl font-black text-slate-800">{summary.totalRecords}</p>
                      </div>
                      {summary.summary.map((item) => (
                        <div key={item._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item._id}</p>
                          <p className="text-2xl font-black text-slate-800">{item.count}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Only show form for admins */}
                {['admin', 'superadmin'].includes(currentUser.role || '') ? (
                  <form onSubmit={handleSubmit} className="space-y-12">
                    {error && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                        <AlertTriangle size={20} />
                        <span className="font-medium text-sm">{error}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Staff Selection */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Select Employee</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <UserIcon size={18} />
                          </div>
                          <select
                            id="employee-select"
                            value={formData.uniqueId}
                            onChange={(e) => handleInputChange('uniqueId', e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 appearance-none"
                            required
                          >
                            <option value="">Choose a staff member...</option>
                            {users.length > 0 ? (
                              users.map((user) => (
                                <option key={user._id} value={user.uniqueId}>
                                  {user.name} ({user.uniqueId}) - {user.role || 'N/A'}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No staff available</option>
                            )}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                        {formErrors.uniqueId && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.uniqueId}
                          </p>
                        )}
                      </div>

                      {/* Read-only Info Card */}
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        {/* Department */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Briefcase size={14} /></div>
                            <span className="font-bold text-slate-700 text-sm truncate">{formData.department || '---'}</span>
                          </div>
                        </div>
                        {/* Role */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</label>
                          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="p-1.5 bg-purple-50 text-purple-500 rounded-lg"><FileText size={14} /></div>
                            <span className="font-bold text-slate-700 text-sm truncate">{formData.role || '---'}</span>
                          </div>
                        </div>
                        {/* Service */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service</label>
                          <div className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><MapPin size={14} /></div>
                            <span className="font-bold text-slate-700 text-sm truncate">{formData.service || '---'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Date Field */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Date</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Calendar size={18} />
                          </div>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleInputChange('date', e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowHolidayModal(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            + Holiday
                          </button>
                        </div>
                        {formErrors.date && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.date}
                          </p>
                        )}
                      </div>

                      {/* Check-In Time */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Check-In</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Clock size={18} />
                          </div>
                          <input
                            type="time"
                            value={formData.checkIn}
                            onChange={(e) => handleInputChange('checkIn', e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                            required
                          />
                        </div>
                        {formErrors.checkIn && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.checkIn}
                          </p>
                        )}
                      </div>

                      {/* Check-Out Time */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Check-Out</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Clock size={18} />
                          </div>
                          <input
                            type="time"
                            value={formData.checkOut}
                            onChange={(e) => handleInputChange('checkOut', e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Status</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Activity size={18} />
                          </div>
                          <select
                            id="status-select"
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 appearance-none"
                            required
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half-day">Half Day</option>
                            <option value="on-leave">On Leave</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                        {formErrors.status && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.status}
                          </p>
                        )}
                      </div>

                      {/* Environment */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Work Environment</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Briefcase size={18} />
                          </div>
                          <select
                            id="environment-select"
                            value={formData.environment}
                            onChange={(e) => handleInputChange('environment', e.target.value as 'virtual' | 'physical')}
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 appearance-none"
                            required
                          >
                            <option value="virtual">Virtual (Remote)</option>
                            <option value="physical">Physical (On-site)</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                        {formErrors.environment && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.environment}
                          </p>
                        )}
                      </div>

                      {/* Overtime */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Overtime (Hours)</label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <Clock size={18} />
                          </div>
                          <input
                            type="number"
                            value={formData.overtimeHours ?? ''}
                            onChange={(e) => handleInputChange('overtimeHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                            min="0"
                            max="8"
                            step="0.5"
                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                            aria-label="Enter overtime hours"
                          />
                        </div>
                        {formErrors.overtimeHours && (
                          <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1">
                            <AlertTriangle size={12} /> {formErrors.overtimeHours}
                          </p>
                        )}
                      </div>

                      {formData.environment === 'virtual' && formData.status !== 'on-leave' && (
                        <div className="md:col-span-2 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-6">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Moon size={16} /></div>
                            <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Virtual Workspace Logs</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Sleep Duration */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sleep Logs (Min)</label>
                              <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"><Moon size={18} /></div>
                                <input
                                  type="number"
                                  value={formData.sleepDuration ?? ''}
                                  onChange={(e) => handleInputChange('sleepDuration', e.target.value ? parseFloat(e.target.value) : undefined)}
                                  min="0"
                                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all font-medium text-slate-700"
                                  required
                                />
                              </div>
                              {formErrors.sleepDuration && (
                                <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.sleepDuration}</p>
                              )}
                            </div>

                            {/* Cursor Movements */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Cursor Activity Log</label>
                              <div className="relative group">
                                <div className="absolute left-3 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"><MousePointer size={18} /></div>
                                <textarea
                                  value={formData.cursorMovements}
                                  onChange={(e) => handleInputChange('cursorMovements', e.target.value)}
                                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all font-medium text-slate-700 min-h-[100px] text-xs font-mono"
                                  rows={3}
                                  placeholder='["2025-10-10T09:00:00.000Z", ...]'
                                  required
                                />
                              </div>
                              {formErrors.cursorMovements && (
                                <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.cursorMovements}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.environment === 'physical' && formData.status === 'present' && (
                        <div className="md:col-span-2 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-6">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Fingerprint size={16} /></div>
                            <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Physical Verification</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Method Selection */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Verification Method</label>
                              <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none"><Scan size={18} /></div>
                                <select
                                  id="verification-method-select"
                                  value={formData.verificationMethod}
                                  onChange={(e) => handleInputChange('verificationMethod', e.target.value as any)}
                                  className="w-full pl-10 pr-4 py-3.5 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all font-medium text-slate-700 appearance-none"
                                  required
                                >
                                  <option value="biometric">Biometric Scan</option>
                                  <option value="signature">Signature Register</option>
                                  <option value="punch-card">ID / Punch Card</option>
                                  <option value="rfid-qr">RFID / QR Scanner</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Fields */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                {formData.verificationMethod === 'biometric' && 'Biometric ID'}
                                {formData.verificationMethod === 'signature' && 'Signature Data'}
                                {formData.verificationMethod === 'punch-card' && 'Card ID'}
                                {formData.verificationMethod === 'rfid-qr' && 'Scan Data'}
                              </label>
                              <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none">
                                  {formData.verificationMethod === 'biometric' && <Fingerprint size={18} />}
                                  {formData.verificationMethod === 'signature' && <PenTool size={18} />}
                                  {formData.verificationMethod === 'punch-card' && <CreditCard size={18} />}
                                  {formData.verificationMethod === 'rfid-qr' && <Scan size={18} />}
                                </div>

                                {formData.verificationMethod === 'biometric' && (
                                  <input
                                    type="text"
                                    value={formData.biometricScanId}
                                    onChange={(e) => handleInputChange('biometricScanId', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all font-medium text-slate-700"
                                    placeholder="BIO-123456789"
                                    required
                                  />
                                )}

                                {formData.verificationMethod === 'signature' && (
                                  <textarea
                                    value={formData.signatureData}
                                    onChange={(e) => handleInputChange('signatureData', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all font-medium text-slate-700 min-h-[52px]"
                                    placeholder="data:image/png;base64,... or URL"
                                    rows={1}
                                    required
                                    style={{ resize: 'none' }}
                                  />
                                )}

                                {formData.verificationMethod === 'punch-card' && (
                                  <input
                                    type="text"
                                    value={formData.punchCardId}
                                    onChange={(e) => handleInputChange('punchCardId', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all font-medium text-slate-700"
                                    placeholder="PC-12345"
                                    required
                                  />
                                )}

                                {formData.verificationMethod === 'rfid-qr' && (
                                  <input
                                    type="text"
                                    value={formData.scanData}
                                    onChange={(e) => handleInputChange('scanData', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition-all font-medium text-slate-700"
                                    placeholder="QR-DATA-XYZ"
                                    required
                                  />
                                )}
                              </div>
                              {/* Errors */}
                              {formErrors.biometricScanId && formData.verificationMethod === 'biometric' && <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.biometricScanId}</p>}
                              {formErrors.signatureData && formData.verificationMethod === 'signature' && <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.signatureData}</p>}
                              {formErrors.punchCardId && formData.verificationMethod === 'punch-card' && <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.punchCardId}</p>}
                              {formErrors.scanData && formData.verificationMethod === 'rfid-qr' && <p className="pl-1 text-xs font-bold text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {formErrors.scanData}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Additional Notes</label>
                        <textarea
                          id="notes-input"
                          value={formData.notes || ''}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                          rows={4}
                          placeholder="Add any relevant details regarding this attendance entry..."
                          maxLength={500}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                      <Link
                        href="/manager-dashboard/department/hr/Attendance"
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={isSubmitting || !isFormValid}
                        className={`px-6 py-3 rounded-xl text-white font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95 ${isSubmitting || !isFormValid
                          ? 'bg-slate-300 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600'
                          }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          'Create Attendance'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                      <div className="relative p-6 bg-white rounded-3xl shadow-xl shadow-blue-100 border border-blue-50">
                        <span className="text-6xl">🗓️</span>
                      </div>
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-2xl font-black text-slate-800">Holiday Management</h3>
                      <p className="text-slate-500 font-medium leading-relaxed">
                        This area is restricted. Use the <strong className="text-indigo-600">Manage Holidays</strong> button above to configure company holidays.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Holiday Modal */}
      <AnimatePresence>
        {
          showHolidayModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Calendar size={20} /></div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">Manage Holidays</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Add a new company holiday</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHolidayModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  {holidayError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                      <AlertTriangle size={20} />
                      <span className="font-medium text-sm">{holidayError}</span>
                    </div>
                  )}

                  {holidays.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Recent Holidays</h3>
                      <div className="space-y-2">
                        {holidays.slice(-3).map((h) => (
                          <div key={h._id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-700 text-sm">{h.name}</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${h.type === 'government' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{h.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Date</label>
                      <input
                        type="date"
                        value={holidayFormData.date}
                        onChange={(e) => handleHolidayInputChange('date', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Holiday Name</label>
                      <input
                        type="text"
                        value={holidayFormData.name}
                        onChange={(e) => handleHolidayInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                        placeholder="e.g. National Day"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Type</label>
                      <div className="relative">
                        <select
                          value={holidayFormData.type}
                          onChange={(e) => handleHolidayInputChange('type', e.target.value as any)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 appearance-none"
                          required
                        >
                          <option value="government">Government Holiday</option>
                          <option value="regular">Regular Holiday</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
                  <button onClick={() => setShowHolidayModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">Cancel</button>
                  <button onClick={createHoliday} disabled={isCreatingHoliday} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">{isCreatingHoliday ? 'Saving...' : 'Create Holiday'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};


export default CreateAttendancePage;