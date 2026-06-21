'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    Users,
    Search,
    CheckCircle2,
    XCircle,
    Activity,
    Eye,
    Fingerprint,
    Calendar,
    MousePointer2,
    Clock,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface MonitoringRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        uniqueId: string;
        role: string;
        phone: string;
        department: string;
        service: string;
    };
    status: string;
    monitoringStatus: 'pending-approval' | 'active' | 'failed' | 'completed';
    checkIn: string;
    lastActivityAt: string;
    isHolidayWork: boolean;
    hrMarkedBy?: {
        name: string;
    };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const RealTimeMonitoringView = () => {
    const [data, setData] = useState<MonitoringRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchLiveMonitoring();

        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = getSocket(token);

        socket.on('attendance_started', (newData) => {
            toast.success(`Virtual attendance started for ${newData.name}`);
            fetchLiveMonitoring();
        });

        socket.on('attendance_update', () => {
            fetchLiveMonitoring();
        });

        return () => {
            socket.off('attendance_started');
            socket.off('attendance_update');
        };
    }, []);

    const fetchLiveMonitoring = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/attendance/live`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch live monitoring', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/api/attendance/approve-attendance/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                toast.success('Attendance marked successfully');
                fetchLiveMonitoring();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to approve attendance');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredData = data.filter(record =>
        record.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.userId.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = data.filter(r => r.monitoringStatus === 'pending-approval').length;
    const activeCount = data.filter(r => r.monitoringStatus === 'active').length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Activity className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading real-time data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Monitored</p>
                        <h4 className="text-2xl font-bold text-gray-900">{data.length}</h4>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-4">
                    <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-rose-600">Failed Sessions</p>
                        <h4 className="text-2xl font-bold text-gray-900">{data.filter(r => r.monitoringStatus === 'failed').length}</h4>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                        <Activity className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-600">Currently Active</p>
                        <h4 className="text-2xl font-bold text-gray-900">{activeCount}</h4>
                    </div>
                </div>
            </div>

            {/* Main Container */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Fingerprint className="w-6 h-6 text-indigo-600" />
                        <h3 className="text-xl font-bold text-gray-900">Real-Time Monitoring Lab</h3>
                    </div>

                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Employee Details</th>
                                <th className="px-6 py-4">Role & Dept</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Real-Time Tracking</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((record) => (
                                <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase">
                                                {record.userId.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{record.userId.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">{record.userId.uniqueId}</p>
                                                <p className="text-xs text-gray-400">{record.userId.phone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase">
                                                {record.userId.role}
                                            </span>
                                            <p className="text-xs font-medium text-gray-600">{record.userId.department || record.userId.service}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full w-fit border ${record.monitoringStatus === 'failed'
                                            ? 'text-rose-600 bg-rose-50 border-rose-100'
                                            : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                            }`}>
                                            {record.monitoringStatus === 'failed' ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                            {record.monitoringStatus === 'failed' ? 'Failed / Inactive' : 'Present & Working'}
                                        </span>
                                        {record.isHolidayWork && (
                                            <span className="mt-1 flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full w-fit">
                                                <Calendar className="w-3 h-3" />
                                                Holiday Duty
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        {record.monitoringStatus === 'active' ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <MousePointer2 className="w-4 h-4 animate-bounce" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">System Cursor Active</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Last Activity: {new Date(record.lastActivityAt).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-indigo-500 h-full w-3/4 animate-shimmer" style={{ backgroundSize: '1000px 100%', backgroundImage: 'linear-gradient(to right, #6366f1 8%, #818cf8 18%, #6366f1 33%)' }}></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-rose-400">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-[10px] font-medium italic ">Session terminated due to inactivity</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1 text-emerald-600">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[10px] font-bold">Auto-Verified</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <Users className="w-12 h-12 text-gray-200 mb-2" />
                                            <p className="text-gray-400 font-medium">No active monitoring sessions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RealTimeMonitoringView;
