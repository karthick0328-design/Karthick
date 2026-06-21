'use client';

import { FormEvent, useState, ChangeEvent, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)
import { toastConfig } from '../../../../../../../utils/toastConfig';
import { FiArrowLeft, FiCalendar, FiUser, FiClock, FiCheckCircle, FiEdit3, FiGlobe, FiMonitor } from 'react-icons/fi';
import { MdFingerprint } from 'react-icons/md';

interface User {
  _id: string;
  name: string;
  uniqueId?: string;
  role: string;
  employeeType?: string;
  service?: string;
  department?: string;
}

interface Attendance {
  _id: string;
  userId: { _id: string; name: string; uniqueId?: string; role: string; employeeType?: string };
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  notes?: string;
  isApproved?: boolean;
  employeeName?: string;
  employeeUniqueId?: string;
  employeeRole?: string;
  employeeService?: string;
  createdAt: string;
  environment?: 'virtual' | 'physical';
  sleepDuration?: number;
  cursorMovements?: string[];
  biometricScanId?: string;
  overtimeHours?: number;
  workedOnHoliday?: boolean;
  holidayType?: 'government' | 'regular';
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
  biometricScanId: string;
  isApproved?: boolean;
  overtimeHours?: number;
  workedOnHoliday?: boolean;
  holidayType?: 'government' | 'regular' | '';
}

interface FormErrors {
  uniqueId?: string;
  date?: string;
  checkIn?: string;
  status?: string;
  environment?: string;
  sleepDuration?: string;
  cursorMovements?: string;
  biometricScanId?: string;
  notes?: string;
  isApproved?: string;
  overtimeHours?: string;
  workedOnHoliday?: string;
  holidayType?: string;
}

interface AttendanceResponse {
  success: boolean;
  data: Attendance;
  message?: string;
}

interface UsersResponse {
  success: boolean;
  users?: User[];
  data?: User[];
  message?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Utility to validate ISO date strings (improved regex for optional timezone)
const isValidISODate = (dateStr: string): boolean => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
  if (!isoDateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

export default function EditAttendancePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [formData, setFormData] = useState<FormData>({
    uniqueId: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'present',
    notes: '',
    environment: 'virtual',
    sleepDuration: 0,
    cursorMovements: '[]',
    biometricScanId: '',
    isApproved: true,
    overtimeHours: 0,
    workedOnHoliday: false,
    holidayType: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentUser, setCurrentUser] = useState<{ id: string | null; role: string | null; department: string | null }>({ id: null, role: null, department: null });

  const filteredUsers = useMemo(() => users, [users]);

  const isSubmitDisabled = isSubmitting || !filteredUsers.length;

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    // uniqueId is optional for admin edits, so skip validation
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.checkIn) errors.checkIn = 'Check-in time is required';
    if (!formData.status) errors.status = 'Status is required';
    if (!formData.environment) errors.environment = 'Environment is required';
    if (formData.status === 'on-leave' && formData.isApproved === undefined) {
      errors.isApproved = 'Approval status is required for on-leave';
    }

    if (formData.environment === 'virtual' && formData.status !== 'on-leave') {
      if (formData.sleepDuration === undefined || formData.sleepDuration < 0) {
        errors.sleepDuration = 'Sleep duration is required and must be a valid number (minutes)';
      }
      if (!formData.cursorMovements.trim()) {
        errors.cursorMovements = 'Cursor movements are required (provide as JSON array)';
      } else {
        try {
          const parsed = JSON.parse(formData.cursorMovements);
          if (!Array.isArray(parsed)) {
            errors.cursorMovements = 'Cursor movements must be a valid JSON array';
          } else if (parsed.length === 0) {
            errors.cursorMovements = 'Cursor movements array cannot be empty';
          } else if (!parsed.every(isValidISODate)) {
            errors.cursorMovements = 'All cursor movements must be valid ISO date strings (e.g., "2025-10-07T10:00:00Z")';
          }
        } catch (error) {
          errors.cursorMovements = 'Cursor movements must be a valid JSON array of ISO date strings';
        }
      }
    } else if (formData.environment === 'physical' && formData.status === 'present') {
      if (!formData.biometricScanId.trim()) {
        errors.biometricScanId = 'Biometric scan ID is required for present status in physical environment';
      }
    }

    if (formData.status === 'present') {
      if (formData.overtimeHours !== undefined && (formData.overtimeHours < 0 || formData.overtimeHours > 8)) {
        errors.overtimeHours = 'Overtime hours must be between 0 and 8';
      }
      if (formData.workedOnHoliday && !['government', 'regular'].includes(formData.holidayType || '')) {
        errors.holidayType = 'Holiday type must be "government" or "regular" if worked on holiday';
      }
    }

    return errors;
  };

