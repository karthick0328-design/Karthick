'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, FolderOpen, Briefcase, Activity, Paperclip, Upload, X, FileText, CheckCircle, CheckSquare, DollarSign, Trash2, Users, PlayCircle, UserPlus, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const ModalWrapper: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-md' }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-[8px] p-4 animate-in fade-in duration-300">
        <div className={`bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] w-full ${maxWidth} overflow-hidden border border-white transform transition-all duration-500 scale-100`}>
            <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-white/40">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900">
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="p-8 max-h-[85vh] overflow-y-auto no-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

// Use the existing Sales ProjectDetailView which contains the financial cards and activity logic.
import ProjectDetailView from './SuperAdminProjectDetailView';
// Alternatively we could use ServiceProjectDetailView but the user's images match ProjectDetailView
import ReceiptModal from '@/components/ReceiptModal';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/adminassignments';
const PROJECT_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';
const PURCHASE_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/purchase';

export default function SuperAdminProjectDetail() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showProfessionalFeeModal, setShowProfessionalFeeModal] = useState(false);
    const [professionalFeeData, setProfessionalFeeData] = useState({ amount: '', description: '', vendorName: '' });

    // Progress Modal States
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressTitle, setProgressTitle] = useState('');
    const [progressNotes, setProgressNotes] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Completion Modal States
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');

    // Quote & Payment Modal States
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
    const [newQuoteAmount, setNewQuoteAmount] = useState('');
    const [gst, setGst] = useState('18');
    const [taxHandling, setTaxHandling] = useState('Included in the total quoted amount');
    const [discount, setDiscount] = useState('0');
    const [quoteItems, setQuoteItems] = useState([
        { sNo: 1, description: '', unit: 'Nos', unitCost: '', total: '' }
    ]);
    const [paymentFormData, setPaymentFormData] = useState({
        title: '',
        projectDescription: '',
        detailedQuotation: '',
        dueDate: ''
    });

    // Dummy user object for role checking inside child components (assume current user is superadmin)
    const [user] = useState({ id: 'superadmin', role: 'superadmin', name: 'Super Admin' });

    // Assignment States
    const [serviceManagers, setServiceManagers] = useState<any[]>([]);
    const [tls, setTls] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showAssignTLModal, setShowAssignTLModal] = useState(false);
    const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
    const [showApprovePaymentModal, setShowApprovePaymentModal] = useState(false);
    const [showEscalateHRModal, setShowEscalateHRModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [taskNotes, setTaskNotes] = useState('');
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [serviceFilter, setServiceFilter] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        fetchProjectDetails(token);
    }, [projectId]);

    useEffect(() => {
        if (project?.department) {
            setServiceFilter(project.department);
        }
    }, [project]);

    useEffect(() => {
        if (showAssignModal || showAssignTLModal || showAssignTeamModal) {
            const token = localStorage.getItem('token');
            if (token) {
                if (showAssignModal) loadServiceManagers();
                if (showAssignTLModal) fetchTLs();
                if (showAssignTeamModal) fetchEmployees();
            }
        }
    }, [serviceFilter, showAssignModal, showAssignTLModal, showAssignTeamModal]);

    const fetchProjectDetails = async (token: string) => {
        try {
            const response = await fetch(`${API_BASE}/projects/all/${projectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setProject(data.data);
                if (data.data.messages) {
                    setChatMessages(data.data.messages);
                }
            } else {
                // FALLBACK: Try fetching from Purchase Orders API if project not found
                const poResponse = await fetch(`${PURCHASE_API_BASE}/${projectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const poData = await poResponse.json();

                if (poData.success) {
                    // Normalize PO data to Project structure
                    const NormalizedPO = {
                        ...poData.data,
                        department: poData.data.category || 'FINANCIAL',
                        uniqueId: poData.data.uniqueId || 'PO-INITIATIVE',
                        quotedAmount: poData.data.requestedAmount || 0,
                        paymentDetails: {
                            paidAmount: poData.data.purchaseDetails?.amountSent || 0,
                            status: poData.data.purchaseDetails?.status || 'Pending'
                        },
                        activities: poData.data.activities || [],
                        linkedPurchaseOrders: [poData.data],
                        isStandalonePurchase: true
                    };
                    setProject(NormalizedPO);
                } else {
                    toast.error(data.message || 'Failed to fetch project details');
                }
            }
        } catch (error) {
            console.error('Error fetching project:', error);
            toast.error('Error fetching project details');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (token: string) => {
        try {
            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setChatMessages(data.data?.messages || []);
            }
        } catch (error) {
            console.error('Load messages error:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: messageInput.trim() })
            });
            const data = await response.json();
            if (data.success) {
                setMessageInput('');
                loadMessages(token!);
                toast.success('Message sent');
            } else {
                toast.error(data.message || 'Failed to send message');
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const handleGenerateReceipt = async () => {
        if (project?.receipt?.data) {
            setShowReceiptModal(true);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/receipt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Receipt initialized!');
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to initialize receipt');
            }
        } catch (error) {
            toast.error('Error initializing receipt');
        }
    };

    const handleUpdateProfessionalFee = async () => {
        try {
            const token = localStorage.getItem('token');
            const method = project?.professionalFee?.amount > 0 ? 'PUT' : 'POST';

            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/professional-fee`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: Number(professionalFeeData.amount),
                    description: professionalFeeData.description,
                    vendorName: professionalFeeData.vendorName
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`Professional fee ${method === 'POST' ? 'added' : 'updated'} successfully`);
                setShowProfessionalFeeModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to process fee');
            }
        } catch (error) {
            console.error('Error updating professional fee:', error);
            toast.error('Error updating professional fee');
        }
    };

    const loadServiceManagers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/managers?service=${serviceFilter || project?.department}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setServiceManagers(data.data || []);
            }
        } catch (error) {
            console.error('Error loading managers:', error);
        }
    };

    const fetchTLs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/department/tls?service=${serviceFilter || project?.department}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Note: The endpoint might be /tl/employees or something else in projectRoutes.
            // Based on grep, /api/projects/tl/employees seems to exist.
            const data = await response.json();
            if (data.success) {
                setTls(data.data || []);
            }
        } catch (error) {
            console.error('Error loading TLs:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/tl/employees?service=${serviceFilter || project?.department}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setEmployees(data.data || []);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const handleAssignManager = async (managerId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/assign-to-department/${projectId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ department: project.department, managerId })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Project assigned successfully');
                setShowAssignModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to assign project');
            }
        } catch (error) {
            toast.error('Error assigning project');
        }
    };

    const handleAssignTL = async (teamLeadId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/department/assigned-projects/${projectId}/assign-tl`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamLeadId })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('TL assigned successfully');
                setShowAssignTLModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to assign TL');
            }
        } catch (error) {
            toast.error('Error assigning TL');
        }
    };

    const handleAssignTeam = async () => {
        if (selectedTeamMembers.length === 0) {
            toast.error('Please select at least one team member');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/tl/assigned-projects/${projectId}/assign-team`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ memberIds: selectedTeamMembers })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Team assigned successfully');
                setShowAssignTeamModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to assign team');
            }
        } catch (error) {
            toast.error('Error assigning team');
        }
    };

    const handleStartTask = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/department/assigned-projects/${projectId}/start-task`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskNotes })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Task started successfully');
                setShowTaskModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to start task');
            }
        } catch (error) {
            toast.error('Error starting task');
        }
    };

    const handleUpdateProgress = async () => {
        if (!progressTitle.trim() || !progressNotes.trim()) {
            toast.error('Please enter both title and notes');
            return;
        }
        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('progressTitle', progressTitle);
            formData.append('progressNotes', progressNotes);
            selectedFiles.forEach(file => {
                formData.append('attachments', file);
            });

            // Note: For Super Admin we use the same department manager endpoint as it's modified to allow admins.
            const response = await fetch(`${PROJECT_API_BASE}/department/assigned-projects/${projectId}/update-progress`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Progress updated successfully!');
                setShowProgressModal(false);
                setProgressTitle('');
                setProgressNotes('');
                setSelectedFiles([]);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to update progress');
            }
        } catch (error) {
            console.error('Progress update error:', error);
            toast.error('Error updating progress');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCompleteProject = async () => {
        if (!completionNotes.trim()) {
            toast.error('Please enter completion notes');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/department/assigned-projects/${projectId}/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ completionNotes })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Project completed successfully!');
                setShowCompleteModal(false);
                setCompletionNotes('');
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to complete project');
            }
        } catch (error) {
            console.error('Project completion error:', error);
            toast.error('Error completing project');
        }
    };

    const calculateGrandTotal = () => {
        const subtotal = quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
        const gstAmount = subtotal * (Number(gst || 0) / 100);
        const totalWithTax = subtotal + gstAmount;
        const discountAmount = Number(discount || 0);
        return Math.max(0, (totalWithTax) - discountAmount);
    };

    const handleUpdateQuote = async () => {
        try {
            const token = localStorage.getItem('token');
            const subtotal = quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
            const totalToSubmit = calculateGrandTotal();
            const itemizedText = quoteItems.map(item => `${item.description}: ${item.unitCost} = ${item.total}`).join('\n');

            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/quote`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: totalToSubmit,
                    gst: Number(gst) || 0,
                    taxHandling,
                    projectProgress: itemizedText,
                    baseAmount: subtotal,
                    discount: Number(discount) || 0
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Quote updated successfully!');
                setShowQuoteModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to update quote');
            }
        } catch (error) {
            toast.error('Error updating quote');
        }
    };

    const handleCreatePaymentForm = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${PROJECT_API_BASE}/${projectId}/create-payment-form`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentFormData)
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Payment form created!');
                setShowPaymentFormModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to create payment form');
            }
        } catch (error) {
            toast.error('Error creating payment form');
        }
    };

    const openQuoteModal = () => {
        if (!project) return;
        setNewQuoteAmount(String(project.quotedAmount || ''));
        setGst(String(project.gst || '18'));
        setTaxHandling(project.taxHandling || 'Included in the total quoted amount');

        // Parse itemized quote if available
        if (project.projectProgress && project.projectProgress.includes(' = ')) {
            const lines = project.projectProgress.split('\n');
            const parsedItems = lines.map((line: string) => {
                const parts = line.split(' = ');
                if (parts.length < 2) return null;
                const descRest = parts[0];
                const total = parts[1];
                const descParts = descRest.split(': ');
                const description = descParts[0];
                const unitCost = descParts[1] || total;
                return {
                    description: description || '',
                    unitCost: unitCost || '',
                    total: total || ''
                };
            }).filter((item: any) => item !== null);

            if (parsedItems.length > 0) {
                setQuoteItems((parsedItems as any).map((item: any, idx: number) => ({ ...item, sNo: idx + 1, unit: 'Nos' })));
            } else {
                setQuoteItems([{ sNo: 1, description: '', unit: 'Nos', unitCost: '', total: '' }]);
            }
        } else {
            setQuoteItems([{ sNo: 1, description: '', unit: 'Nos', unitCost: '', total: '' }]);
        }
        setDiscount(String(project.discount || '0'));
        setShowQuoteModal(true);
    };

    const openPaymentFormModal = () => {
        if (!project) return;
        const services = Array.isArray(project.formData?.services)
            ? project.formData.services.join(', ')
            : String(project.formData?.services || 'N/A');

        setPaymentFormData({
            title: String(project.formData?.titleProject || project.formData?.compoundName || 'Project Payment'),
            projectDescription: `Professional service for ${services}`,
            detailedQuotation: [
                `Project ID: ${project.uniqueId}`,
                `Subtotal: ₹${project.baseAmount || project.quotedAmount || 0}`,
                `Tax (${project.gst || 18}%): ₹${((project.baseAmount || project.quotedAmount || 0) * (project.gst || 18) / 100).toFixed(2)}`,
                `Discount: ₹${project.discount || 0}`,
                `Total Payable: ₹${project.quotedAmount || 0}`
            ].join('\n'),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setShowPaymentFormModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Decrypting Project Data...
                </p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center border-t border-slate-200 p-8">
                <div className="text-center space-y-6 max-w-lg">
                    <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto border border-slate-100">
                        <FolderOpen className="w-10 h-10 text-slate-300" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Project Not Found</h2>
                        <p className="text-slate-500 mt-2 font-medium">The requested project ID does not exist or you do not have sufficient permissions to view it.</p>
                    </div>
                    <Link
                        href="/super-admin-dashboard/projects"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <ArrowLeft size={18} /> BACK TO PROJECTS
                    </Link>
                </div>
            </div>
        );
    }

    // Pass placeholder actions since Super Admin is primarily view-only here. 
    // Additional capabilities can be hooked up if requested.
    // Only specific capabilities are enabled for Super Admin
    const actualActions = {
        openQuoteModal,
        openPaymentFormModal,
        setShowApprovePaymentModal,
        handleGenerateReceipt,
        setShowReceiptModal,
        setShowEscalateHRModal,
        setShowAssignModal,
        setShowProfessionalFeeModal: (val: boolean) => {
            if (val && project) {
                setProfessionalFeeData({
                    amount: project.professionalFee?.amount || '',
                    description: project.professionalFee?.description || '',
                    vendorName: project.professionalFee?.vendorName || ''
                });
            }
            setShowProfessionalFeeModal(val);
        },
        handleUpdateProfessionalFee,
        loadServiceManagers,
        setShowUploadModal,
        setShowProgressModal,
        setShowCompleteModal,
        handleAssignManager,
        fetchTLs,
        setShowAssignTLModal,
        handleAssignTL,
        fetchEmployees,
        setShowAssignTeamModal,
        handleAssignTeam,
        selectedTeamMembers,
        setSelectedTeamMembers,
        setShowTaskModal,
        handleStartTask,
        taskNotes,
        setTaskNotes,
        serviceManagers,
        tls,
        employees
    };

    return (
        <div className="bg-white min-h-[calc(100vh-80px)]">
            <Toaster position="top-right" />
            <ProjectDetailView
                project={project}
                user={user}
                loading={loading}
                chatMessages={chatMessages}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                handleSendMessage={handleSendMessage}
                messagesEndRef={messagesEndRef}
                backUrl="/super-admin-dashboard/projects"
                subtitle="Super Admin Global View"
                serviceIcon={<FolderOpen className="w-4 h-4 text-indigo-500" />}
                actions={actualActions}
            />

            {showProfessionalFeeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Professional Fee</h2>
                                <p className="text-sm text-gray-500">Service expert remuneration</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:border-blue-600 focus-within:bg-white transition-all">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fee Amount</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        value={professionalFeeData.amount}
                                        onChange={e => setProfessionalFeeData({ ...professionalFeeData, amount: e.target.value })}
                                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold text-gray-900"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:border-blue-600 focus-within:bg-white transition-all">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fee Description</label>
                                <textarea
                                    value={professionalFeeData.description}
                                    onChange={e => setProfessionalFeeData({ ...professionalFeeData, description: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-gray-700 resize-none h-32 placeholder:text-gray-300"
                                    placeholder="Remuneration details..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowProfessionalFeeModal(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateProfessionalFee}
                                className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
                            >
                                Save Fee Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal - open for creating OR editing */}
            {showReceiptModal && (
                <ReceiptModal
                    isOpen={showReceiptModal}
                    onClose={() => setShowReceiptModal(false)}
                    receiptData={project.receipt?.data || {
                        receiptId: `REC-${project.uniqueId}`,
                        items: [],
                        amount: project.paymentDetails?.amount || project.quotedAmount || 0,
                        paidAmount: project.paymentDetails?.paidAmount || 0,
                        remainingAmount: (project.paymentDetails?.amount || project.quotedAmount || 0) - (project.paymentDetails?.paidAmount || 0),
                        baseAmount: project.baseAmount || 0,
                        gst: project.gst || 18,
                        taxHandling: project.taxHandling || 'Excluded',
                        professionalFee: project.professionalFee,
                        memberCost: project.memberCost || 0,
                        projectUniqueId: project.uniqueId,
                        userDetails: {
                            name: project.userId.name,
                            email: project.userId.email,
                            phone: project.userId.phone || 'N/A',
                            uniqueId: project.userId.uniqueId,
                            branch: project.userId.branch || 'N/A',
                            address: project.formData?.address || 'N/A',
                            gstin: project.formData?.gstin || 'N/A'
                        },
                        projectDetails: {
                            title: project.paymentDetails?.title || project.category,
                            description: project.paymentDetails?.projectDescription || project.department,
                            quotation: project.paymentDetails?.detailedQuotation || 'Service Quotation',
                            department: project.department
                        },
                        issuedAt: new Date().toISOString(),
                        dueDate: project.paymentDetails?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        issuedBy: user?.name || 'Super Admin'
                    }}
                    readOnly={false}
                    onSave={async (updatedData: any) => {
                        const token = localStorage.getItem('token');
                        if (!project.receipt) {
                            const initRes = await fetch(`${PROJECT_API_BASE}/${projectId}/receipt`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({})
                            });
                            const initData = await initRes.json();
                            if (!initData.success) {
                                toast.error('Failed to initialize receipt');
                                return;
                            }
                        }
                        const res = await fetch(`${PROJECT_API_BASE}/${projectId}/receipt`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedData)
                        });
                        const data = await res.json();
                        if (data.success) {
                            toast.success('Bill saved — Download Receipt is now unlocked!');
                            setShowReceiptModal(false);
                            fetchProjectDetails(token!);
                        } else {
                            toast.error(data.message || 'Failed to update receipt');
                        }
                    }}
                />
            )}

            {showProgressModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full p-10 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100">
                                <Activity className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Update Progress</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Document current phase integrity</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-10">
                            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 focus-within:border-indigo-500 focus-within:bg-white transition-all group">
                                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 leading-none">Update Title</label>
                                <input
                                    type="text"
                                    value={progressTitle}
                                    onChange={e => setProgressTitle(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-base font-black text-slate-800 placeholder:text-slate-300"
                                    placeholder="Phase completion milestone..."
                                />
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 focus-within:border-indigo-500 focus-within:bg-white transition-all group">
                                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 leading-none">Detailed Logs</label>
                                <textarea
                                    value={progressNotes}
                                    onChange={e => setProgressNotes(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-[14px] font-bold text-slate-700 resize-none h-40 placeholder:text-slate-300"
                                    placeholder="Technical execution summary..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Paperclip size={24} className="text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Attach Proof</p>
                                    </div>
                                    <input type="file" className="hidden" multiple onChange={(e) => {
                                        if (e.target.files) setSelectedFiles(Array.from(e.target.files).slice(0, 5));
                                    }} />
                                </label>

                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group/file">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={14} className="text-indigo-400" />
                                                    <span className="text-[11px] font-bold text-indigo-900 truncate">{f.name}</span>
                                                </div>
                                                <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-indigo-300 hover:text-rose-500 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowProgressModal(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-[11px] uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateProgress}
                                disabled={isUploading}
                                className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
                                        <span>Update Pipeline</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full p-10 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-5 mb-10">
                            <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-100">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Complete Project</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Seal pipeline execution</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 focus-within:border-emerald-500 focus-within:bg-white transition-all group mb-10">
                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 leading-none">Completion Summary</label>
                            <textarea
                                value={completionNotes}
                                onChange={e => setCompletionNotes(e.target.value)}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-[14px] font-bold text-slate-700 resize-none h-40 placeholder:text-slate-300"
                                placeholder="Final execution logs and results summary..."
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowCompleteModal(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-[11px] uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompleteProject}
                                className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-emerald-100 text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 group"
                            >
                                <CheckSquare size={16} />
                                <span>Complete Project</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showQuoteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full p-8 animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic font-serif">Financial Quotation</h2>
                                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase italic">Economic Modeling & Tax Strategy</p>
                                </div>
                            </div>
                            <button onClick={() => setShowQuoteModal(false)} className="p-3 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/50">
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16 text-center italic">ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Description of Service</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 italic">Unit</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Cost (₹)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest italic text-right">Total (₹)</th>
                                            <th className="px-4 py-4 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {quoteItems.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-indigo-50/30 transition-all">
                                                <td className="px-4 py-5 text-center">
                                                    <span className="text-[11px] font-black text-slate-300 italic">{idx + 1}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            setQuoteItems(quoteItems.map((it, i) =>
                                                                i === idx ? { ...it, description: e.target.value } : it
                                                            ));
                                                        }}
                                                        placeholder="Service identifier..."
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-bold text-slate-700 placeholder:text-slate-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-5">
                                                    <select
                                                        value={item.unit}
                                                        onChange={(e) => {
                                                            setQuoteItems(quoteItems.map((it, i) =>
                                                                i === idx ? { ...it, unit: e.target.value } : it
                                                            ));
                                                        }}
                                                        className="w-full bg-slate-50/50 border-none rounded-lg text-[11px] font-black text-slate-600 focus:ring-2 focus:ring-indigo-100"
                                                    >
                                                        <option value="Nos">Nos</option>
                                                        <option value="Hrs">Hrs</option>
                                                        <option value="Days">Days</option>
                                                        <option value="Pkt">Pkt</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <input
                                                        type="number"
                                                        value={item.unitCost}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setQuoteItems(quoteItems.map((it, i) =>
                                                                i === idx ? { ...it, unitCost: val, total: val } : it
                                                            ));
                                                        }}
                                                        className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-black text-slate-900 text-right placeholder:text-slate-200"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-[13px] font-black text-slate-900 text-right">
                                                        ₹{Number(item.total || 0).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-right">
                                                    {quoteItems.length > 1 && (
                                                        <button
                                                            onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button
                                    onClick={() => setQuoteItems([...quoteItems, { sNo: quoteItems.length + 1, description: '', unit: 'Nos', unitCost: '', total: '' }])}
                                    className="w-full py-4 bg-slate-50 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 border-t border-slate-100"
                                >
                                    <RefreshCw size={12} /> Append Service Line
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block italic">Tax (GST %)</label>
                                    <input
                                        type="number"
                                        value={gst}
                                        onChange={(e) => setGst(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800"
                                    />
                                </div>
                                <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block italic">Discount (₹)</label>
                                    <input
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800"
                                    />
                                </div>
                                <div className="p-6 bg-indigo-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-center items-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Grand Total</p>
                                    <p className="text-3xl font-black italic tracking-tight">₹{calculateGrandTotal().toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowQuoteModal(false)}
                                    className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-serif italic"
                                >
                                    Abort Operation
                                </button>
                                <button
                                    onClick={handleUpdateQuote}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 italic"
                                >
                                    Release Quotation Protocol
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentFormModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 text-white">
                                    <FileText size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-serif italic">Initialize Billing</h2>
                                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase italic">Fiscal Document Preparation System</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPaymentFormModal(false)} className="p-3 hover:bg-rose-50 hover:text-rose-600 transition-colors text-slate-400 rounded-2xl">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic pl-2">Bill Title</label>
                                    <input
                                        type="text"
                                        value={paymentFormData.title}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, title: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                                        placeholder="Enter document title..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic pl-2">Due Date</label>
                                    <input
                                        type="date"
                                        value={paymentFormData.dueDate}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, dueDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic pl-2">Operational Scope (Description)</label>
                                <textarea
                                    value={paymentFormData.projectDescription}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, projectDescription: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 h-24 focus:ring-4 focus:ring-emerald-50 outline-none transition-all resize-none"
                                    placeholder="Summarize project scope for billing purposes..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic pl-2">Strategic Billing Narrative (Internal Audit)</label>
                                <textarea
                                    value={paymentFormData.detailedQuotation}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, detailedQuotation: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black text-slate-600 h-32 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-mono"
                                    placeholder="Enter itemized breakdown and fiscal notes..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setShowPaymentFormModal(false)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 font-serif italic">Abort Initialization</button>
                                <button onClick={handleCreatePaymentForm} className="flex-[2] py-5 bg-emerald-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100 font-serif italic">Authorize & Deploy Bill</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showAssignModal && (
                <ModalWrapper title="Assign Service Manager" onClose={() => setShowAssignModal(false)} maxWidth="max-w-lg">
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                            <UserPlus className="w-6 h-6 text-indigo-600 mt-1" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Manager Allocation</p>
                                <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Select a manager to lead this project</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-indigo-600 focus-within:bg-white transition-all">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Load from Service Department</label>
                            <input
                                type="text"
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                placeholder="Enter service name (e.g. BIOLOGY, CHEMISTRY)"
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-black text-slate-800 uppercase placeholder:text-slate-200"
                            />
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                            {serviceManagers.map(mgr => (
                                <button
                                    key={mgr._id}
                                    onClick={() => handleAssignManager(mgr._id)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-50 bg-white hover:border-indigo-600 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                        {mgr.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600">{mgr.name}</p>
                                            <span className="text-[9px] font-black text-white bg-indigo-600 px-2 py-0.5 rounded capitalize">Manager</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(mgr.services || [mgr.department]).map((s: string, i: number) => (
                                                <span key={i} className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90" />
                                </button>
                            ))}
                            {serviceManagers.length === 0 && (
                                <p className="text-center py-8 text-slate-400 font-medium italic">No managers found for this department.</p>
                            )}
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {showAssignTLModal && (
                <ModalWrapper title="Assign Team Lead" onClose={() => setShowAssignTLModal(false)} maxWidth="max-w-lg">
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                            <UserPlus className="w-6 h-6 text-indigo-600 mt-1" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">TL Allocation</p>
                                <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Select a Lead Operator</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-indigo-600 focus-within:bg-white transition-all">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Load Local Specialists</label>
                            <input
                                type="text"
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                placeholder="Enter service name..."
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-black text-slate-800 uppercase placeholder:text-slate-200"
                            />
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                            {tls.map(tl => (
                                <button
                                    key={tl._id}
                                    onClick={() => handleAssignTL(tl._id)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-50 bg-white hover:border-indigo-600 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                        {tl.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600">{tl.name}</p>
                                            <span className="text-[9px] font-black text-white bg-violet-600 px-2 py-0.5 rounded capitalize">Lead</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(tl.services || [tl.department]).map((s: string, i: number) => (
                                                <span key={i} className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90" />
                                </button>
                            ))}
                        </div>
                    </div>
                </ModalWrapper>
            )}

            {showAssignTeamModal && (
                <ModalWrapper title="Assign Project Team" onClose={() => setShowAssignTeamModal(false)} maxWidth="max-w-lg">
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                            <Users className="w-6 h-6 text-emerald-600 mt-1" />
                            <div className="flex-1">
                                <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Team Synchronization</p>
                                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Assign field assets to this project</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:border-emerald-600 focus-within:bg-white transition-all">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Sync Field Service</label>
                            <input
                                type="text"
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                placeholder="Enter service pool..."
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-black text-slate-800 uppercase placeholder:text-slate-200"
                            />
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                            {employees.map(emp => (
                                <label
                                    key={emp._id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedTeamMembers.includes(emp._id) ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTeamMembers.includes(emp._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedTeamMembers([...selectedTeamMembers, emp._id]);
                                            else setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== emp._id));
                                        }}
                                        className="hidden"
                                    />
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${selectedTeamMembers.includes(emp._id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100'}`}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-900">{emp.name}</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(emp.services || [emp.department]).map((s: string, i: number) => (
                                                <span key={i} className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={handleAssignTeam}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100"
                        >
                            Initialize Team Deployment
                        </button>
                    </div>
                </ModalWrapper>
            )}

            {showTaskModal && (
                <ModalWrapper title="Initialize Operational Task" onClose={() => setShowTaskModal(false)}>
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                            <PlayCircle className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                                <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Execution Start</p>
                                <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider mt-1">Deploying resources for {project.uniqueId}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 focus-within:border-blue-500 focus-within:bg-white transition-all group">
                            <label className="block text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 leading-none">Task Protocols/Notes</label>
                            <textarea
                                value={taskNotes}
                                onChange={e => setTaskNotes(e.target.value)}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-[14px] font-bold text-slate-700 resize-none h-32 placeholder:text-slate-300"
                                placeholder="Enter operational notes or initialization protocols..."
                            />
                        </div>
                        <button
                            onClick={handleStartTask}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl shadow-blue-100"
                        >
                            Confirm Execution Release
                        </button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}
