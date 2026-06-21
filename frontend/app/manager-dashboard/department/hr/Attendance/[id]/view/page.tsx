'use client';

import { useState, useEffect } from 'react';
import axios, { AxiosError, isAxiosError } from 'axios'; // Import isAxiosError
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';
import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)

// Define TypeScript interfaces
interface User {
  _id: string;
  uniqueId: string;
  name: string;
  employeeType?: string;
  role: string;
  department?: string;
  isActive: boolean;
  dailySalaryRate?: number;
  service?: string;
  profileImage?: string;
}

interface Attendance {
  _id: string;
  userId: User;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: string;
  environment: 'virtual' | 'physical';
  sleepDuration?: number; // minutes, for virtual
  cursorMovements?: string[]; // ISO dates for virtual
  virtualVerificationImage?: string; // photo captured during attendance
  biometricScanId?: string; // for physical
  isApproved: boolean;
  approvedBy?: User;
  notes?: string;
  salaryDeductionAmount: number;
  overtimeHours?: number;
  workedOnHoliday?: boolean;
  holidayType?: 'government' | 'regular';
  employeeName?: string;
  employeeUniqueId?: string;
  employeeRole?: string;
  employeeService?: string;
  createdAt: string;
  updatedAt: string;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

const ViewAttendancePage = () => {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string | null; role: string | null; department: string | null }>({ id: null, role: null, department: null });
  const [activeTab, setActiveTab] = useState('details');
  const router = useRouter();
  const params = useParams();
  const attendanceId = params.id as string;

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

