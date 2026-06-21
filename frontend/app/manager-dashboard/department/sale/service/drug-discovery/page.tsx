// page.tsx (updated loadManagers error handling to gracefully handle empty managers without toast error)
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import ServiceDashboardView from '@/app/Manager-Compontent/sales/shared/ServiceDashboardView';
import {
    DollarSign,
    FileText,
    CheckCircle,
    UserPlus,
    Clock,
    Search,
    Filter,
    ArrowRight,
    Beaker,
    ClipboardList,
    AlertCircle,
    X,
    Calendar,
    Download,
    Loader2,
    Activity,
    CheckSquare,
    Bell,
    Globe
} from 'lucide-react';


// --- Types & Interfaces --- (unchanged)
interface UserType {
    _id: string;
    name: string;
    email: string;
    uniqueId: string;
    department: string;
    role: string;
}

interface Project {
    _id: string;
    uniqueId: string;
    userId: UserType;
    department: string;
    category: string;
    status: string;
    paymentStatus: string;
    quotedAmount?: number;
    // Advanced features
    gst?: number;
    taxHandling?: string;
    projectProgress?: string;
    memberCost?: number;
    description?: string; // Sometimes at top level
    remarks?: string;
    createdAt: string;
    submittedAt: string;
    formData?: any;
    paymentDetails?: {
        title: string;
        projectDescription: string;
        detailedQuotation: string;
        dueDate: string;
        amount: number;
        paidAmount: number;
        paymentMethod: string | null;
        checkNumber?: string;
        bankName?: string;
    };
}

interface Manager {
    _id: string;
    uniqueId: string;
    name: string;
    email: string;
}

// --- Constants ---
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';
const DEPARTMENT = 'Drug Discovery';