  // Real-time validation on form changes
  useEffect(() => {
    const errors = validateForm();
    setFormErrors(errors);
  }, [formData]);

  // Fetch current user's ID and role from token
  useEffect(() => {
    const getCurrentUserInfo = (): { id: string | null; role: string | null; department: string | null } => {
      if (typeof window === 'undefined') {
        return { id: null, role: null, department: null };
      }
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            id: payload.id || payload._id,
            role: payload.role?.toLowerCase() || null,
            department: payload.department?.toLowerCase() || null,
          };
        } catch (e) {
          console.error('Failed to decode token:', e);
          return { id: null, role: null, department: null };
        }
      }
      return { id: null, role: null, department: null };
    };

    setCurrentUser(getCurrentUserInfo());
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to edit attendance', toastConfig.error);
      router.push('/Login/Signin');
      return;
    }

    if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
      toast.error('Invalid attendance ID format', toastConfig.error);
      router.push('/manager-dashboard/department/hr/Attendance');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch users
        let validUsers: User[] = [];
        const usersRes = await fetch(`${API_URL}/api/auth/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersRes.ok) {
          const usersData: UsersResponse = await usersRes.json();
          if (usersData.success) {
            // Robust extraction to handle various response structures (e.g., data as object with users array)
            let rawUsers: User[] = [];
            if (usersData.users && Array.isArray(usersData.users)) {
              rawUsers = usersData.users;
            } else if (usersData.data && Array.isArray(usersData.data)) {
              rawUsers = usersData.data;
            } else {
              console.warn('Unexpected users response structure:', usersData);
              rawUsers = [];
            }
            validUsers = rawUsers.filter((user: User) => user._id && user.name);
          } else {
            toast.error(usersData.message || 'Failed to fetch users', toastConfig.error);
          }
        } else {
          const errorData = await usersRes.json();
          throw new Error(errorData.message || `HTTP error ${usersRes.status}`);
        }

        // Fetch attendance
        const attRes = await fetch(`${API_URL}/api/attendance/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!attRes.ok) {
          const errorData = await attRes.json();
          throw new Error(errorData.message || `HTTP error ${attRes.status}`);
        }
        const attData: AttendanceResponse = await attRes.json();
        if (isMounted && attData.success) {
          const attendance = attData.data;
          const assignedUser = attendance.userId;
          if (!assignedUser || (!assignedUser._id && !assignedUser.uniqueId)) {
            toast.error('Invalid assigned user data', toastConfig.error);
            setIsLoading(false);
            return;
          }
          const exists = validUsers.some(u => u._id === assignedUser._id);
          if (!exists) {
            validUsers.push(assignedUser);
          }
          validUsers.sort((a, b) => (a.uniqueId || '').localeCompare(b.uniqueId || ''));
          setUsers(validUsers);
          setFormData({
            uniqueId: assignedUser.uniqueId || assignedUser._id,
            date: new Date(attendance.date).toISOString().split('T')[0],
            checkIn: attendance.checkIn ? new Date(attendance.checkIn).toISOString().slice(11, 16) : '',
            checkOut: attendance.checkOut ? new Date(attendance.checkOut).toISOString().slice(11, 16) : '',
            status: attendance.status,
            notes: attendance.notes || '',
            environment: attendance.environment || 'virtual',
            sleepDuration: attendance.sleepDuration ?? 0,
            cursorMovements: attendance.cursorMovements ? JSON.stringify(attendance.cursorMovements) : '[]',
            biometricScanId: attendance.biometricScanId || '',
            isApproved: attendance.isApproved ?? false,
            overtimeHours: attendance.overtimeHours ?? 0,
            workedOnHoliday: attendance.workedOnHoliday ?? false,
            holidayType: attendance.holidayType ?? '',
          });
        } else if (isMounted) {
          toast.error(attData.message || 'Attendance not found', toastConfig.error);
          router.push('/manager-dashboard/department/hr/Attendance');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('EditAttendance fetch error:', errorMessage);
        if (isMounted) {
          if (errorMessage.includes('Unauthorized') || errorMessage.includes('login')) {
            localStorage.removeItem('token');
            toast.error('Session expired. Please log in again.', toastConfig.error);
            router.push('/Login/Signin');
          } else if (errorMessage.includes('Only admins')) {
            toast.error('Only admins can edit attendances', toastConfig.error);
            router.push('/manager-dashboard/department/hr/Attendance');
          } else if (errorMessage.includes('Attendance not found')) {
            toast.error('Attendance not found', toastConfig.error);
            router.push('/manager-dashboard/department/hr/Attendance');
          } else {
            toast.error(errorMessage || 'Failed to fetch data', toastConfig.error);
            router.push('/manager-dashboard/department/hr/Attendance');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      fetchData();
    } else {
      toast.error('Invalid attendance ID', toastConfig.error);
      router.push('/manager-dashboard/department/hr/Attendance');
    }

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const role = currentUser.role;
  const dept = currentUser.department || '';
  const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource') || dept.includes('human-resources');
  const isAuthorized = role === 'admin' || role === 'superadmin' || ((role === 'manager' || role === 'subadmin') && isHR);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors', toastConfig.error);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to edit attendance', toastConfig.error);
      router.push('/Login/Signin');
      return;
    }

    setIsSubmitting(true);

    try {
      const checkInTime = formData.checkIn ? `${formData.date}T${formData.checkIn}:00.000Z` : '';
      const checkOutTime = formData.checkOut ? `${formData.date}T${formData.checkOut}:00.000Z` : undefined;

      const payload: any = {
        date: formData.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: formData.status,
        notes: formData.notes || '',
        environment: formData.environment,
      };

      // Only include uniqueId if provided
      if (formData.uniqueId) {
        payload.uniqueId = formData.uniqueId;
      }

      if (formData.status === 'on-leave') {
        payload.isApproved = formData.isApproved;
      } else if (formData.environment === 'virtual') {
        payload.sleepDuration = formData.sleepDuration;
        const parsedCursorMovements = JSON.parse(formData.cursorMovements);
        if (parsedCursorMovements.length > 0) {
          payload.cursorMovements = parsedCursorMovements; // Send as array
        }
      } else if (formData.environment === 'physical') {
        payload.biometricScanId = formData.biometricScanId;
      }

      // Add overtime and holiday fields if present
      if (formData.overtimeHours !== undefined) {
        payload.overtimeHours = formData.overtimeHours;
      }
      if (formData.workedOnHoliday !== undefined) {
        payload.workedOnHoliday = formData.workedOnHoliday;
        if (formData.workedOnHoliday) {
          payload.holidayType = formData.holidayType;
        }
      }

      console.log('FormData before submit:', formData);
      console.log('Submitting payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${API_URL}/api/attendance/${id}/admin`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('Server response:', data);
      if (!res.ok) {
        throw new Error(data.message || `HTTP error ${res.status}`);
      }

      toast.success('Attendance updated successfully!', toastConfig.success);
      router.push('/manager-dashboard/department/hr/Attendance');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('EditAttendance submit error:', errorMessage);
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('login')) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.', toastConfig.error);
        router.push('/Login/Signin');
      } else if (errorMessage.includes('Only admins')) {
        toast.error('Only admins can edit attendances', toastConfig.error);
        router.push('/manager-dashboard/department/hr/Attendance');
      } else if (errorMessage.includes('Attendance not found')) {
        toast.error('Attendance not found', toastConfig.error);
        router.push('/manager-dashboard/department/hr/Attendance');
      } else {
        toast.error(errorMessage || 'Failed to update attendance', toastConfig.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target as HTMLInputElement & { type: string };
    let updatedFormData = { ...formData };

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updatedFormData = { ...formData, [name]: checked };
      if (name === 'workedOnHoliday') {
        updatedFormData.holidayType = checked ? formData.holidayType : '';
      }
    } else {
      updatedFormData = { ...formData, [name]: value };
      if (name === 'sleepDuration') {
        const numValue = value ? parseInt(value, 10) : 0;
        updatedFormData = { ...updatedFormData, [name]: numValue };
      } else if (name === 'isApproved') {
        updatedFormData = { ...updatedFormData, [name]: value === 'true' };
      } else if (name === 'overtimeHours') {
        const numValue = value ? parseFloat(value) : 0;
        updatedFormData = { ...updatedFormData, [name]: numValue };
      } else if (name === 'status' && value === 'on-leave') {
        updatedFormData = {
          ...updatedFormData,
          cursorMovements: '[]',
          sleepDuration: 0,
          biometricScanId: '',
          overtimeHours: 0,
          workedOnHoliday: false,
          holidayType: '',
        };
      }
    }

    setFormData(updatedFormData);
  };

  const selectedUser = filteredUsers.find(user => user.uniqueId === formData.uniqueId || user._id === formData.uniqueId);
  const selectedUniqueId = selectedUser?.uniqueId || 'N/A';

  if (!isAuthorized && !isLoading) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6 min-h-screen">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-6">You lack the required permissions (HR Manager or Admin) to edit this attendance record.</p>
            <Link href="/manager-dashboard/department/hr/Attendance" className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 min-h-screen">
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/manager-dashboard/department/hr/Attendance"
                className="flex items-center text-white/90 hover:text-white transition-colors"
              >
                <span className="mr-2">
                  <FiArrowLeft />
                </span>
                Back to Attendances
              </Link>
              <div className="bg-white/10 px-3 py-1 rounded-full text-sm">
                Admin Editing
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Edit Attendance (Admin)</h1>
            <p className="text-emerald-100 mt-1">Update attendance details, status, and approval</p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2 text-blue-600">
                      <FiUser />
                    </span>
                    Employee (Optional)
                  </label>
                  <select
                    name="uniqueId"
                    value={formData.uniqueId}
                    onChange={handleChange}
                    className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.uniqueId ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select an employee by Unique ID (optional)</option>
                    {filteredUsers.length > 0 ? (
                      filteredUsers
                        .map((user) => (
                          <option key={user._id} value={user.uniqueId || user._id}>
                            {user.uniqueId ? `${user.uniqueId} - ${user.name}` : `${user.name} (No Unique ID)`}
                          </option>
                        ))
                    ) : (
                      <option value="" disabled>
                        No users available
                      </option>
                    )}
                  </select>
                  {formData.uniqueId && (
                    <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded border border-blue-100 flex flex-col gap-1">
                      <p>Selected: <span className="font-semibold text-blue-900">{selectedUser?.name || 'Unknown'}</span> ({selectedUniqueId})</p>
                      <p className="text-xs">Role: {selectedUser?.role || 'N/A'} | Dept: {selectedUser?.department || 'N/A'} | Service: {selectedUser?.service || 'N/A'}</p>
                    </div>
                  )}
                  {formErrors.uniqueId && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.uniqueId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiGlobe />
                      </span>
                      Environment *
                    </label>
                    <select
                      name="environment"
                      value={formData.environment}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.environment ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                        }`}
                    >
                      <option value="virtual">Virtual</option>
                      <option value="physical">Physical</option>
                    </select>
                    {formErrors.environment && <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.environment}
                    </p>}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiCalendar />
                      </span>
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.date ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                        }`}
                    />
                    {formErrors.date && <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.date}
                    </p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiClock />
                      </span>
                      Check In Time *
                    </label>
                    <input
                      type="time"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.checkIn ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                        }`}
                    />
                    {formErrors.checkIn && <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.checkIn}
                    </p>}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiCheckCircle />
                      </span>
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.status ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                        }`}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="on-leave">On Leave</option>
                      <option value="late">Late</option>
                      <option value="half-day">Half Day</option>
                    </select>
                    {formErrors.status && <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.status}
                    </p>}
                  </div>
                </div>

                {formData.status === 'on-leave' && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiCheckCircle />
                      </span>
                      Leave Approval *
                    </label>
                    <select
                      name="isApproved"
                      value={formData.isApproved ? 'true' : 'false'}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.isApproved ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                        }`}
                    >
                      <option value="true">Approved</option>
                      <option value="false">Rejected</option>
                    </select>
                    {formErrors.isApproved && <p className="text-red-500 text-sm mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {formErrors.isApproved}
                    </p>}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <span className="mr-2 text-blue-600">
                        <FiClock />
                      </span>
                      Check Out Time
                    </label>
                    <input
                      type="time"
                      name="checkOut"
                      value={formData.checkOut || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {formData.status === 'present' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2 text-blue-600">
                          <FiClock />
                        </span>
                        Overtime Hours (0-8)
                      </label>
                      <input
                        type="number"
                        name="overtimeHours"
                        value={formData.overtimeHours ?? ''}
                        onChange={handleChange}
                        min="0"
                        max="8"
                        step="0.5"
                        className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.overtimeHours ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                          }`}
                        placeholder="e.g., 2.5"
                      />
                      {formErrors.overtimeHours && <p className="text-red-500 text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {formErrors.overtimeHours}
                      </p>}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday Override</label>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          name="workedOnHoliday"
                          checked={formData.workedOnHoliday ?? false}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        Worked on Holiday?
                      </label>
                      {formData.workedOnHoliday && (
                        <select
                          name="holidayType"
                          value={formData.holidayType ?? ''}
                          onChange={handleChange}
                          className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.holidayType ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                            }`}
                        >
                          <option value="">Auto-detect</option>
                          <option value="government">Government</option>
                          <option value="regular">Regular</option>
                        </select>
                      )}
                      {formErrors.holidayType && <p className="text-red-500 text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {formErrors.holidayType}
                      </p>}
                    </div>
                  </div>
                )}

                {formData.environment === 'virtual' && formData.status !== 'on-leave' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2 text-blue-600">
                          <FiMonitor />
                        </span>
                        Sleep Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        name="sleepDuration"
                        value={formData.sleepDuration ?? ''}
                        onChange={handleChange}
                        min="0"
                        className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.sleepDuration ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                          }`}
                        placeholder="e.g., 300"
                      />
                      {formErrors.sleepDuration && <p className="text-red-500 text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {formErrors.sleepDuration}
                      </p>}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2 text-blue-600">
                          <FiMonitor />
                        </span>
                        Cursor Movements (JSON array of ISO dates) *
                      </label>
                      <textarea
                        name="cursorMovements"
                        value={formData.cursorMovements}
                        onChange={handleChange}
                        rows={3}
                        className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${formErrors.cursorMovements ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                          }`}
                        placeholder='e.g., ["2025-10-07T10:00:00Z", "2025-10-07T11:00:00Z"]'
                      />
                      <p className="text-sm text-gray-500 mt-1">Provide a valid JSON array of ISO date strings (e.g., ["2025-10-07T10:00:00Z"]). Must not be empty for virtual environment.</p>
                      {formErrors.cursorMovements && <p className="text-red-500 text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {formErrors.cursorMovements}
                      </p>}
                    </div>
                  </div>
                )}

                {formData.environment === 'physical' && formData.status !== 'on-leave' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2 text-blue-600">
                          <MdFingerprint />
                        </span>
                        Biometric Scan ID {formData.status === 'present' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        name="biometricScanId"
                        value={formData.biometricScanId}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.biometricScanId ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                          }`}
                        placeholder="e.g., BIO-123456789"
                      />
                      {formErrors.biometricScanId && <p className="text-red-500 text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {formErrors.biometricScanId}
                      </p>}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <span className="mr-2 text-blue-600">
                      <FiEdit3 />
                    </span>
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full p-3 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${formErrors.notes ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                      }`}
                    placeholder="Enter any additional notes (optional)"
                  />
                  {formErrors.notes && <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {formErrors.notes}
                  </p>}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/manager-dashboard/department/hr/Attendance')}
                    className="px-6 py-3 mr-4 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg flex items-center ${isSubmitDisabled || Object.keys(formErrors).length > 0 ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    disabled={isSubmitDisabled || Object.keys(formErrors).length > 0}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Update Record'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}