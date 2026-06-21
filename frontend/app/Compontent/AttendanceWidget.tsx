'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Send, AlertCircle, CheckCircle2, Fingerprint, ChevronDown, Calendar, Bell } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import AttendanceCalendar from './AttendanceCalendar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AttendanceWidgetProps {
    onSuccess?: () => void;
    variant?: 'default' | 'card';
}

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({ onSuccess, variant = 'default' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [attendanceMode, setAttendanceMode] = useState<'virtual' | 'physical'>('physical');
    const [verificationMethod, setVerificationMethod] = useState<'biometric' | 'signature' | 'punch-card' | 'rfid-qr'>('biometric');
    const [verificationData, setVerificationData] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userMode, setUserMode] = useState<'virtual' | 'physical' | null>(null);
    const [requiredVerificationMethod, setRequiredVerificationMethod] = useState<string | null>(null);
    const [hasMarkedToday, setHasMarkedToday] = useState(false);
    const [isWaitingForHR, setIsWaitingForHR] = useState(false);
    const [isMonitoringActive, setIsMonitoringActive] = useState(false);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<{ name: string; uniqueId: string; role: string; phone: string } | null>(null);

    // New State for View Mode
    const [viewMode, setViewMode] = useState<'mark' | 'calendar'>('mark');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // Get user info from token
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const id = payload.id || payload._id;
                const mode = payload.attendanceMode || 'physical';
                const requiredMethod = payload.attendanceVerificationMethod || 'none';
                setUserMode(mode);
                setAttendanceMode(mode);
                if (requiredMethod !== 'none') {
                    setVerificationMethod(requiredMethod as any);
                    setRequiredVerificationMethod(requiredMethod);
                }
                setUserId(id);
                setUserInfo({
                    name: payload.name || 'N/A',
                    uniqueId: payload.uniqueId || 'N/A',
                    role: payload.role || 'N/A',
                    phone: payload.phone || 'N/A'
                });

                // Setup Socket for HR Approvals and Failures
                const socket = getSocket(token);

                socket.on(`attendance_approved_${id}`, (data: any) => {
                    toast.success('🎉 HR approved your attendance! Activity monitoring started.');
                    setAttendanceId(data.attendanceId);
                    setIsMonitoringActive(true);
                    setIsWaitingForHR(false);
                    setHasMarkedToday(true);
                });

                socket.on(`attendance_failed_${id}`, (data: any) => {
                    toast.error(`⚠️ ${data.message}`);
                    setIsMonitoringActive(false);
                    setHasMarkedToday(false);
                });

                return () => {
                    socket.off(`attendance_approved_${id}`);
                    socket.off(`attendance_failed_${id}`);
                };
            } catch (e) {
                console.error('Failed to decode token:', e);
            }
        }

        // Check if already marked attendance today
        checkTodayAttendance();
    }, []);

    // Mouse Movement Tracking
    useEffect(() => {
        if (!isMonitoringActive || !attendanceId) return;

        let lastMove = Date.now();
        const heartbeatInterval = 60000; // 1 minute heartbeat

        const handleMouseMove = () => {
            lastMove = Date.now();
        };

        const sendHeartbeat = async () => {
            const now = Date.now();
            // If mouse moved in last minute, send heartbeat
            if (now - lastMove < heartbeatInterval) {
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/attendance/heartbeat`,
                        { attendanceId },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (err) {
                    console.error('Heartbeat failed', err);
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        const interval = setInterval(sendHeartbeat, heartbeatInterval);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearInterval(interval);
        };
    }, [isMonitoringActive, attendanceId]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await axios.get(`${API_URL}/api/attendance/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    // Filter for active/relevant notifications if needed
                    setNotifications(response.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch notifications', err);
            }
        };
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const checkTodayAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const today = new Date().toISOString().split('T')[0];
            const response = await axios.get(`${API_URL}/api/attendance?date=${today}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                const record = response.data.data[0];
                setHasMarkedToday(true);

                // NEW: Resume monitoring if active or pending
                if (record.monitoringStatus === 'active') {
                    setAttendanceId(record._id);
                    setIsMonitoringActive(true);
                } else if (record.monitoringStatus === 'pending-approval') {
                    setIsWaitingForHR(true);
                }
            }
        } catch (err) {
            setHasMarkedToday(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Note: Mode enforcement is now advisory only
        // Users can select either mode for flexibility during testing
        if (userMode && attendanceMode !== userMode) {
            // Just show a warning, don't block
            console.warn(`Note: User is configured for ${userMode} but selecting ${attendanceMode}`);
        }

        // Build payload
        const payload: any = {
            status: 'present',
            checkIn: new Date().toISOString(),
            environment: attendanceMode,
            notes: notes.trim() || undefined,
        };

        // Add environment-specific data
        if (attendanceMode === 'virtual') {
            // For virtual - we'd need cursor movement data from monitoring
            payload.cursorMovements = [new Date().toISOString()]; // Placeholder
        } else {
            // Physical attendance
            payload.verificationMethod = verificationMethod;

            if (!verificationData.trim()) {
                setError('Please provide verification data');
                return;
            }

            if (verificationMethod === 'biometric') {
                if (!/^BIO-\d{9}$/.test(verificationData)) {
                    setError('Biometric ID must be in format BIO-XXXXXXXXX');
                    return;
                }
                payload.biometricScanId = verificationData;
            }
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const token = localStorage.getItem('token');

            // NEW: Use Request-Attendance for Virtual Mode (HR Approval Flow)
            const endpoint = attendanceMode === 'virtual'
                ? `${API_URL}/api/attendance/request-attendance`
                : `${API_URL}/api/attendance/self`;

            const response = await axios.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                if (attendanceMode === 'virtual') {
                    const record = response.data.data;
                    toast.success('Attendance marked! Real-time monitoring active.');
                    setAttendanceId(record._id);
                    setIsMonitoringActive(true);
                    setHasMarkedToday(true);
                    setIsOpen(false);
                    if (onSuccess) onSuccess();
                } else {
                    toast.success('Attendance marked successfully');
                    setIsOpen(false);
                    setHasMarkedToday(true);
                    if (onSuccess) onSuccess();
                }
            } else {
                setError(response.data.message || 'Failed to mark attendance');
            }
        } catch (err: any) {
            console.error('Attendance error:', err);
            setError(err.response?.data?.message || 'Failed to mark attendance. Have you already marked today?');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getModeIcon = () => {
        if (attendanceMode === 'virtual') {
            return <Clock size={18} />;
        }
        return <Fingerprint size={18} />;
    };

    const getPlaceholder = () => {
        return 'BIO-123456789';
    };

    return (
        <div className="relative">
            {/* Trigger */}
            {variant === 'card' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    suppressHydrationWarning
                    className={`w-full group relative overflow-hidden text-left p-8 rounded-3xl transition-all duration-300 border ${hasMarkedToday
                        ? 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-100/50'
                        : isWaitingForHR
                            ? 'bg-amber-50 border-amber-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/50'
                            : 'bg-white border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50'
                        }`}
                >
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${hasMarkedToday
                            ? 'bg-green-500 text-white'
                            : isWaitingForHR
                                ? 'bg-amber-500 text-white'
                                : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                            }`}>
                            {hasMarkedToday ? <CheckCircle2 size={32} /> : isWaitingForHR ? <Clock size={32} /> : <Fingerprint size={32} />}
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">
                                {isWaitingForHR ? 'Approval Pending' : hasMarkedToday ? 'Present Today' : 'Mark Attendance'}
                            </h3>
                            <p className="text-gray-500 font-medium">
                                {isWaitingForHR
                                    ? 'Waiting for HR confirmation'
                                    : hasMarkedToday
                                        ? 'Your attendance has been recorded'
                                        : 'Check-in for the day'}
                            </p>
                        </div>
                    </div>
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    // disabled={hasMarkedToday || isWaitingForHR}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium ${hasMarkedToday || isWaitingForHR
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                        }`}
                >
                    <Clock size={18} />
                    <span>
                        {isWaitingForHR ? 'Waiting for HR Approval...' :
                            hasMarkedToday ? (isMonitoringActive ? 'Monitoring Active (Move Cursor)' : 'Attendance Marked ✓') : 'Mark Attendance'}
                    </span>
                </button>
            )}

            {/* In-page Active Monitoring Warning (when widget is visible in dashboard) */}
            {isMonitoringActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 text-rose-700 shadow-sm animate-pulse"
                >
                    <div className="p-2 bg-rose-100 rounded-xl">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm tracking-tight uppercase">Virtual Attendance Warning</p>
                        <p className="text-xs font-medium opacity-80">Warning: move the cursor otherwise absent will be marked (30min limit)</p>
                    </div>
                </motion.div>
            )}

            {/* Full Screen Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-white flex overflow-hidden"
                    >
                        {/* Decorative Left Panel */}
                        <div className="hidden lg:flex w-1/3 bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-12 flex-col justify-between relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                                        <Fingerprint size={32} className="text-white" />
                                    </div>
                                    <span className="text-lg font-bold tracking-widest uppercase opacity-80">Attendance</span>
                                </div>
                                <h2 className="text-5xl font-black leading-tight mb-4">
                                    Good {isMounted ? (new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening') : 'Day'},<br />
                                    <span className="text-emerald-300">{userInfo?.name?.split(' ')[0] || 'Member'}!</span>
                                </h2>
                                <p className="text-emerald-100 text-lg max-w-md mt-4 leading-relaxed">
                                    Please verify your identity and mark your attendance for the day. Consistent records ensure seamless payroll processing.
                                </p>
                            </div>

                            {/* User Mini Card */}
                            {userInfo && (
                                <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white text-emerald-700 rounded-full flex items-center justify-center font-bold text-xl">
                                            {userInfo.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg leading-none">{userInfo.name}</p>
                                            <p className="text-emerald-200 text-sm mt-1">{userInfo.role}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-emerald-300 text-xs uppercase tracking-wider mb-1">ID Number</p>
                                            <p className="font-mono font-medium">{userInfo.uniqueId}</p>
                                        </div>
                                        <div>
                                            <p className="text-emerald-300 text-xs uppercase tracking-wider mb-1">Contact</p>
                                            <p className="font-mono font-medium">{userInfo.phone}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Form Content */}
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 custom-scrollbar">
                            <div className="max-w-2xl mx-auto min-h-screen flex flex-col justify-center p-8 lg:p-12 relative">
                                <button
                                    onClick={() => { setIsOpen(false); setViewMode('mark'); }}
                                    suppressHydrationWarning
                                    className="absolute top-8 right-8 p-2 bg-gray-100/50 hover:bg-gray-200/50 rounded-full text-gray-500 hover:text-gray-800 transition-colors z-20"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mb-8 lg:hidden">
                                    <h2 className="text-3xl font-black text-gray-900 mb-2">Mark Attendance</h2>
                                    <p className="text-gray-500">Verify your details below.</p>
                                </div>

                                {notifications.length > 0 && notifications.some(n => n.type === 'holiday_alert') && (
                                    <div className="mb-6 space-y-3">
                                        {notifications.filter(n => n.type === 'holiday_alert').map(notification => (
                                            <motion.div
                                                key={notification._id}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                                    <Bell size={48} className="text-indigo-900" />
                                                </div>
                                                <div className="p-3 bg-white shadow-sm rounded-xl text-indigo-600 relative z-10">
                                                    <Bell size={20} className="fill-indigo-100" />
                                                </div>
                                                <div className="relative z-10">
                                                    <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wide opacity-80 mb-1">{notification.title}</h4>
                                                    <p className="text-gray-800 font-medium">{notification.message}</p>
                                                    <p className="text-indigo-400 text-xs mt-2 font-medium">{isMounted ? new Date(notification.createdAt).toLocaleDateString() : ''}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100">
                                    {viewMode === 'calendar' ? (
                                        <AttendanceCalendar uniqueId={userInfo?.uniqueId || ''} onClose={() => setViewMode('mark')} />
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-8">
                                            {/* Header with Switcher */}
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-bold text-gray-800">Todays Check-in</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode('calendar')}
                                                    className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1 hover:underline"
                                                >
                                                    <Calendar size={16} />
                                                    View History
                                                </button>
                                            </div>

                                            {/* Attendance Mode Selection */}
                                            <div className="space-y-4">
                                                <label className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                    Select Mode
                                                </label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttendanceMode('physical')}
                                                        disabled={!!requiredVerificationMethod && requiredVerificationMethod !== 'none'}
                                                        className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group ${attendanceMode === 'physical'
                                                            ? 'border-emerald-500 bg-emerald-50/50'
                                                            : 'border-gray-100 bg-white hover:border-emerald-200'
                                                            } ${!!requiredVerificationMethod && requiredVerificationMethod !== 'none' ? 'opacity-75' : ''}`}
                                                    >
                                                        <div className={`mb-3 ${attendanceMode === 'physical' ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}>
                                                            <Fingerprint size={28} />
                                                        </div>
                                                        <div className="font-bold text-gray-900">Physical Check-in</div>
                                                        <div className="text-xs text-gray-500 mt-1">On-premise verification</div>
                                                        {attendanceMode === 'physical' && (
                                                            <div className="absolute top-4 right-4 text-emerald-500">
                                                                <CheckCircle2 size={20} />
                                                            </div>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttendanceMode('virtual')}
                                                        disabled={!!requiredVerificationMethod && requiredVerificationMethod !== 'none'}
                                                        className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group ${attendanceMode === 'virtual'
                                                            ? 'border-blue-500 bg-blue-50/50'
                                                            : 'border-gray-100 bg-white hover:border-blue-200'
                                                            } ${!!requiredVerificationMethod && requiredVerificationMethod !== 'none' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                                    >
                                                        <div className={`mb-3 ${attendanceMode === 'virtual' ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>
                                                            <Clock size={28} />
                                                        </div>
                                                        <div className="font-bold text-gray-900">Virtual / Remote</div>
                                                        <div className="text-xs text-gray-500 mt-1">Work from home</div>
                                                        {attendanceMode === 'virtual' && (
                                                            <div className="absolute top-4 right-4 text-blue-500">
                                                                <CheckCircle2 size={20} />
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                                {userMode && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <AlertCircle size={14} />
                                                        <span>Your default configuration is set to <span className="font-bold text-gray-700">{userMode}</span></span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Physical: Verification Method */}
                                            {attendanceMode === 'physical' && (
                                                <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                                    <div className="space-y-3">
                                                        <label className="text-sm font-bold text-gray-900 uppercase tracking-widest">Verification Method</label>
                                                        <div className="relative">
                                                            <select
                                                                value={verificationMethod}
                                                                onChange={(e) => setVerificationMethod(e.target.value as any)}
                                                                disabled={!!requiredVerificationMethod && requiredVerificationMethod !== 'none'}
                                                                className={`w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all appearance-none font-medium text-gray-700 ${!!requiredVerificationMethod && requiredVerificationMethod !== 'none' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                            >
                                                                <option value="biometric">Biometric Scan</option>
                                                            </select>
                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                                <ChevronDown size={16} />
                                                            </div>
                                                        </div>
                                                        {requiredVerificationMethod && (
                                                            <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold uppercase tracking-tight bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                <AlertCircle size={12} />
                                                                <span>Strict Policy: You must use {requiredVerificationMethod.replace('-', ' ')}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                                            {verificationMethod === 'biometric' && 'ENTER BIOMETRIC ID'}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={verificationData}
                                                                onChange={(e) => setVerificationData(e.target.value)}
                                                                placeholder={getPlaceholder()}
                                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-mono text-gray-800 placeholder:text-gray-300 font-medium"
                                                                required
                                                            />
                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                                                                {getModeIcon()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}



                                            {error && (
                                                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 animate-in slide-in-from-top-2">
                                                    <AlertCircle size={20} className="flex-shrink-0" />
                                                    <span>{error}</span>
                                                </div>
                                            )}

                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsOpen(false)}
                                                    suppressHydrationWarning
                                                    className="px-8 py-4 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700 hover:border-gray-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    suppressHydrationWarning
                                                    className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-[1.01] hover:shadow-emerald-300/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                >
                                                    {isSubmitting ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={20} />
                                                    )}
                                                    <span>{isSubmitting ? 'Verifying...' : attendanceMode === 'virtual' ? 'Start Virtual Session' : 'Confirm Attendance'}</span>
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AttendanceWidget;
