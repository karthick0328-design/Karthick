'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Fingerprint, Monitor, AlertCircle, CheckCircle2, Loader2, MousePointer2 } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

interface UserInfo {
    id: string;
    uniqueId: string;
    name: string;
    role: string;
    phone?: string;
    service?: string;
    department?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const RealTimeAttendanceWidget = () => {
    const [mounted, setMounted] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [status, setStatus] = useState<'idle' | 'pending' | 'active' | 'failed' | 'completed'>('idle');
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastActivity, setLastActivity] = useState<Date | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Set mounted and get user info
    useEffect(() => {
        setMounted(true);
        setLastActivity(new Date());

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserInfo({
                    id: payload.id || payload._id,
                    uniqueId: payload.uniqueId,
                    name: payload.name,
                    role: payload.role,
                    phone: payload.phone,
                    service: payload.service,
                    department: payload.department,
                });

                // Initialize Socket using utility
                const socket = getSocket(token);
                socketRef.current = socket;

                const userId = payload.id || payload._id;

                socket.on(`attendance_approved_${userId}`, (data) => {
                    setStatus('active');
                    setAttendanceId(data.attendanceId);
                    toast.success('Attendance approved! Monitoring started.');
                });

                socket.on(`attendance_failed_${userId}`, (data) => {
                    setStatus('failed');
                    toast.error(data.message || 'Attendance monitoring failed.');
                    stopMonitoring();
                });

                return () => {
                    stopMonitoring();
                };
            } catch (e) {
                console.error('Failed to parse token', e);
            }
        }
    }, []);

    // Heartbeat tracker (Cursor movement)
    useEffect(() => {
        if (status === 'active') {
            const handleMouseMove = () => {
                setLastActivity(new Date());
            };

            window.addEventListener('mousemove', handleMouseMove);

            // Send heartbeat to server every 30 seconds if active
            heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            };
        }
    }, [status, attendanceId]);

    const sendHeartbeat = async () => {
        if (!attendanceId) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/attendance/heartbeat`, { attendanceId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Heartbeat failed', error);
        }
    };

    const stopMonitoring = () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };

    const handlePresentClick = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/attendance/request-attendance`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setStatus('pending');
                setAttendanceId(response.data.data._id);
                toast.success(response.data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send attendance request');
        } finally {
            setLoading(false);
        }
    };

    if (!userInfo) return null;

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
                <h3 className="text-xl font-bold flex items-center justify-center gap-2">
                    <Monitor className="w-6 h-6" />
                    Real-Time Attendance
                </h3>
                <p className="text-blue-100 text-sm mt-1">Virtual System Monitoring</p>
            </div>

            {/* Profile Section */}
            <div className="p-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-3 text-blue-600">
                        <Fingerprint className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">{userInfo.name}</h4>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1 border border-blue-100">
                        {userInfo.role.toUpperCase()}
                    </span>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-500 font-medium">Unique ID:</span>
                        <span className="text-gray-900 font-bold font-mono">{userInfo.uniqueId}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-500 font-medium">Phone:</span>
                        <span className="text-gray-900 font-bold">{userInfo.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-500 font-medium">Service:</span>
                        <span className="text-gray-900 font-bold">{userInfo.service || 'N/A'}</span>
                    </div>
                </div>

                {/* Action Button / Status */}
                <div className="space-y-4">
                    {status === 'idle' && (
                        <button
                            onClick={handlePresentClick}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Fingerprint className="w-5 h-5" />
                            )}
                            {loading ? 'Processing...' : 'Mark Present (Fingerprint Scan)'}
                        </button>
                    )}

                    {status === 'pending' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 text-amber-800">
                            <div className="bg-amber-100 p-2 rounded-lg animate-pulse">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Waiting for HR Approval</p>
                                <p className="text-xs text-amber-600">Please stay on this page...</p>
                            </div>
                        </div>
                    )}

                    {status === 'active' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-4 text-emerald-800">
                                <div className="bg-emerald-100 p-2 rounded-lg">
                                    <MousePointer2 className="w-6 h-6 animate-bounce" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-emerald-900 text-center ">Monitoring Active</p>
                                    <p className="text-xs text-emerald-600">Keep cursor active within this session.</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-emerald-100 flex justify-between items-center text-xs">
                                <span className="text-emerald-700">Last activity detected:</span>
                                <span className="font-mono text-emerald-800 font-bold">{lastActivity?.toLocaleTimeString()}</span>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 text-red-800">
                            <div className="bg-red-100 p-2 rounded-lg">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Attendance Failed</p>
                                <p className="text-xs text-red-600">Marked as absent due to inactivity.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Info */}
            <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 text-[10px] text-gray-500 border-t border-gray-100">
                <AlertCircle className="w-3 h-3" />
                Note: Inactivity for more than 5 minutes will result in automatic absence.
            </div>
        </div>
    );
};

export default RealTimeAttendanceWidget;
