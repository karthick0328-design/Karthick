'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AttendanceRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        uniqueId: string;
        department: string;
        role: string;
    };
    date: string;
    status: string;
    environment: string;
    checkIn?: string;
    checkOut?: string;
    isApproved: boolean;
    notes?: string;
    overtimeHours?: number;
    workedOnHoliday?: boolean;
    holidayType?: string;
}

interface ServiceTeamAttendanceProps {
    serviceName: string;
}

const ServiceTeamAttendance: React.FC<ServiceTeamAttendanceProps> = ({ serviceName }) => {
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchAttendances();
    }, [page, statusFilter, serviceName]);

    const fetchAttendances = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/attendance/service`, {
                params: {
                    page,
                    limit,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    uniqueId: searchTerm || undefined,
                    service: serviceName,
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAttendances(response.data.data);
                setTotalPages(response.data.pagination.pages);
            }
        } catch (error: any) {
            console.error('Error fetching service attendance:', error);
            // Don't show toast for 403 here as it might be expected for some users initially
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchAttendances();
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/attendance/service/export`, {
                params: {
                    uniqueId: searchTerm || undefined,
                },
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            const safeServiceName = serviceName.replace(/[^a-z0-9]/gi, '_');
            link.setAttribute('download', `${safeServiceName}_Attendance_${new Date().toISOString().split('T')[0]}.csv`);

            // Trigger download without appending to body
            link.style.display = 'none';
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success('Attendance report exported successfully');
        } catch (error) {
            toast.error('Failed to export attendance report');
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'present': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'late': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'half-day': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'on-leave': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'absent': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-indigo-600" size={20} />
                        Team Attendance
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Monitoring {serviceName} department personnel</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                        />
                    </form>

                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm disabled:opacity-50"
                        title="Export CSV"
                    >
                        <Download size={18} />
                    </button>

                    <button
                        onClick={() => fetchAttendances()}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filters Tab */}
            <div className="px-6 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto no-scrollbar">
                {['all', 'present', 'absent', 'late', 'on-leave', 'half-day'].map((status) => (
                    <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setPage(1); }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === status
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {loading && (
                    <div className="flex items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {!loading && attendances.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="text-slate-200" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No records found</h3>
                        <p className="text-sm text-slate-500 max-w-xs">There are no attendance records matching your current filters for this period.</p>
                    </div>
                )}

                {!loading && attendances.length > 0 && (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 sticky top-0 z-10 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Check In/Out</th>
                                <th className="px-6 py-4">Environment</th>
                                <th className="px-8 py-4 text-right">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {attendances.map((record) => (
                                <tr key={record._id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                {record.userId.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm leading-tight">{record.userId.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{record.userId.uniqueId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                            <Calendar size={14} className="text-slate-400" />
                                            {new Date(record.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                <Clock size={10} className="text-emerald-500" />
                                                {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <div className="w-2.5 h-2.5" />
                                                {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${record.environment === 'virtual' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                            {record.environment}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        {record.isApproved ? (
                                            <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold text-xs">
                                                <CheckCircle2 size={16} />
                                                Verified
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1.5 text-amber-500 font-bold text-xs text-opacity-80">
                                                <AlertCircle size={16} />
                                                Pending
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 text-slate-600 shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 text-slate-600 shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceTeamAttendance;
