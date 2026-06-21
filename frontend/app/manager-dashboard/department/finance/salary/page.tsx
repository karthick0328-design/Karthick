'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    DollarSign,
    CheckCircle,
    Clock,
    Search,
    FileText,
    Calendar,
    CreditCard,
    RefreshCw,
    Settings,
    Layers,
    Trash2,
    Plus,
    AlertCircle
} from 'lucide-react';
import io from 'socket.io-client';

// --- Types ---

interface UserSub {
    _id: string;
    name: string;
    uniqueId: string;
    department: string;
    service?: string;
    role: string;
    monthlySalaryRate: number;
}

interface AttendanceSubmission {
    _id: string;
    userId: UserSub;
    date: string;
    status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
    workedOnHoliday: boolean;
    holidayType?: string;
    financeProcessed: boolean;
}

interface SalaryRecord {
    _id: string;
    userId: UserSub;
    month: number;
    year: number;
    basicSalary: number;
    grossSalary: number;
    attendanceDeductions: number;
    totalIncrements: number;
    netSalary: number;
    status: 'pending' | 'processed' | 'credited';
    isGenerated: boolean;
}

interface DepartmentRate {
    _id: string;
    department: string;
    service?: string;
    role: string;
    monthlyRate: number;
}

// --- Components ---