  // Fetch attendance details
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please log in', { duration: 4000 });
          router.push('/Login/Signin');
          return;
        }

        const res = await api.get(`/api/attendance/${attendanceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setAttendance({
            ...res.data.data,
            status: res.data.data.status || 'present',
            environment: res.data.data.environment || 'physical',
            salaryDeductionAmount: res.data.data.salaryDeductionAmount || 0,
            overtimeHours: res.data.data.overtimeHours || 0,
            workedOnHoliday: res.data.data.workedOnHoliday || false,
            holidayType: res.data.data.holidayType || undefined,
            approvedBy: res.data.data.approvedBy || undefined,
            userId: res.data.data.userId || {
              _id: '',
              name: 'Unknown',
              uniqueId: 'N/A',
              employeeType: 'N/A',
              role: 'N/A',
              department: 'N/A',
              isActive: false,
            },
          });
        } else {
          toast.error('Attendance not found', { duration: 4000 });
          router.push('/manager-dashboard/department/hr/Attendance');
        }
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message || 'Failed to fetch attendance';
          if (err.response?.status === 401) {
            toast.error('Session expired. Please log in again.', { duration: 4000 });
            router.push('/Login/Signin');
          } else if (err.response?.status === 403) {
            toast.error('Not authorized to view this attendance', { duration: 4000 });
            router.push('/manager-dashboard/department/hr/Attendance');
          } else {
            toast.error(message, { duration: 4000 });
            router.push('/manager-dashboard/department/hr/Attendance');
          }
        } else {
          toast.error('An unexpected error occurred', { duration: 4000 });
          router.push('/manager-dashboard/department/hr/Attendance');
        }
      } finally {
        setLoading(false);
      }
    };

    if (attendanceId && /^[0-9a-fA-F]{24}$/.test(attendanceId)) {
      fetchAttendance();
    } else {
      toast.error('Invalid attendance ID', { duration: 4000 });
      router.push('/manager-dashboard/department/hr/Attendance');
    }
  }, [router, attendanceId]);

  // Fetch users for reference (if needed for updates)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!attendance || typeof window === 'undefined') return;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Please log in', { duration: 4000 });
          return;
        }

        const res = await api.get('/api/auth/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setUsers(res.data.users || res.data.data || []);
        } else {
          toast.error('Failed to fetch users: ' + res.data.message, { duration: 4000 });
        }
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message || 'Failed to fetch users';
          if (err.response?.status === 403) {
            toast.error('Only admins can fetch users', { duration: 4000 });
          } else {
            toast.error(message, { duration: 4000 });
          }
        } else {
          toast.error('An unexpected error occurred', { duration: 4000 });
        }
      }
    };

    if (attendance) {
      fetchUsers();
    }
  }, [attendance]);

  // Handle attendance status update
  const handleAttendanceStatusUpdate = async (status: string) => {
    if (!attendance || typeof window === 'undefined') return;

    setIsUpdatingAttendance(true);
    const previousAttendance = { ...attendance };
    setAttendance({ ...attendance, status });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in', { duration: 4000 });
        router.push('/Login/Signin');
        return;
      }

      const res = await api.put(`/api/attendance/${attendanceId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (res.data.success) {
        // Update local state with new data including recalculated deduction
        setAttendance({ ...res.data.data });
        toast.success('Attendance status updated successfully', { duration: 4000 });
      } else {
        throw new Error(res.data.message);
      }
    } catch (err: unknown) {
      setAttendance(previousAttendance);
      if (isAxiosError(err)) {
        const message = err.response?.data?.message || 'Failed to update attendance status';
        if (err.response?.status === 403) {
          toast.error('Only admins can update attendance status', { duration: 4000 });
        } else {
          toast.error(message, { duration: 4000 });
        }
      } else {
        toast.error('An unexpected error occurred', { duration: 4000 });
      }
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Handle approval update (only for on-leave)
  const handleApproveAttendance = async (isApproved: boolean) => {
    if (!attendance || typeof window === 'undefined' || attendance.status !== 'on-leave') return;

    setIsUpdatingAttendance(true);
    const previousAttendance = { ...attendance };
    setAttendance({ ...attendance, isApproved });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in', { duration: 4000 });
        router.push('/Login/Signin');
        return;
      }

      // Use updateAttendanceAdmin endpoint for both approve and reject
      const res = await api.put(`/api/attendance/${attendanceId}/admin`, { isApproved }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (res.data.success) {
        // Update local state with new data including recalculated deduction
        setAttendance({ ...res.data.data });
        toast.success(`Leave request ${isApproved ? 'approved' : 'rejected'} successfully`, { duration: 4000 });
      } else {
        throw new Error(res.data.message);
      }
    } catch (err: unknown) {
      setAttendance(previousAttendance);
      if (isAxiosError(err)) {
        const message = err.response?.data?.message || 'Failed to update approval status';
        if (err.response?.status === 403) {
          toast.error('Only admins can approve leave requests', { duration: 4000 });
        } else {
          toast.error(message, { duration: 4000 });
        }
      } else {
        toast.error('An unexpected error occurred', { duration: 4000 });
      }
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  const role = currentUser.role;
  const dept = currentUser.department || '';
  const isHR = dept.includes('human resources') || dept.includes('hr') || dept.includes('human-resource') || dept.includes('human-resources');
  const isAuthorized = role === 'admin' || role === 'superadmin' || ((role === 'manager' || role === 'subadmin') && isHR);
  const isAdmin = role === 'admin' || role === 'superadmin' || (role === 'subadmin' && isHR);

  // Calculate total hours
  const calculateTotalHours = () => {
    if (!attendance || !attendance.checkOut || !attendance.checkIn) return 'N/A';
    const checkIn = new Date(attendance.checkIn);
    const checkOut = new Date(attendance.checkOut);
    const diffInMs = checkOut.getTime() - checkIn.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours.toFixed(2) + ' hours';
  };

  // Get compliance status
  const getCompliance = () => {
    if (!attendance) return 'N/A';
    if (attendance.status === 'present') {
      const hoursStr = calculateTotalHours();
      if (hoursStr === 'N/A') return 'Incomplete';
      const hours = parseFloat(hoursStr.split(' ')[0]);
      if (!isNaN(hours) && Math.abs(hours - 8) < 1) return 'Full Day';
      return 'Partial';
    }
    if (attendance.status === 'half-day') return 'Half Day';
    if (attendance.status === 'on-leave') return 'On Leave';
    if (attendance.status === 'late') return 'Late';
    if (attendance.status === 'absent') return 'Non-Compliant';
    return 'Standard';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'late': return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'absent': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'half-day': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'on-leave': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  // Get environment color
  const getEnvironmentColor = (environment: string) => {
    return environment === 'virtual'
      ? 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
      : 'bg-green-500/10 text-green-700 border-green-200';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date with time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Check if attendance is today - dynamic
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  const isToday = attendance && new Date(attendance.date).toDateString() === today.toDateString();

  if (!isAuthorized && !loading) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 min-h-screen">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-6">Unauthorized access detected. Only HR Managers and Admins are permitted to view this attendance.</p>
            <Link href="/manager-dashboard/department/hr/Attendance" className="inline-flex items-center px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 min-h-screen">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            <p className="mt-4 text-slate-600">Loading attendance details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Attendance Not Found</h1>
            <Link href="/manager-dashboard/department/hr/Attendance" className="text-emerald-600 hover:text-emerald-800 font-medium">
              ← Back to Attendances
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dailyRate = attendance.userId.dailySalaryRate || 50;
  const overtimePay = attendance.overtimeHours && attendance.overtimeHours > 0 ? ((dailyRate / 8) * 1.5 * attendance.overtimeHours).toFixed(2) : '0.00';
  const holidayBonus = attendance.workedOnHoliday ? ((attendance.holidayType === 'government' ? dailyRate * 1.0 : dailyRate * 0.3).toFixed(2)) : '0.00';

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb and Title */}
          <br></br>
          <div className="flex items-center mb-6">
            <Link
              href="/manager-dashboard/department/hr/Attendance"
              className="flex items-center text-emerald-600 hover:text-emerald-800 transition-colors duration-200 mr-4 p-2 rounded-lg hover:bg-emerald-50 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>

              Back to Attendances
            </Link>

            <div className="h-6 w-px bg-slate-300 mx-4"></div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Attendance Details</h1>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 truncate">{attendance.employeeName || attendance.userId?.name || 'Unknown Employee'}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(attendance.status)}`}>
                    {attendance.status.replace('-', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-600">
                    Date: <span className={isToday ? "text-emerald-600 font-medium" : "text-slate-800"}>{formatDate(attendance.date)}</span>
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${attendance.isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {attendance.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEnvironmentColor(attendance.environment)}`}>
                    {attendance.environment.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                      {(attendance.employeeName || attendance.userId?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <span className="block h-3 w-3 rounded-full bg-emerald-400"></span>
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{attendance.employeeUniqueId || attendance.userId?.uniqueId || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{attendance.employeeRole || attendance.userId?.role || 'N/A'} - {attendance.userId?.department || 'N/A'} ({attendance.employeeService || attendance.userId?.service || 'N/A'})</p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link
                  href={`/manager-dashboard/department/hr/Attendance/${attendanceId}/edit`}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Edit Attendance
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors duration-200 ${activeTab === 'details' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                      Details
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Information</h3>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Role</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.employeeRole || attendance.userId?.role || 'N/A'}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Department</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.userId.department || 'N/A'}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Service</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.employeeService || attendance.userId?.service || 'N/A'}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Environment</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.environment.toUpperCase()}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Date</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(attendance.date)}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Check In</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{formatTime(attendance.checkIn)}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Check Out</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.checkOut ? formatTime(attendance.checkOut) : 'N/A'}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Total Hours</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">{calculateTotalHours()}</dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <dt className="text-sm font-medium text-slate-500">Status</dt>
                            <dd className="mt-1">
                              {isAdmin ? (
                                <select
                                  value={attendance.status}
                                  onChange={(e) => handleAttendanceStatusUpdate(e.target.value)}
                                  className="w-full border text-black border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                  disabled={isUpdatingAttendance}
                                >
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                  <option value="late">Late</option>
                                  <option value="half-day">Half Day</option>
                                  <option value="on-leave" disabled> On Leave (User Request Only)</option>
                                </select>
                              ) : (
                                <span className="text-sm font-medium text-slate-900">
                                  {attendance.status.replace('-', ' ')}
                                </span>
                              )}
                            </dd>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-lg sm:col-span-2">
                            <dt className="text-sm font-medium text-slate-500">Salary Deduction</dt>
                            <dd className="mt-1 text-sm font-medium text-slate-900">${attendance.salaryDeductionAmount.toFixed(2)}</dd>
                          </div>
                          {attendance.overtimeHours && attendance.overtimeHours > 0 && (
                            <div className="bg-slate-50 p-4 rounded-lg sm:col-span-2">
                              <dt className="text-sm font-medium text-slate-500">Overtime</dt>
                              <dd className="mt-1 text-sm font-medium text-emerald-600">${overtimePay}</dd>
                            </div>
                          )}
                          {attendance.workedOnHoliday && (
                            <div className="bg-slate-50 p-4 rounded-lg sm:col-span-2">
                              <dt className="text-sm font-medium text-slate-500">Holiday Bonus ({attendance.holidayType})</dt>
                              <dd className="mt-1 text-sm font-medium text-emerald-600">${holidayBonus}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Environment-Specific Details */}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Environment Details</h3>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          {attendance.environment === 'virtual' ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <dt className="text-sm font-medium text-slate-500">Sleep Duration</dt>
                                <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.sleepDuration || 0} minutes</dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-slate-500">Cursor Movements</dt>
                                <dd className="mt-1 text-sm font-medium text-slate-900">{attendance.cursorMovements ? attendance.cursorMovements.length : 0} events</dd>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <dt className="text-sm font-medium text-slate-500">Biometric Scan ID</dt>
                                <dd className="mt-1 text-sm font-medium text-slate-900 break-all">{attendance.biometricScanId || 'N/A'}</dd>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Identity Verification (Photo Comparison) */}
                      {attendance.environment === 'virtual' && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            Photo Verification
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Reference Profile Photo
                              </p>
                              <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 border-2 border-white shadow-inner flex items-center justify-center">
                                {attendance.userId.profileImage ? (
                                  <img
                                    src={validateURL(attendance.userId.profileImage)}
                                    alt="Profile Reference"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p className="text-xs text-slate-500">No profile photo on record</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Captured Verification Photo
                              </p>
                              <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-200 border-2 border-white shadow-inner flex items-center justify-center">
                                {attendance.virtualVerificationImage ? (
                                  <img
                                    src={validateURL(attendance.virtualVerificationImage)}
                                    alt="Captured Verification"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-xs text-slate-500">No verification photo captured</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-700 flex items-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              Please ensure the captured photo matches the reference profile photo before approving this attendance record.
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Approval {attendance.status === 'on-leave' ? '(Leave Request)' : '(Not Applicable)'}</h3>
                        <div className="bg-slate-50 p-4 rounded-lg">
                          {attendance.status === 'on-leave' ? (
                            <select
                              value={attendance.isApproved ? 'approved' : 'pending'}
                              onChange={(e) => handleApproveAttendance(e.target.value === 'approved')}
                              className="w-full border text-black border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                              disabled={isUpdatingAttendance || !isAdmin}
                            >
                              <option value="pending">Pending Approval</option>
                              <option value="approved">Approved</option>
                            </select>
                          ) : (
                            <p className="text-sm text-slate-600">Approval only applies to leave requests.</p>
                          )}
                          {!isAdmin && attendance.status === 'on-leave' && (
                            <p className="mt-2 text-sm text-slate-500">Only admins can approve leave requests.</p>
                          )}
                          {attendance.approvedBy && attendance.approvedBy.name && attendance.approvedBy.name !== 'Not Approved' && (
                            <p className="mt-2 text-sm text-slate-600">Approved by: {attendance.approvedBy.name}</p>
                          )}
                        </div>
                      </div>

                      {attendance.notes && (
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-4">Notes</h3>
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-900 whitespace-pre-wrap">{attendance.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Hours Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Hours Worked</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                      <span>Total Hours</span>
                      <span>{calculateTotalHours()}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700 ease-out"
                        style={{ width: attendance.checkOut ? '100%' : '50%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1"></div>
                      <div className="h-12 w-0.5 bg-slate-200 mt-1"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Created</p>
                      <p className="text-xs text-slate-500">{formatDateTime(attendance.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`h-3 w-3 rounded-full mt-1 ${attendance.isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Last Updated</p>
                      <p className="text-xs text-slate-500">{formatDateTime(attendance.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Record Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Compliance</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${getCompliance() === 'Full Day' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {getCompliance()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Role</span>
                    <span className="text-sm font-medium text-slate-900">{attendance.userId.role || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Department</span>
                    <span className="text-sm font-medium text-slate-900">{attendance.userId.department || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Environment</span>
                    <span className="text-sm font-medium text-slate-900">{attendance.environment.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Deduction</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${attendance.salaryDeductionAmount > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      ${attendance.salaryDeductionAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Last Updated</span>
                    <span className="text-sm font-medium text-slate-900">{formatDate(attendance.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAttendancePage;