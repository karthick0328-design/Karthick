'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import {
    DollarSign,
    Users,
    Calendar,
    Search,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronDown,
    Filter,
    ArrowLeft,
    RefreshCw,
    CreditCard,
    Settings,
    Layers,
    MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';

// Simplified Interfaces
interface UserSub {
    _id: string;
    name: string;
    uniqueId: string;
    department: string;
    role: string;
    service?: string;
    monthlySalaryRate?: number;
    assignedRate?: number;
}

interface AttendanceSubmission {
    _id: string;
    userId: UserSub;
    date: string;
    status: string;
}

interface SalaryRecord {
    _id: string;
    uniqueId: string;
    userId: UserSub;
    month: number;
    year: number;
    basicSalary: number;
    attendanceDeductions: number;
    totalIncrements: number;
    netSalary: number;
    status: 'pending' | 'processed' | 'credited';
    processedAt?: string;
}

interface DepartmentRate {
    _id: string;
    department: string;
    service?: string;
    role: string;
    monthlyRate: number;
    updatedBy?: { name: string };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

export default function FinanceEmployeeSalaryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [modalData, setModalData] = useState<{ id: string | string[]; name: string; rate: number } | null>(null);
    const [inputSalary, setInputSalary] = useState<number>(0);

    // Rate Configuration state
    const [showRateConfig, setShowRateConfig] = useState(false);
    const [rates, setRates] = useState<DepartmentRate[]>([]);
    const [rateLoading, setRateLoading] = useState(false);

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState(1);
    const [selectedYear, setSelectedYear] = useState(2026);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'submissions' | 'processed' | 'credited'>('submissions');
    const [hasMounted, setHasMounted] = useState(false);

