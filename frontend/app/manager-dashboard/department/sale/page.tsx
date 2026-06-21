'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Activity, Briefcase, CheckSquare, Clock, DollarSign,
    FileText, Send, User, XCircle, Search, ChevronRight,
    CreditCard, Users, Building, ShieldCheck, Download, Bell, Menu, X,
    UserPlus, CheckCircle
} from 'lucide-react';

import Sidebar from '@/app/Manager-Compontent/sales/main-dashboard/MainSidebar';
import Header from '@/app/Manager-Compontent/sales/main-dashboard/MainHeader';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

interface Project {
    _id: string;
    uniqueId: string;
    userId: {
        name: string;
        email: string;
        department: string;
        phone?: string;
    };
    department: string;
    category: string;
    status: string;
    paymentStatus: string;
    quotedAmount?: number;
    paymentDetails?: {
        amount: number;
        paidAmount: number;
        title: string;
        dueDate: string;
        paymentMethod?: string;
        checkNumber?: string;
        bankName?: string;
        checkDate?: string;
        upiId?: string;
    };
    formData?: any;
    submittedAt?: string;
    createdAt: string;
    assignedTo?: Array<{ name: string, email: string }>;
}

export default function SalesManagerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    // Data State
    const [stats, setStats] = useState({
        total: 0,
        pendingQuotes: 0,
        awaitingpayment: 0,
        toAssign: 0
    });
    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [managers, setManagers] = useState<any[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'inquiries' | 'payments' | 'assign' | 'active'>('inquiries');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Modal States
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState<number>(0);
    const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        title: '',
        projectDescription: '',
        detailedQuotation: '',
        dueDate: ''
    });
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedManager, setSelectedManager] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
            fetchDashboardData(token);
        } catch (error) {
            router.push('/Login/Signin');
        }

        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    useEffect(() => {
        filterProjects();
    }, [projects, activeTab, searchQuery]);

    const fetchDashboardData = async (token: string) => {
        setLoading(true);
        try {
            const [unassignedRes, assignedRes] = await Promise.all([
                fetch(`${API_BASE}/unassigned-projects`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/assigned-projects`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const unassignedData = await unassignedRes.json();
            const assignedData = await assignedRes.json();

            let allProjects: Project[] = [];
            if (unassignedData.success) allProjects = [...allProjects, ...unassignedData.data];
            if (assignedData.success) allProjects = [...allProjects, ...assignedData.data];

            const uniqueProjects = Array.from(new Map(allProjects.map(p => [p._id, p])).values());
            setProjects(uniqueProjects);
            updateStats(uniqueProjects);
        } catch (error) {
            toast.error('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (data: Project[]) => {
        setStats({
            total: data.length,
            pendingQuotes: data.filter(p => p.status === 'Submitted' && p.paymentStatus === 'Pending').length,
            awaitingpayment: data.filter(p => ['Awaiting Approval', 'Awaiting Balance Approval'].includes(p.paymentStatus)).length,
            toAssign: data.filter(p => !p.assignedTo?.length && ['Full Paid', '50% Paid'].includes(p.paymentStatus)).length
        });
    };

    const filterProjects = () => {
        let filtered = projects;
        if (activeTab === 'inquiries') {
            filtered = filtered.filter(p =>
                (p.status === 'Submitted' && p.paymentStatus === 'Pending') ||
                p.paymentStatus === 'Quote Sent' ||
                p.paymentStatus === 'Payment Form Created'
            );
        } else if (activeTab === 'payments') {
            filtered = filtered.filter(p =>
                ['Awaiting Approval', 'Awaiting Balance Approval', '50% Paid', 'Full Paid', 'Official Receipt Issued'].includes(p.paymentStatus)
            );
        } else if (activeTab === 'assign') {
            filtered = filtered.filter(p =>
                (!p.assignedTo || p.assignedTo.length === 0) &&
                !['Pending', 'Quote Sent'].includes(p.paymentStatus)
            );
        } else if (activeTab === 'active') {
            filtered = filtered.filter(p => p.assignedTo && p.assignedTo.length > 0);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.uniqueId.toLowerCase().includes(query) ||
                p.userId.name.toLowerCase().includes(query) ||
                p.department.toLowerCase().includes(query)
            );
        }
        setFilteredProjects(filtered);
    };

    const handleQuoteSubmit = async () => {
        if (!selectedProject || quoteAmount <= 0) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/${selectedProject._id}/quote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(quoteAmount) })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Quote sent successfully');
                setShowQuoteModal(false);
                fetchDashboardData(token!);
            } else {
                toast.error(data.message || 'Failed to send quote');
            }
        } catch (error) {
            toast.error('Error sending quote');
        }
    };

    const handleCreatePaymentForm = async () => {
        if (!selectedProject) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/${selectedProject._id}/create-payment-form`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentForm)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment form created');
                setShowPaymentFormModal(false);
                fetchDashboardData(token!);
            } else {
                toast.error(data.message || 'Failed to create payment form');
            }
        } catch (error) {
            toast.error('Error creating payment form');
        }
    };

    const handleApprovePayment = async () => {
        if (!selectedProject) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/${selectedProject._id}/approve-payment`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment approved');
                setShowApproveModal(false);
                fetchDashboardData(token!);
            } else {
                toast.error(data.message || 'Failed to approve');
            }
        } catch (error) {
            toast.error('Error approving payment');
        }
    };

    const handleGenerateReceipt = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/${id}/receipt`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Receipt generated and sent');
                fetchDashboardData(token!);
            } else {
                toast.error(data.message || 'Failed to generate receipt');
            }
        } catch (error) {
            toast.error('Error generating receipt');
        }
    };

    const fetchManagers = async (department: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/managers?department=${encodeURIComponent(department)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setManagers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching managers', error);
        }
    };

    const handleAssign = async () => {
        if (!selectedProject || !selectedManager) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/assign-to-department/${selectedProject._id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    managerId: selectedManager,
                    department: selectedProject.department
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Project assigned successfully');
                setShowAssignModal(false);
                fetchDashboardData(token!);
            } else {
                toast.error(data.message || 'Failed to assign project');
            }
        } catch (error) {
            toast.error('Error assigning project');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Initializing Sales Hub...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            <Sidebar isSidebarOpen={isSidebarOpen} pathname="/manager-dashboard/department/sale" handleLogout={handleLogout} />

            <div className={`flex-1 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-20'}`}>
                <Header scrolled={scrolled} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} user={user} />

                <main className="p-8 pb-20">
                    <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Hero Section */}
                        <div className="mb-10 flex justify-between items-end">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Sales Hub Dashboard</h1>
                                <p className="text-slate-500 mt-2 text-lg">Manage inquiries, payments, and project assignments across all departments.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Live Monitoring</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {[
                                { label: 'Pending Quotes', value: stats.pendingQuotes, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
                                { label: 'Awaiting Payment', value: stats.awaitingpayment, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Ready to Assign', value: stats.toAssign, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'Total Projects', value: stats.total, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow group cursor-default">
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">{stat.label}</p>
                                        <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
                                    </div>
                                    <div className={`p-4 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Tabs & Search */}
                            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6 bg-slate-50/50">
                                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
                                    {['inquiries', 'payments', 'assign', 'active'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative w-full lg:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by ID, Client or Dept..."
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 transition-colors">
                                        <tr className="text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                                            <th className="px-8 py-5">Project Details</th>
                                            <th className="px-8 py-5">Sub-Department</th>
                                            <th className="px-8 py-5">Phase</th>
                                            <th className="px-8 py-5">Financials</th>
                                            <th className="px-8 py-5 text-right">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                        {filteredProjects.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">No records matching clinical parameters found.</td></tr>
                                        ) : (
                                            filteredProjects.map(p => (
                                                <tr key={p._id} className="hover:bg-slate-50/80 transition-all group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-900 font-black tracking-tight">{p.uniqueId}</span>
                                                            <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-bold">
                                                                <User size={10} /> {p.userId.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                            {p.department}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2 w-2 rounded-full ${p.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                                            <span className="font-bold text-slate-700">{p.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${['Full Paid', '50% Paid'].includes(p.paymentStatus) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                {p.paymentStatus}
                                                            </span>
                                                            {p.paymentDetails && (
                                                                <span className="text-[10px] text-slate-400 mt-0.5">Val: ₹{p.paymentDetails.amount}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right space-x-2">
                                                        {/* Action Buttons based on status */}

                                                        {/* Quote Action */}
                                                        {(p.paymentStatus === 'Pending' || p.paymentStatus === 'Quote Sent' || p.paymentStatus === 'Payment Form Created') && (
                                                            <button
                                                                onClick={() => { setSelectedProject(p); setQuoteAmount(p.quotedAmount || 0); setShowQuoteModal(true); }}
                                                                className="p-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-200 hover:border-slate-900 shadow-sm"
                                                                title="Send/Update Quote"
                                                            >
                                                                <DollarSign size={16} />
                                                            </button>
                                                        )}

                                                        {/* Create Form Action */}
                                                        {p.paymentStatus === 'Quote Sent' && (
                                                            <button
                                                                onClick={() => { setSelectedProject(p); setPaymentForm(prev => ({ ...prev, title: `Payment for ${p.uniqueId}` })); setShowPaymentFormModal(true); }}
                                                                className="p-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-slate-200 hover:border-blue-600 shadow-sm"
                                                                title="Create Payment Form"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        )}

                                                        {/* Approve Action */}
                                                        {['Awaiting Approval', 'Awaiting Balance Approval'].includes(p.paymentStatus) && (
                                                            <button
                                                                onClick={() => { setSelectedProject(p); setShowApproveModal(true); }}
                                                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 hover:border-emerald-600 shadow-sm"
                                                                title="Approve Payment"
                                                            >
                                                                <ShieldCheck size={16} />
                                                            </button>
                                                        )}

                                                        {/* Receipt Action */}
                                                        {['50% Paid', 'Full Paid', 'Awaiting Balance Approval'].includes(p.paymentStatus) && (
                                                            <button
                                                                onClick={() => handleGenerateReceipt(p._id)}
                                                                className="p-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
                                                                title="Generate Receipt"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                        )}

                                                        {/* Assign Action */}
                                                        {(!p.assignedTo || p.assignedTo.length === 0) && !['Pending', 'Quote Sent'].includes(p.paymentStatus) && (
                                                            <button
                                                                onClick={() => { setSelectedProject(p); fetchManagers(p.department); setShowAssignModal(true); }}
                                                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 hover:border-indigo-600 shadow-sm"
                                                                title="Assign to Expert"
                                                            >
                                                                <UserPlus size={16} />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => { setSelectedProject(p); setShowDetailsModal(true); }}
                                                            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-black hover:text-white transition-all border border-transparent shadow-sm"
                                                            title="View Full File"
                                                        >
                                                            <ChevronRight size={16} />
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
                </main>
            </div>

            {/* --- Modals --- */}

            {/* Quote Modal */}
            {showQuoteModal && selectedProject && (
                <Modal title={selectedProject.quotedAmount ? "Revise Quote" : "Generate Quote"} onClose={() => setShowQuoteModal(false)}>
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                            <span className="text-xs font-bold text-slate-400">PROJECT ID</span>
                            <span className="font-black text-slate-900">{selectedProject.uniqueId}</span>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quote Amount (INR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={quoteAmount}
                                    onChange={e => setQuoteAmount(Number(e.target.value))}
                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleQuoteSubmit}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                        >
                            Confirm and Transmit
                        </button>
                    </div>
                </Modal>
            )}

            {/* Payment Form Modal */}
            {showPaymentFormModal && selectedProject && (
                <Modal title="Clinical Payment Manifest" onClose={() => setShowPaymentFormModal(false)}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Manifest Title</label>
                                <input
                                    type="text"
                                    value={paymentForm.title}
                                    onChange={e => setPaymentForm({ ...paymentForm, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Due Date</label>
                                <input
                                    type="date"
                                    value={paymentForm.dueDate}
                                    onChange={e => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Technical Description</label>
                            <textarea
                                value={paymentForm.projectDescription}
                                onChange={e => setPaymentForm({ ...paymentForm, projectDescription: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Detailed Quotation Breakdown</label>
                            <textarea
                                value={paymentForm.detailedQuotation}
                                onChange={e => setPaymentForm({ ...paymentForm, detailedQuotation: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm italic"
                            />
                        </div>
                        <button
                            onClick={handleCreatePaymentForm}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                        >
                            Generate Manifest
                        </button>
                    </div>
                </Modal>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedProject && selectedProject.paymentDetails && (
                <Modal title="Authorize Payment" onClose={() => setShowApproveModal(false)}>
                    <div className="space-y-6">
                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-emerald-700 uppercase">Method</span>
                                <span className="font-black text-slate-900">{selectedProject.paymentDetails.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-emerald-700 uppercase">Value</span>
                                <span className="font-black text-slate-900">₹{selectedProject.paymentDetails.paidAmount} / ₹{selectedProject.paymentDetails.amount}</span>
                            </div>
                            {selectedProject.paymentDetails.bankName && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-emerald-700 uppercase">Origin</span>
                                    <span className="font-black text-slate-900">{selectedProject.paymentDetails.bankName}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold text-center leading-relaxed">
                            Confirming this payment will unlock project resources and allow department assignment.
                        </p>
                        <button
                            onClick={handleApprovePayment}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                        >
                            Validate Transaction
                        </button>
                    </div>
                </Modal>
            )}

            {/* Assign Modal */}
            {showAssignModal && selectedProject && (
                <Modal title="Deploy Expert Team" onClose={() => setShowAssignModal(false)}>
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target Department</p>
                            <p className="font-black text-indigo-700">{selectedProject.department}</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Investigator / Manager</label>
                            <select
                                value={selectedManager}
                                onChange={e => setSelectedManager(e.target.value)}
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select Clinical Lead</option>
                                {managers.map(m => (
                                    <option key={m._id} value={m._id}>{m.name} [ID: {m.uniqueId || m._id.slice(-6)}]</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedManager}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                        >
                            Execute Deployment
                        </button>
                    </div>
                </Modal>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedProject && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] relative z-10 p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Project File</h2>
                                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">{selectedProject.uniqueId}</p>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Identity</p>
                                <p className="text-slate-900 font-bold">{selectedProject.userId.name}</p>
                                <p className="text-slate-500 text-sm mt-0.5">{selectedProject.userId.email}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinical Stream</p>
                                <p className="text-slate-900 font-bold">{selectedProject.department}</p>
                                <p className="text-slate-500 text-sm mt-0.5">{new Date(selectedProject.submittedAt || selectedProject.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-l-4 border-indigo-600 pl-4 uppercase tracking-tighter">Technical Manifest</h3>
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-4">
                                {selectedProject.formData && Object.entries(selectedProject.formData).filter(([k]) => k !== 'remarks').map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        <span className="text-slate-900 font-bold text-sm text-right">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                                    </div>
                                ))}
                                {selectedProject.formData?.remarks && (
                                    <div className="mt-6 pt-4 border-t border-slate-200">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 text-indigo-600">Investigator Remarks</p>
                                        <p className="text-slate-700 italic text-sm leading-relaxed whitespace-pre-wrap">{selectedProject.formData.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowDetailsModal(false)}
                            className="w-full mt-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100"
                        >
                            Confirm and Exit File
                        </button>
                    </div>
                </div>
            )}
            <Toaster position="bottom-center" />
        </div>
    );
}

// Reusable Modal Component
function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/30 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] relative z-10 p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