const MetricCard = ({ title, value, icon, color, bgColor }: any) => (
    <div className={`${bgColor} p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
            </div>
            <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
                {icon}
            </div>
        </div>
    </div>
);

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        {children}
    </span>
);

export default function SalaryFinancialManagerPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    // Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'submissions' | 'processed' | 'credited'>('submissions');

    // Bank Details Modal States
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedBanking, setSelectedBanking] = useState<any>(null);
    const [isFetchingBank, setIsFetchingBank] = useState(false);
    const [currentCreditId, setCurrentCreditId] = useState<string | null>(null);
    const [hasVerifiedBank, setHasVerifiedBank] = useState(false);

    // Rate Management
    const [showRateModal, setShowRateModal] = useState(false);
    const [rates, setRates] = useState<DepartmentRate[]>([]);
    const [rateLoading, setRateLoading] = useState(false);
    const [rateForm, setRateForm] = useState({
        department: '', // Empty for Global/All
        service: '',
        role: 'employee',
        monthlyRate: 0
    });

    const DEPARTMENTS = ['Sales & Customer Services', 'Human Resources', 'Financial'];
    const SERVICES = ['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'Biochemistry', 'Molecular Biology'];
    const ROLES = ['head', 'manager', 'team manager', 'tl', 'employee'];

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/salaries';

    // Authentication and Socket Connection (runs once)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            const userRole = (decoded.role || '').toLowerCase();
            const userDept = (decoded.department || '').toLowerCase();

            if (userRole !== 'admin' &&
                ((userRole !== 'manager' && userRole !== 'employee') ||
                    (!userDept.includes('finance') && !userDept.includes('financial')))) {
                toast.error('Unauthorized access');
                router.push('/dashboard');
                return;
            }

            setCurrentUser(decoded);

            // Real-time updates - only create socket once
            const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling'], // Explicitly set transports
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });

            socket.on('connect', () => {
                console.log('Socket connected to salary dashboard');
            });

            socket.on('attendance_submitted_to_finance', () => {
                toast('New attendance data submitted from HR!', { icon: '📝' });
                const currentToken = localStorage.getItem('token');
                if (currentToken) fetchData(currentToken);
            });

            socket.on('salary_processed', () => {
                const currentToken = localStorage.getItem('token');
                if (currentToken) fetchData(currentToken);
            });

            socket.on('salary_credited', () => {
                const currentToken = localStorage.getItem('token');
                if (currentToken) fetchData(currentToken);
            });

            socket.on('disconnect', () => {
                console.log('Socket disconnected from salary dashboard');
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            return () => {
                socket.removeAllListeners();
                socket.disconnect();
            };
        } catch (err) {
            console.error('Auth error:', err);
            router.push('/Login/Signin');
        }
    }, []); // Only run once on mount

    // Data Fetching (runs when month/year changes)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && currentUser) {
            fetchData(token);
        }
    }, [selectedMonth, selectedYear, currentUser]);

    const fetchData = async (token: string) => {
        setLoading(true);
        try {
            const fetchOptions = {
                mode: 'cors' as const,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            };

            // Fetch submissions
            const subRes = await fetch(`${API_BASE}/finance/submissions?month=${selectedMonth}&year=${selectedYear}`, fetchOptions)
                .catch(err => {
                    console.error('[Salary] Fetch submissions failure:', err);
                    throw err;
                });

            if (subRes.ok) {
                const subData = await subRes.json();
                if (subData.success) setSubmissions(subData.data || []);
            } else {
                console.error(`[Salary] Submissions API error: ${subRes.status}`);
            }

            // Fetch salaries
            const salRes = await fetch(`${API_BASE}?month=${selectedMonth}&year=${selectedYear}`, fetchOptions)
                .catch(err => {
                    console.error('[Salary] Fetch salaries failure:', err);
                    throw err;
                });

            if (salRes.ok) {
                const salData = await salRes.json();
                if (salData.success) {
                    const validSalaries = (salData.data || []).filter((s: any) => s && s.userId);
                    setSalaries(validSalaries);
                }
            } else {
                console.error(`[Salary] Salaries API error: ${salRes.status}`);
            }
        } catch (err: any) {
            console.error('[Salary] Comprehensive fetchData error:', err);
            toast.error('Network error loading salary data');
            setSubmissions([]);
            setSalaries([]);
        } finally {
            setLoading(false);
        }
    };

    const processSalary = async (uniqueId: string) => {
        setProcessing(uniqueId);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/process-salary`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    uniqueId,
                    month: selectedMonth,
                    year: selectedYear
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Salary] Process error (${res.status}):`, errText);
                throw new Error(`Process error: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                toast.success(`Salary processed for ${uniqueId}`);
                fetchData(token!);
            } else {
                toast.error(data.message || 'Processing failed');
            }
        } catch (err: any) {
            console.error('[Salary] Process salary error:', err);
            toast.error(err.message || 'Network error');
        } finally {
            setProcessing(null);
        }
    };

    const creditSalary = async (salaryId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/credit-salary/${salaryId}`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Salary] Credit error (${res.status}):`, errText);
                throw new Error(`Credit error: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                toast.success('Salary credited successfully!');
                setShowBankModal(false);
                fetchData(token!);
            } else {
                toast.error(data.message || 'Credit failed');
            }
        } catch (err: any) {
            console.error('[Salary] Credit salary error:', err);
            toast.error(err.message || 'Network error');
        }
    };

    const handleOpenBankModal = async (salary: SalaryRecord) => {
        setCurrentCreditId(salary._id);
        setIsFetchingBank(true);
        setShowBankModal(true);
        setHasVerifiedBank(false);
        setSelectedBanking(null);

        const token = localStorage.getItem('token');
        // Construct base URL for profiles
        const BASE_PROFILE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

        try {
            // Try Service Manager/Employee Profile first
            const res = await fetch(`${BASE_PROFILE_URL}/service-manager-profile/${salary.userId._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.data?.bankingDetails && data.data.bankingDetails.accountNumber) {
                setSelectedBanking(data.data.bankingDetails);
            } else {
                // Try HR profile
                const hrRes = await fetch(`${BASE_PROFILE_URL}/hr-profile/${salary.userId._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const hrData = await hrRes.json();
                if (hrData.success && hrData.data?.bankingDetails && hrData.data.bankingDetails.accountNumber) {
                    setSelectedBanking(hrData.data.bankingDetails);
                } else {
                    toast.error('No banking details configured for this employee.');
                }
            }
        } catch (err) {
            console.error('Bank fetch error:', err);
            toast.error('Failed to retrieve banking details');
        } finally {
            setIsFetchingBank(false);
        }
    };

    // --- Rate Management Functions ---

    const fetchRates = async () => {
        setRateLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/department-rates?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRates(data.data);
            } else {
                toast.error('Failed to load rates');
            }
        } catch (err) {
            console.error('Fetch rates error:', err);
        } finally {
            setRateLoading(false);
        }
    };

    const handleSaveRate = async () => {
        if (!rateForm.monthlyRate || rateForm.monthlyRate <= 0) {
            toast.error('Please enter a valid monthly rate');
            return;
        }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/department-rate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rateForm)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Rate saved successfully');
                fetchRates();
                // Reset form slightly but keep context
                setRateForm(prev => ({ ...prev, monthlyRate: 0 }));
            } else {
                toast.error(data.message || 'Failed to save rate');
            }
        } catch (err) {
            toast.error('Network error saving rate');
        }
    };

    const handleDeleteRate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rate configuration?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/department-rate/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Rate deleted');
                fetchRates();
            } else {
                toast.error(data.message || 'Failed to delete rate');
            }
        } catch (err) {
            toast.error('Network error deleting rate');
        }
    };

    // --- Derived Calculations ---

    const groupedSubmissions = useMemo(() => {
        const groups: { [key: string]: { user: UserSub; records: AttendanceSubmission[] } } = {};
        submissions.forEach(sub => {
            if (!groups[sub.userId.uniqueId]) {
                groups[sub.userId.uniqueId] = { user: sub.userId, records: [] };
            }
            groups[sub.userId.uniqueId].records.push(sub);
        });
        return Object.values(groups);
    }, [submissions]);

    const stats = useMemo(() => {
        const pendingToProcess = groupedSubmissions.filter(g => !salaries.find(s => s.userId?.uniqueId === g.user.uniqueId && s.status !== 'pending')).length;
        const pendingToCredit = salaries.filter(s => s.status === 'processed').length;
        const totalCredited = salaries.filter(s => s.status === 'credited').reduce((sum, s) => sum + s.netSalary, 0);

        return { pendingToProcess, pendingToCredit, totalCredited };
    }, [groupedSubmissions, salaries]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-800 border border-amber-200';
            case 'processed': return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'credited': return 'bg-green-100 text-green-800 border border-green-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && submissions.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-green-50">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                    <p className="text-lg text-gray-600 font-medium">Preparing Salary Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />

            {/* Sub-header for specific page actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="lg:hidden">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-indigo-600" />
                        Salaries
                    </h1>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 ml-auto">
                    {currentUser?.role === 'manager' && (
                        <button
                            onClick={() => { setShowRateModal(true); fetchRates(); }}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                        >
                            <Settings className="w-4 h-4" />
                            Rates
                        </button>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent font-bold text-slate-700 outline-none text-sm uppercase tracking-tighter"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-transparent font-bold text-slate-700 outline-none text-sm"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    title="To Process"
                    value={stats.pendingToProcess}
                    icon={<FileText className="w-8 h-8 text-amber-600" />}
                    color="text-amber-600" bgColor="bg-white"
                />
                <MetricCard
                    title="Awaiting Credit"
                    value={stats.pendingToCredit}
                    icon={<Clock className="w-8 h-8 text-blue-600" />}
                    color="text-blue-600" bgColor="bg-white"
                />
                <MetricCard
                    title="Total Credited"
                    value={`$${stats.totalCredited.toLocaleString()}`}
                    icon={<CheckCircle className="w-8 h-8 text-green-600" />}
                    color="text-green-600" bgColor="bg-white"
                />
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Tabs & Search */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                        {[
                            { id: 'submissions', label: 'HR Submissions', count: groupedSubmissions.length },
                            { id: 'processed', label: 'Processed', count: salaries.filter(s => s.status === 'processed').length },
                            { id: 'credited', label: 'Credited', count: salaries.filter(s => s.status === 'credited').length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-green-600 shadow-md' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label} <span className="ml-1 opacity-50">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search employee name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-scroll custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 z-10 bg-gray-50/80 shadow-sm border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Financials</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeTab === 'submissions' && groupedSubmissions.filter(g =>
                                g.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                g.user.uniqueId.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(group => {
                                const isProcessed = salaries.find(s => s.userId.uniqueId === group.user.uniqueId);
                                return (
                                    <tr key={group.user._id} className="hover:bg-green-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                    {group.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{group.user.name}</p>
                                                    <p className="text-sm text-gray-500">{group.user.uniqueId}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 capitalize">
                                                            {group.user.role}
                                                        </span>
                                                        {group.user.service && (
                                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                                {group.user.service}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-gray-700">{group.user.department}</p>
                                                <p className="text-xs text-gray-400">{group.records.length} days submitted by HR</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 w-fit">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Awaiting Process</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge color="bg-gray-100 text-gray-600">HR Review Complete</Badge>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {!isProcessed ? (
                                                <div className="flex items-center justify-end gap-2 text-amber-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm font-black uppercase tracking-widest text-[10px]">Awaiting Financial Processing</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2 text-green-600">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-bold">Processed</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {(activeTab === 'processed' || activeTab === 'credited') && salaries.filter(s =>
                                s.status === (activeTab === 'processed' ? 'processed' : 'credited') &&
                                (s.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.userId.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()))
                            ).map(salary => (
                                <tr key={salary._id} className="hover:bg-green-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white border-2 border-green-100 rounded-2xl flex items-center justify-center text-green-600 font-bold text-lg">
                                                {salary.userId.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{salary.userId.name}</p>
                                                <p className="text-sm text-gray-500">{salary.userId.uniqueId}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 capitalize">
                                                        {salary.userId.role}
                                                    </span>
                                                    {salary.userId.service && (
                                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                            {salary.userId.service}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                                            <div className="col-span-2 pb-2 border-b border-gray-100 mb-2">
                                                <p className="text-gray-400 mb-1 tracking-wider uppercase">Base Salary</p>
                                                <p className="text-gray-900 font-bold text-base">${(salary.userId.monthlySalaryRate || salary.basicSalary).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1 tracking-wider uppercase">Deductions</p>
                                                <p className="text-red-500 font-bold">-${salary.attendanceDeductions.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 mb-1 tracking-wider uppercase">Increments</p>
                                                <p className="text-emerald-500 font-bold">+${salary.totalIncrements.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-2xl font-black text-gray-900">${((salary.userId.monthlySalaryRate || salary.basicSalary) - salary.attendanceDeductions + salary.totalIncrements).toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">Net Payable</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge color={getStatusColor(salary.status)}>{salary.status.toUpperCase()}</Badge>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {salary.status === 'processed' ? (
                                            currentUser?.role === 'manager' ? (
                                                <button
                                                    onClick={() => handleOpenBankModal(salary)}
                                                    className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-xl hover:shadow-emerald-200 transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    Credit Now
                                                </button>
                                            ) : <span className="text-sm font-bold text-blue-500 block text-right">Ready for Credit</span>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-100 w-fit ml-auto">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-bold">Successfully Paid</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {(activeTab === 'submissions' && groupedSubmissions.length === 0) ||
                        ((activeTab === 'processed' || activeTab === 'credited') &&
                            salaries.filter(s => s.status === (activeTab === 'processed' ? 'processed' : 'credited')).length === 0) ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="p-6 bg-gray-50 rounded-full mb-4">
                                <Search className="w-12 h-12 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-400">No data found for this selection</p>
                            <p className="text-sm text-gray-400 mt-1">Try changing the month or search filter</p>
                        </div>
                    ) : null}
                </div>
            </div>


            {/* Rate Management Modal */}
            {
                showRateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Layers className="w-6 h-6 text-blue-600" />
                                        Salary Rate Configuration
                                    </h3>
                                    <p className="text-sm text-gray-500">Define base monthly salaries for roles across departments</p>
                                </div>
                                <button
                                    onClick={() => setShowRateModal(false)}
                                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                {/* Add New Rate Form */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Add / Update Rate
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
                                            <select
                                                value={rateForm.department}
                                                onChange={(e) => setRateForm({ ...rateForm, department: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                            >
                                                <option value="">-- Global / All Departments --</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Service (Optional)</label>
                                            <select
                                                value={rateForm.service}
                                                onChange={(e) => setRateForm({ ...rateForm, service: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                            >
                                                <option value="">-- All / None --</option>
                                                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
                                            <select
                                                value={rateForm.role}
                                                onChange={(e) => setRateForm({ ...rateForm, role: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                            >
                                                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Base Salary ($)</label>
                                            <input
                                                type="number"
                                                value={rateForm.monthlyRate}
                                                onChange={(e) => setRateForm({ ...rateForm, monthlyRate: parseFloat(e.target.value) || 0 })}
                                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-bold"
                                                placeholder="0.00"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={handleSaveRate}
                                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Save Rate
                                        </button>
                                    </div>
                                </div>

                                {/* Rates List */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                        <h4 className="font-bold text-gray-900">Configured Rates</h4>
                                        <button onClick={fetchRates} className="text-gray-400 hover:text-blue-600"><RefreshCw className={`w-4 h-4 ${rateLoading ? 'animate-spin' : ''}`} /></button>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase font-semibold">
                                            <tr>
                                                <th className="px-6 py-3">Department</th>
                                                <th className="px-6 py-3">Service</th>
                                                <th className="px-6 py-3">Role</th>
                                                <th className="px-6 py-3">Monthly Rate</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {rateLoading && rates.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading rates...</td></tr>
                                            ) : rates.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No specific rates configured. Default (1100) applies.</td></tr>
                                            ) : (
                                                rates.map(rate => (
                                                    <tr key={rate._id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {rate.department ? rate.department : <span className="text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100 text-xs">GLOBAL RULE</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">
                                                            {rate.service ? (
                                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold border border-blue-100">{rate.service}</span>
                                                            ) : (
                                                                <span className="text-gray-400 italic">All Services</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 capitalize text-gray-700 font-medium">{rate.role}</td>
                                                        <td className="px-6 py-4 font-bold text-green-600">${rate.monthlyRate.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteRate(rate._id)}
                                                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete Rate"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bank Details Verification Modal */}
            {showBankModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <CreditCard className="text-emerald-600" />
                                    Bank Verification
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Review employee bank details before crediting</p>
                            </div>
                            <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                                <Search className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {isFetchingBank ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <RefreshCw className="w-10 h-10 animate-spin" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">Fetching Secure Details...</p>
                                </div>
                            ) : selectedBanking ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Bank Name', value: selectedBanking.bankName },
                                            { label: 'Account Holder', value: selectedBanking.accountHolder },
                                            { label: 'Account Number', value: selectedBanking.accountNumber },
                                            { label: 'IFSC Code', value: selectedBanking.ifscCode },
                                            { label: 'Branch', value: selectedBanking.branchName },
                                        ].map((field, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl bg-slate-50 border border-slate-100 ${field.label === 'Account Number' ? 'col-span-2 bg-emerald-50/50 border-emerald-100' : ''}`}>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                                                <p className={`font-bold text-slate-900 ${field.label === 'Account Number' ? 'text-xl tracking-wider' : 'text-sm'}`}>
                                                    {field.value || 'Not Configured'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                                        <div className="p-2 bg-white rounded-xl h-fit shadow-sm">
                                            <AlertCircle className="text-amber-500" size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                                Please double-check the account number and IFSC code.
                                                Once credited, this transaction cannot be reversed.
                                            </p>
                                            <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-2 border-amber-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    checked={hasVerifiedBank}
                                                    onChange={(e) => setHasVerifiedBank(e.target.checked)}
                                                />
                                                <span className="text-xs font-black text-amber-900 uppercase tracking-tighter group-hover:text-amber-700 transition-colors">
                                                    I have verified these banking details
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => currentCreditId && creditSalary(currentCreditId)}
                                        disabled={!hasVerifiedBank}
                                        className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed mt-4"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Confirm & Credit Salary Now
                                    </button>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <AlertCircle className="w-12 h-12 text-slate-300" />
                                    <div className="text-center px-8">
                                        <p className="text-sm font-black text-slate-600 uppercase tracking-widest mb-1">Missing Bank Details</p>
                                        <p className="text-xs font-medium text-slate-400">This employee has not configured their banking profile yet. Salary cannot be credited.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowBankModal(false)}
                                        className="mt-4 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
                                    >
                                        Close Window
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