    // Bank Details Modal States
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedBanking, setSelectedBanking] = useState<any>(null);
    const [isFetchingBank, setIsFetchingBank] = useState(false);
    const [currentCreditId, setCurrentCreditId] = useState<string | null>(null);
    const [hasVerifiedBank, setHasVerifiedBank] = useState(false);

    // Selection State
    const [selectedProcessedIds, setSelectedProcessedIds] = useState<string[]>([]);
    const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
    const [selectedCreditedIds, setSelectedCreditedIds] = useState<string[]>([]);

    useEffect(() => {
        setHasMounted(true);
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedYear(new Date().getFullYear());
        loadInitialData();
    }, [router]);

    const loadInitialData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // Decoded token values as fallback
            const decoded: any = jwtDecode(token);
            let currentAccess = decoded.financeAccess || [];
            let currentRole = decoded.role || '';

            // Fetch fresh permissions
            const res = await fetch(`${API_BASE}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.user) {
                currentAccess = data.user.financeAccess || [];
                currentRole = data.user.role || '';
            }

            if (currentRole === 'employee' && !currentAccess.includes('salary')) {
                toast.error('Access Denied: Salary Module');
                router.push('/employee-dashboard/finance');
            }
        } catch (err) {
            console.error('Initialization failed', err);
            router.push('/login');
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Fetch Submissions
            const subRes = await fetch(`${API_BASE}/salaries/finance/submissions?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const subData = await subRes.json();

            // Fetch Salaries
            const salRes = await fetch(`${API_BASE}/salaries?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const salData = await salRes.json();

            if (subData.success) {
                console.log('[Salary Diagnostic] Submissions:', subData.data.length ? subData.data[0] : 'None');
                setSubmissions(subData.data);
            }
            if (salData.success) setSalaries(salData.data);

        } catch (err) {
            toast.error('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const processSalary = async (uniqueId: string | string[], customSalary?: number) => {
        const ids = Array.isArray(uniqueId) ? uniqueId : [uniqueId];
        setProcessing(Array.isArray(uniqueId) ? 'bulk' : uniqueId);
        const token = localStorage.getItem('token');
        let successCount = 0;

        try {
            for (const id of ids) {
                const res = await fetch(`${API_BASE}/salaries/process-salary`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uniqueId: id,
                        month: selectedMonth,
                        year: selectedYear,
                        initialSalary: customSalary
                    })
                });

                const data = await res.json();
                if (data.success) successCount++;
            }

            if (successCount > 0) {
                toast.success(ids.length > 1 ? `Successfully processed ${successCount} salaries` : `Salary processed for ${ids[0]}`);
                setShowProcessModal(false);
                setSelectedSubmissionIds([]);
                fetchData();
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setProcessing(null);
        }
    };

    const creditSalary = async (salaryId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/salaries/credit-salary/${salaryId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Salary credited successfully!');
                setShowBankModal(false);
                fetchData();
            } else {
                toast.error(data.message || 'Credit failed');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };


    const handleBulkCredit = async () => {
        if (!confirm(`Are you sure you want to credit salary for ${selectedProcessedIds.length} employees?`)) return;

        setProcessing('bulk-credit');
        let successCount = 0;
        const token = localStorage.getItem('token');
        for (const id of selectedProcessedIds) {
            try {
                const res = await fetch(`${API_BASE}/salaries/credit-salary/${id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                const data = await res.json();
                if (data.success) successCount++;
            } catch (err) {
                console.error(`Failed to credit ${id}:`, err);
            }
        }
        toast.success(`Successfully credited ${successCount} salaries`);
        setSelectedProcessedIds([]);
        setProcessing(null);
        fetchData();
    };

    const handleOpenBankModal = async (salary: SalaryRecord) => {
        setCurrentCreditId(salary._id);
        setIsFetchingBank(true);
        setShowBankModal(true);
        setHasVerifiedBank(false);
        setSelectedBanking(null);

        const token = localStorage.getItem('token');
        try {
            // Try Service Manager/Employee Profile first
            const res = await fetch(`${API_BASE}/service-manager-profile/${salary.userId._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.data?.bankingDetails && data.data.bankingDetails.accountNumber) {
                setSelectedBanking(data.data.bankingDetails);
            } else {
                // Try HR profile
                const hrRes = await fetch(`${API_BASE}/hr-profile/${salary.userId._id}`, {
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

    const fetchRates = async () => {
        setRateLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/salaries/department-rates?limit=100`, {
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

    // Derived Calculations
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

    if (!hasMounted) return null;

    return (
        <div className="space-y-8 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <button
                    onClick={() => router.back()}
                    className="group flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 font-bold transition-all shadow-sm hover:shadow-md w-fit"
                >
                    <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm uppercase tracking-widest">Back</span>
                </button>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 ml-auto">
                    <button
                        onClick={() => { setShowRateConfig(true); fetchRates(); }}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
                    >
                        <Settings className="w-4 h-4" />
                        Rates Config
                    </button>
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

            {/* Main Content */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Tabs & Search */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                        {[
                            { id: 'submissions', label: 'In Review', count: groupedSubmissions.length },
                            { id: 'processed', label: 'Processed', count: salaries.filter(s => s.status === 'processed').length },
                            { id: 'credited', label: 'Credited', count: salaries.filter(s => s.status === 'credited').length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                suppressHydrationWarning
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-green-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.label} <span className="ml-1 opacity-50">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            suppressHydrationWarning
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {(selectedSubmissionIds.length > 0 || selectedProcessedIds.length > 0) && (
                    <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                <Filter size={16} />
                            </div>
                            <p className="text-sm font-bold text-indigo-900">
                                {activeTab === 'submissions' ? selectedSubmissionIds.length : selectedProcessedIds.length} items selected
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setSelectedSubmissionIds([]);
                                    setSelectedProcessedIds([]);
                                    setSelectedCreditedIds([]);
                                }}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            {activeTab === 'submissions' && selectedSubmissionIds.length > 0 && (
                                <button
                                    onClick={() => {
                                        setModalData({
                                            id: selectedSubmissionIds,
                                            name: `${selectedSubmissionIds.length} Selected Employees`,
                                            rate: 0
                                        });
                                        setInputSalary(0);
                                        setShowProcessModal(true);
                                    }}
                                    className="px-6 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                                >
                                    <DollarSign size={14} />
                                    Put Salary for Selected
                                </button>
                            )}
                            {activeTab === 'processed' && selectedProcessedIds.length > 0 && (
                                <button
                                    onClick={handleBulkCredit}
                                    className="px-6 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                                >
                                    <CreditCard size={14} />
                                    Credit Selected
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-scroll custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 z-10 bg-gray-50/80 shadow-sm border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={
                                            activeTab === 'submissions'
                                                ? (groupedSubmissions.length > 0 && selectedSubmissionIds.length === groupedSubmissions.length)
                                                : activeTab === 'processed'
                                                    ? (salaries.filter(s => s.status === 'processed').length > 0 && selectedProcessedIds.length === salaries.filter(s => s.status === 'processed').length)
                                                    : (salaries.filter(s => s.status === 'credited').length > 0 && selectedCreditedIds.length === salaries.filter(s => s.status === 'credited').length)
                                        }
                                        onChange={(e) => {
                                            if (activeTab === 'submissions') {
                                                if (e.target.checked) setSelectedSubmissionIds(groupedSubmissions.map(g => g.user.uniqueId));
                                                else setSelectedSubmissionIds([]);
                                            } else if (activeTab === 'processed') {
                                                const processed = salaries.filter(s => s.status === 'processed');
                                                if (e.target.checked) setSelectedProcessedIds(processed.map(s => s._id));
                                                else setSelectedProcessedIds([]);
                                            } else {
                                                const credited = salaries.filter(s => s.status === 'credited');
                                                if (e.target.checked) setSelectedCreditedIds(credited.map(s => s._id));
                                                else setSelectedCreditedIds([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Dept / Service</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Salary Rate</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeTab === 'submissions' && groupedSubmissions.filter(g =>
                                g.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                g.user.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (g.user.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                g.user.department.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(group => {
                                const isProcessed = salaries.find(s => s.userId.uniqueId === group.user.uniqueId);
                                return (
                                    <tr key={group.user._id} className="hover:bg-green-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedSubmissionIds.includes(group.user.uniqueId)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedSubmissionIds([...selectedSubmissionIds, group.user.uniqueId]);
                                                    else setSelectedSubmissionIds(selectedSubmissionIds.filter(id => id !== group.user.uniqueId));
                                                }}
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                                                    {group.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{group.user.name}</p>
                                                    <p className="text-xs text-gray-500">{group.user.uniqueId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm text-gray-700 font-medium">{group.user.department}</p>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-xs text-indigo-600 font-black uppercase tracking-tighter">{group.user.service || 'N/A'}</p>
                                                <p className="text-[10px] text-gray-400 capitalize font-bold italic">{group.user.role}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-800">${(group.user.assignedRate || group.user.monthlySalaryRate || 0).toLocaleString()}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fixed Amount</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {isProcessed ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Processed</span>
                                            ) : (
                                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Action Required</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {!isProcessed ? (
                                                <button
                                                    onClick={() => {
                                                        setModalData({ id: group.user.uniqueId, name: group.user.name, rate: group.user.assignedRate || 0 });
                                                        setInputSalary(group.user.assignedRate || 0);
                                                        setShowProcessModal(true);
                                                    }}
                                                    disabled={processing === group.user.uniqueId}
                                                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    {processing === group.user.uniqueId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                                    Put Salary
                                                </button>
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

                            {(activeTab === 'processed' || activeTab === 'credited') && salaries
                                .filter(s => s.status === activeTab)
                                .filter(s =>
                                    s.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (s.userId.service || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.userId.department.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map(salary => (
                                    <tr key={salary._id} className="hover:bg-green-50/30 transition-colors group">
                                        <td className="px-8 py-6 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={
                                                    activeTab === 'processed'
                                                        ? selectedProcessedIds.includes(salary._id)
                                                        : selectedCreditedIds.includes(salary._id)
                                                }
                                                onChange={(e) => {
                                                    if (activeTab === 'processed') {
                                                        if (e.target.checked) setSelectedProcessedIds([...selectedProcessedIds, salary._id]);
                                                        else setSelectedProcessedIds(selectedProcessedIds.filter(id => id !== salary._id));
                                                    } else {
                                                        if (e.target.checked) setSelectedCreditedIds([...selectedCreditedIds, salary._id]);
                                                        else setSelectedCreditedIds(selectedCreditedIds.filter(id => id !== salary._id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                                                    {salary.userId.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{salary.userId.name}</p>
                                                    <p className="text-xs text-gray-500">{salary.userId.uniqueId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm text-gray-700 font-medium">{salary.userId.department}</p>
                                            <p className="text-xs text-indigo-600 font-black uppercase tracking-tighter mt-1">{salary.userId.service || 'N/A'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">${(salary.userId.assignedRate || salary.userId.monthlySalaryRate || salary.basicSalary).toLocaleString()}</p>
                                                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">Net: ${salary.netSalary.toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {salary.status === 'credited' ? (
                                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-lg w-fit">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase">Paid</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-lg w-fit">
                                                    <DollarSign className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase">Processing</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {salary.status === 'processed' && (
                                                <button
                                                    onClick={() => handleOpenBankModal(salary)}
                                                    className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-xl hover:shadow-emerald-200 transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    Credit Now
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>

                    {/* Empty State */}
                    {((activeTab === 'submissions' && groupedSubmissions.length === 0) ||
                        (activeTab !== 'submissions' && salaries.filter(s => s.status === activeTab).length === 0)) && !loading && (
                            <div className="py-20 text-center">
                                <p className="text-gray-400 font-medium">No records found for this selection.</p>
                            </div>
                        )}
                </div>
            </div >

            {/* Process Salary Modal */}
            {
                showProcessModal && modalData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
                        <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {Array.isArray(modalData.id) ? 'Batch Salary Processing' : 'Financial Processing'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        {Array.isArray(modalData.id) ? `Target: ${modalData.name}` : `Employee: ${modalData.name}`}
                                    </p>
                                </div>
                                <button onClick={() => setShowProcessModal(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                                    <Search className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {!Array.isArray(modalData.id) && (
                                    <div className="flex items-center gap-4 p-5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                                        <div className="p-3 bg-white/20 rounded-xl">
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Manager Fixed Rate</p>
                                            <p className="text-2xl font-black">${modalData.rate.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Final Salary Amount to Process</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
                                        <input
                                            type="number"
                                            value={inputSalary}
                                            onChange={(e) => setInputSalary(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-[2rem] outline-none text-xl font-black text-slate-900 transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold italic ml-2">* This amount will be used as the base for attendance calculations.</p>
                                </div>

                                <button
                                    onClick={() => processSalary(modalData.id, inputSalary)}
                                    disabled={!!processing}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {processing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    Complete Financial Entry
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Salary Rate Configuration Modal (Read-only for Employee) */}
            {
                showRateConfig && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
                        <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="px-8 py-8 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                        <Layers className="text-indigo-600" />
                                        Master Rate Configuration
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized Salary Baselines (View Only)</p>
                                </div>
                                <button onClick={() => setShowRateConfig(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                                    <Search className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized By</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monthly Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rateLoading ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading master rates...</td></tr>
                                        ) : rates.length === 0 ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No rates configured by management</td></tr>
                                        ) : (
                                            rates.map((rate) => (
                                                <tr key={rate._id} className="hover:bg-indigo-50/30 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        {rate.department ? (
                                                            <span className="text-sm font-bold text-slate-700">{rate.department}</span>
                                                        ) : (
                                                            <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 font-black rounded uppercase tracking-widest">Global Rule</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-sm font-medium text-slate-500">{rate.service || '--'}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">
                                                            {rate.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-bold text-slate-500">{rate.updatedBy?.name || 'Authorized Admin'}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Manager / Dept. Head</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-900 text-lg">
                                                        ${rate.monthlyRate.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold italic text-center">
                                    * These rates are fixed by the Financial Manager. If changes are required, please contact the department head.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bank Details Verification Modal */}
            {
                showBankModal && (
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
                )
            }
        </div >
    );
}