// --- Main Page Component ---
export default function DrugDiscoverySalesPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

    // Modal & Action States
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [modalMode, setModalMode] = useState<'quote' | 'payment-form' | 'approve' | 'assign' | 'details' | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [showEscalateHRModal, setShowEscalateHRModal] = useState(false);
    const [escalationReason, setEscalationReason] = useState('');

    // Data for Modals
    const [quoteAmount, setQuoteAmount] = useState<string>('');
    const [gst, setGst] = useState<string>('');
    const [taxHandling, setTaxHandling] = useState<string>('');
    const [projectProgress, setProjectProgress] = useState<string>('');
    const [memberCost, setMemberCost] = useState<string>('');
    const [paymentFormData, setPaymentFormData] = useState({
        title: '',
        projectDescription: '',
        detailedQuotation: '',
        dueDate: ''
    });
    const [managers, setManagers] = useState<Manager[]>([]);
    const [selectedManagerId, setSelectedManagerId] = useState('');

    // Auto-fill quotation details when amount is entered
    useEffect(() => {
        if (quoteAmount && !gst && !taxHandling && !projectProgress) {
            setGst('18');
            setTaxHandling('Included in the total quoted amount');
            setProjectProgress('1. Target Identification\n2. Compound Screening\n3. Lead Optimization\n4. Pre-clinical Validation');
        }
    }, [quoteAmount]);

    // --- Authentication & Data Fetching --- (unchanged)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        try {
            const decoded: any = jwtDecode(token);
            if (decoded.exp * 1000 < Date.now()) {
                toast.error('Session expired');
                localStorage.removeItem('token');
                router.push('/Login/Signin');
                return;
            }
            // Sales Manager Check
            const normalizedDept = (decoded.department || '').trim().toLowerCase().replace(/&/g, 'and');
            const isSalesManager = decoded.role === 'manager' &&
                (normalizedDept.includes('sales') ||
                    ['sales and customer services', 'sales and customer support', 'customer services', 'customer support', 'services'].includes(normalizedDept));

            if (!isSalesManager) {
                toast.error(`Access denied. Role: ${decoded.role}, Dept: ${decoded.department}`);
                setAccessDenied(true);
                setDebugInfo({ role: decoded.role, department: decoded.department });
                return;
            }
            setUser({
                _id: decoded._id || decoded.id || decoded.userId,
                name: decoded.name || 'Unknown',
                email: decoded.email,
                uniqueId: decoded.uniqueId,
                department: decoded.department,
                role: decoded.role
            });
            loadProjects(token);
        } catch (error) {
            console.error(error);
            router.push('/Login/Signin');
        }
    }, [router]);

    const loadProjects = async (token: string) => {
        setLoading(true);
        try {
            console.log('[DD] Fetching projects from:', API_BASE);
            const [unassignedRes, assignedRes] = await Promise.all([
                fetch(`${API_BASE}/unassigned-projects?department=${encodeURIComponent(DEPARTMENT)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/assigned-projects?department=${encodeURIComponent(DEPARTMENT)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            console.log('[DD] unassigned status:', unassignedRes.status, 'assigned status:', assignedRes.status);

            const [unassignedData, assignedData] = await Promise.all([
                unassignedRes.json(),
                assignedRes.json()
            ]);

            console.log('[DD] unassigned:', unassignedData);
            console.log('[DD] assigned:', assignedData);

            let projectList: Project[] = [];
            if (unassignedData.success) projectList = [...projectList, ...(unassignedData.data || [])];
            else console.warn('[DD] unassigned failed:', unassignedData.message);
            if (assignedData.success) projectList = [...projectList, ...(assignedData.data || [])];
            else console.warn('[DD] assigned failed:', assignedData.message);

            console.log('[DD] Total projects loaded:', projectList.length);
            const uniqueProjects = Array.from(new Map(projectList.map(p => [p._id, p])).values());
            uniqueProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setProjects(uniqueProjects);
        } catch (err) {
            console.error('[DD] Load error:', err);
            toast.error('Network error loading projects');
        } finally {
            setLoading(false);
        }
    };

    const handleSendQuote = async () => {
        if (!selectedProject || !quoteAmount || isNaN(Number(quoteAmount))) {
            toast.error('Please enter a valid quote amount.');
            return;
        }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${selectedProject._id}/quote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(quoteAmount),
                    gst: Number(gst) || 0,
                    taxHandling,
                    projectProgress,
                    memberCost: Number(memberCost) || 0
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Quote sent successfully!');
                closeModal();
                loadProjects(token!);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Failed to send quote');
        }
    };

    const handleCreatePaymentForm = async () => {
        if (!selectedProject) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${selectedProject._id}/create-payment-form`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentFormData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment form created!');
                closeModal();
                loadProjects(token!);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Failed to create payment form');
        }
    };

    const handleSendPaymentWarning = async (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/${project._id}/payment-warning`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment reminder sent');
                loadProjects(token!);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleEscalateToHR = async () => {
        if (!selectedProject) return;
        if (!escalationReason.trim() || escalationReason.trim().length < 10) {
            toast.error('Please provide a detailed reason for escalation (min 10 chars)');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/department/message-hr`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `Project Escalation: ${selectedProject.uniqueId}`,
                    message: escalationReason,
                    projectId: selectedProject._id
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Escalated to HR successfully');
                setShowEscalateHRModal(false);
                setEscalationReason('');
                closeModal();
                loadProjects(token!);
            } else {
                toast.error(data.message || 'Failed to escalate');
            }
        } catch (error) {
            console.error('Escalate HR error:', error);
            toast.error('Error escalating to HR');
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedProject(null);
        setQuoteAmount('');
        setSelectedManagerId('');
    };

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchSearch =
                p.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.formData?.titleProject && p.formData.titleProject.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchSearch) return false;
            if (activeTab === 'pending') return p.paymentStatus === 'Pending';
            if (activeTab === 'active') return ['Quote Sent', 'Payment Form Created', 'Payment Submitted', 'Awaiting Approval', 'Awaiting Balance Approval'].includes(p.paymentStatus);
            if (activeTab === 'completed') return ['50% Paid', 'Full Paid', 'Official Receipt Issued'].includes(p.paymentStatus);
            return true;
        });
    }, [projects, searchTerm, activeTab]);

    const stats = useMemo(() => {
        return {
            total: projects.length,
            pendingQuotes: projects.filter(p => p.paymentStatus === 'Pending').length,
            awaitingApproval: projects.filter(p => ['Payment Submitted', 'Awaiting Approval', 'Awaiting Balance Approval'].includes(p.paymentStatus)).length,
            readyToAssign: projects.filter(p => ['50% Paid', 'Full Paid', 'Official Receipt Issued'].includes(p.paymentStatus)).length
        };
    }, [projects]);

    if (accessDenied) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                <button onClick={() => router.push('/Login/Signin')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Return to Login</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Toaster position="top-right" />

            <ServiceDashboardView
                department="Drug Discovery"
                projects={filteredProjects}
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                stats={stats}
                onSendPaymentWarning={handleSendPaymentWarning}
                serviceIcon={<Globe className="w-6 h-6 text-white" />}
            />

            {/* Modals */}
            {modalMode === 'quote' && selectedProject && (
                <ModalWrapper title={selectedProject.quotedAmount ? 'Update Quote' : 'New Quote'} onClose={closeModal}>
                    <div className="space-y-4">
                        <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} className="w-full p-2 border rounded" placeholder="Amount" />
                        <input type="number" value={gst} onChange={(e) => setGst(e.target.value)} className="w-full p-2 border rounded" placeholder="GST %" />
                        <textarea value={projectProgress} onChange={(e) => setProjectProgress(e.target.value)} className="w-full p-2 border rounded h-24" placeholder="Roadmap" />
                        <div className="flex gap-2">
                            <button onClick={closeModal} className="flex-1 p-2 border rounded">Cancel</button>
                            <button onClick={handleSendQuote} className="flex-1 p-2 bg-indigo-600 text-white rounded font-bold">Send</button>
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {showEscalateHRModal && selectedProject && (
                <ModalWrapper title="Escalate to HR" onClose={() => setShowEscalateHRModal(false)}>
                    <div className="space-y-4">
                        <textarea value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} className="w-full p-2 border rounded h-24" placeholder="Reason..." />
                        <div className="flex gap-2">
                            <button onClick={() => setShowEscalateHRModal(false)} className="flex-1 p-2 border rounded">Cancel</button>
                            <button onClick={handleEscalateToHR} className="flex-1 p-2 bg-rose-600 text-white rounded font-bold" disabled={escalationReason.trim().length < 10}>Escalate</button>
                        </div>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}

function ModalWrapper({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 font-bold">
                    {title}
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
