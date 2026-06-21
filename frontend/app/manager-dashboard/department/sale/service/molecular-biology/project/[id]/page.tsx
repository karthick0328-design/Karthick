'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Activity, Briefcase, CheckSquare, Clock, Mail, Phone,
    PlayIcon, Search, Send, User, XCircle, ChevronRight,
    Beaker, Dna, Microscope, FlaskConical, DollarSign, AlertCircle, ArrowLeft,
    UserPlus, Calendar, CreditCard, CheckCircle, FileText, Download, X, Receipt, Trash2, Upload, Paperclip
} from 'lucide-react';
import Link from 'next/link';
import ReceiptModal from '@/components/ReceiptModal';
import ProjectDetailView from '@/app/Manager-Compontent/sales/shared/ProjectDetailView';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// --- Types ---
interface Project {
    [x: string]: any;
    _id: string;

    uniqueId: string;
    userId: {
        name: string;
        email: string;
        uniqueId: string;
        department: string;
        phone?: string;
        branch?: string;
    };
    department: string;
    category: string;
    status: 'Under Review' | 'In Progress' | 'Completed' | 'On Hold';
    paymentStatus: string;
    quotedAmount?: number;
    // Advanced features
    gst?: number;
    taxHandling?: string;
    projectProgress?: string;
    formData?: {
        geneName?: string;
        vector?: string;
        sequenceLength?: string;
        timeline?: string;
        remarks?: string;
        services?: string[];
        [key: string]: string | number | boolean | string[] | undefined;
    };
    remarks?: string;
    submitterRemarks?: string;
    createdAt: string;
    assignedTo?: Array<{ _id: string; name: string; email: string; uniqueId: string }>;
    activities?: Array<{
        _id?: string;
        description: string;
        timestamp: string;
        updatedBy: { name: string; role: string };
        remarks?: string;
        visibility?: string;
    }>;
    paymentDetails?: {
        amount: number;
        paidAmount: number;
        paymentMethod?: string;
        status?: string;
        dueDate?: string;
        checkNumber?: string;
        bankName?: string;
        upiId?: string;
        title?: string;
        projectDescription?: string;
        detailedQuotation?: string;
    };

    receipt?: any;
}

export default function MolecularBiologySalesProjectDetails() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;
    const action = searchParams.get('action');
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Modal states
    const [showEscalateHRModal, setShowEscalateHRModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
    const [showApprovePaymentModal, setShowApprovePaymentModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showProfessionalFeeModal, setShowProfessionalFeeModal] = useState(false);


    // Form states
    const [newQuoteAmount, setNewQuoteAmount] = useState('');
    const [gst, setGst] = useState('');
    const [taxHandling, setTaxHandling] = useState('');
    const [projectProgress, setProjectProgress] = useState('');
    const [professionalFeeData, setProfessionalFeeData] = useState({
        amount: '',
        vendorName: '',
        description: ''
    });

    const [escalationReason, setEscalationReason] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);
    const [serviceManagers, setServiceManagers] = useState<any[]>([]);
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [loadingManagers, setLoadingManagers] = useState(false);
    const [quoteItems, setQuoteItems] = useState([
        { description: '', unitCost: '', total: '' }
    ]);

    // Auto-fill quotation details when amount is entered
    useEffect(() => {
        if (newQuoteAmount && !gst && !taxHandling && !projectProgress) {
            setGst('18');
            setTaxHandling('Included in the total quoted amount');
        }
    }, [newQuoteAmount]);

    const calculateGrandTotal = (includeFee = false) => {
        const subtotal = quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
        const gstAmount = subtotal * (Number(gst || 0) / 100);
        const fee = includeFee ? (Number(project?.professionalFee?.amount) || 0) : 0;
        return subtotal + gstAmount + fee;
    };

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadFiles = async () => {
        if (uploadFiles.length === 0) return;
        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            uploadFiles.forEach(file => formData.append('attachments', file));

            const res = await fetch(`${API_BASE}/${projectId}/attachments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Documents uploaded successfully');
                setShowUploadModal(false);
                setUploadFiles([]);
                fetchProjectDetails(token || '');
            } else {
                toast.error(data.message || 'Failed to upload documents');
            }
        } catch (err) {
            toast.error('Error uploading documents');
        } finally {
            setIsUploading(false);
        }
    };

    const openQuoteModal = () => {
        if (!project) return;
        setNewQuoteAmount(String(project.quotedAmount || ''));
        setGst(String(project.gst || '18'));
        setTaxHandling(project.taxHandling || 'Included in the total quoted amount');
        setProjectProgress(project.projectProgress || '');

        // Parse itemized quote if available
        if (project.projectProgress && project.projectProgress.includes(' = ')) {
            const lines = project.projectProgress.split('\n');
            const parsedItems = lines.map(line => {
                const [descRest, total] = line.split(' = ');
                if (!descRest || !total) return null;
                const [description, unitCost] = descRest.split(': ');
                return {
                    description: description || '',
                    unitCost: unitCost || '',
                    total: total || ''
                };
            }).filter((item): item is { description: string; unitCost: string; total: string } =>
                item !== null && (item.description !== '' || item.total !== '')
            );

            if (parsedItems.length > 0) {
                setQuoteItems(parsedItems);
            } else {
                setQuoteItems([{ description: '', unitCost: '', total: '' }]);
            }
        } else {
            setQuoteItems([{ description: '', unitCost: '', total: '' }]);
        }
        setShowQuoteModal(true);
    };

    const [paymentFormData, setPaymentFormData] = useState({
        title: '',
        projectDescription: '',
        detailedQuotation: '',
        dueDate: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }

        try {
            const decoded: any = jwtDecode(token);
            setUser(decoded);
            fetchProjectDetails(token);
            loadMessages(token);
        } catch (error) {
            router.push('/Login/Signin');
        }
    }, [projectId]);




    const fetchProjectDetails = async (token: string) => {
        try {
            const response = await fetch(`${API_BASE}/${projectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setProject(data.data);
            } else {
                toast.error(data.message || 'Failed to fetch project details');
            }
        } catch (error) {
            toast.error('Error fetching project details');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (token: string) => {
        try {
            const response = await fetch(`${API_BASE}/${projectId}/messages`, {
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

    // --- Actions ---

    const handleUpdateQuote = async (totalAmount?: number) => {
        try {
            const token = localStorage.getItem('token');
            const subtotal = quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
            const totalToSubmit = calculateGrandTotal();

            // Format line items for detailedQuotation
            const itemizedText = quoteItems.map(item => `${item.description}: ${item.unitCost} = ${item.total}`).join('\n');

            const response = await fetch(`${API_BASE}/${projectId}/quote`, {
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
                    baseAmount: subtotal
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
            const response = await fetch(`${API_BASE}/${projectId}/create-payment-form`, {
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

    const handleApprovePayment = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${projectId}/approve-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Payment approved!');
                setShowApprovePaymentModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to approve payment');
            }
        } catch (error) {
            toast.error('Error approving payment');
        }
    };

    const handleGenerateReceipt = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${projectId}/receipt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Receipt generated!');
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to generate receipt');
            }
        } catch (error) {
            toast.error('Error generating receipt');
        }
    };

    const handleEscalateToHR = async () => {
        if (escalationReason.trim().length < 10) {
            toast.error('Please provide a detailed reason for escalation (min 10 chars)');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/department/message-hr`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: `Project Escalation: ${project?.uniqueId}`,
                    message: escalationReason,
                    projectId: projectId
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Escalated to HR successfully');
                setShowEscalateHRModal(false);
                setEscalationReason('');
            } else {
                toast.error(data.message || 'Failed to escalate');
            }
        } catch (error) {
            toast.error('Error escalating to HR');
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${projectId}/messages`, {
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
            }
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const loadServiceManagers = async () => {
        if (!project) return;
        setLoadingManagers(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/managers?department=${encodeURIComponent(project.department)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setServiceManagers(data.data || []);
            } else {
                console.warn('No managers found:', data.message);
                setServiceManagers([]);
            }
        } catch (error) {
            console.error('Load managers error:', error);
            toast.error('Failed to load service managers');
            setServiceManagers([]);
        } finally {
            setLoadingManagers(false);
        }
    };

    const handleAssignToManager = async () => {
        if (!selectedManagerId) {
            toast.error('Please select a service manager');
            return;
        }
        if (!project) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/assign-to-department/${project._id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    department: project.department,
                    managerId: selectedManagerId
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Project assigned successfully!');
                setShowAssignModal(false);
                setSelectedManagerId('');
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to assign project');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            toast.error('Error assigning project');
        }
    };

    const handleUpdateProfessionalFee = async () => {
        if (!professionalFeeData.amount || isNaN(Number(professionalFeeData.amount))) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const method = project?.professionalFee?.amount ? 'PUT' : 'POST';
            const response = await fetch(`${API_BASE}/${projectId}/professional-fee`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: Number(professionalFeeData.amount),
                    vendorName: professionalFeeData.vendorName,
                    description: professionalFeeData.description
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(project?.professionalFee?.amount ? 'Professional fee updated!' : 'Professional fee added!');
                setShowProfessionalFeeModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to update professional fee');
            }
        } catch (error) {
            toast.error('Error updating professional fee');
        }
    };

    const openPaymentFormModal = () => {
        if (!project) return;

        const services = Array.isArray(project.formData?.services)
            ? project.formData.services.join(', ')
            : String(project.formData?.services || 'N/A');

        setPaymentFormData({
            title: String(project.formData?.sampleName ? `Mol. Bio Analysis - ${project.formData.sampleName}` : project.formData?.species || 'Project Payment'),
            projectDescription: `Molecular Biology service for ${services}`,
            detailedQuotation: [
                `Project Title: ${String(project.formData?.sampleName || 'N/A')}`,
                `Target Position: ${String(project.formData?.species || 'N/A')}`,
                `Methodology: ${String(project.formData?.concentration ? `Concentration: ${project.formData.concentration} ng/µL` : 'N/A')}`,
                `Expected Outcome: ${String(project.formData?.totalAmount ? `Total Amount: ${project.formData.totalAmount}` : 'N/A')}`,
                `Compound Details: ${String(project.formData?.od260280 ? `OD 260/280: ${project.formData.od260280}` : 'N/A')}`,
                `Toxicity Assay: ${String(project.formData?.ratio28s18s ? `28S/18S Ratio: ${project.formData.ratio28s18s}` : 'N/A')}`,
                `Enrolled Services: ${services}`
            ].join('\n'),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +14 days
        });
        setShowPaymentFormModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                    <Dna className="w-12 h-12 text-teal-600 animate-bounce mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-20" />
                <h2 className="text-2xl font-bold text-gray-900">Project Not Found</h2>
                <Link href="/manager-dashboard/department/sale/service/molecular-biology" className="text-teal-600 font-semibold hover:underline flex items-center justify-center gap-2 mt-4">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
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
                backUrl="/manager-dashboard/department/sale/service/molecular-biology"
                subtitle="Molecular Biology Research Service"
                serviceIcon={<Dna className="w-4 h-4 text-rose-500" />}
                actions={{
                    openQuoteModal,
                    openPaymentFormModal,
                    setShowApprovePaymentModal,
                    handleGenerateReceipt,
                    setShowReceiptModal,
                    setShowEscalateHRModal,
                    setShowAssignModal,
                    setShowProfessionalFeeModal,
                    handleUpdateProfessionalFee,
                    loadServiceManagers,
                    setShowUploadModal
                }}
            />

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                    <Upload size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Upload Documents</h2>
                                    <p className="text-blue-100 text-xs">Add files to this project</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Paperclip size={32} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm text-gray-600 font-bold">Click to select files</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Max 5 files</p>
                                </div>
                                <input type="file" className="hidden" multiple onChange={(e) => {
                                    if (e.target.files) setUploadFiles(Array.from(e.target.files).slice(0, 5));
                                }} />
                            </label>

                            {uploadFiles.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Selected Files</span>
                                        <span className="text-[10px] font-bold text-blue-600">{uploadFiles.length}/5</span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {uploadFiles.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={16} className="text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-700 truncate">{f.name}</span>
                                                </div>
                                                <button onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 trasition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadFiles}
                                    disabled={uploadFiles.length === 0 || isUploading}
                                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={14} />
                                            <span>Start Upload</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}



            {showQuoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full p-8 animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Project Quotation</h2>
                                    <p className="text-sm text-gray-500">Define service costs and taxation</p>
                                </div>
                            </div>
                            <button onClick={() => setShowQuoteModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit Cost</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                                            <th className="px-4 py-4 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {quoteItems.map((item, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50 transition-all">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            setQuoteItems(quoteItems.map((item, i) =>
                                                                i === idx ? { ...item, description: e.target.value } : item
                                                            ));
                                                        }}
                                                        placeholder="Service description"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 placeholder:text-gray-300"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={item.unitCost}
                                                        onChange={(e) => {
                                                            setQuoteItems(quoteItems.map((item, i) =>
                                                                i === idx ? { ...item, unitCost: e.target.value } : item
                                                            ));
                                                        }}
                                                        placeholder="₹0 / sample"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        value={item.total}
                                                        onChange={(e) => {
                                                            setQuoteItems(quoteItems.map((item, i) =>
                                                                i === idx ? { ...item, total: e.target.value } : item
                                                            ));
                                                        }}
                                                        placeholder="0"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    {quoteItems.length > 1 && (
                                                        <button
                                                            onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={() => setQuoteItems([...quoteItems, { description: '', unitCost: '', total: '' }])}
                                className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-xs uppercase tracking-wider hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="text-lg">+</span> Add Line Item
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Taxation Policy (GST %)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={gst}
                                            onChange={(e) => setGst(e.target.value)}
                                            className="w-20 bg-white border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-blue-100 outline-none"
                                        />
                                        <span className="text-gray-400 text-xs font-medium">Percent GST applicable</span>
                                    </div>
                                </div>

                                <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-100">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">Financial Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <span className="font-medium">Subtotal</span>
                                            <span className="font-bold">₹{quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <span className="font-medium">Tax ({gst}%)</span>
                                            <span className="font-bold">₹{(quoteItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0) * (Number(gst) / 100)).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Net Value</p>
                                                <p className="text-2xl font-bold text-white">₹{calculateGrandTotal().toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setShowQuoteModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleUpdateQuote()}
                                    className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
                                >
                                    {project.quotedAmount ? 'Update Quote' : 'Initialize Quote'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPaymentFormModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Create Bill</h2>
                                <p className="text-sm text-gray-500">Initialize financial billing</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billing Reference</label>
                                <input
                                    type="text"
                                    value={paymentFormData.title}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, title: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900 placeholder:text-gray-300"
                                    placeholder="Invoice title..."
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deadline</label>
                                <input
                                    type="date"
                                    value={paymentFormData.dueDate}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, dueDate: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900"
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</label>
                                <textarea
                                    value={paymentFormData.detailedQuotation}
                                    onChange={e => setPaymentFormData({ ...paymentFormData, detailedQuotation: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-gray-700 resize-none h-32 placeholder:text-gray-300"
                                    placeholder="Billing details..."
                                />
                            </div>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">Total Billable</p>
                                <p className="text-xl font-bold text-orange-900">₹{calculateGrandTotal(true).toLocaleString()}</p>
                            </div>
                            <CreditCard className="w-8 h-8 text-orange-600 opacity-20" />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPaymentFormModal(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePaymentForm}
                                className="flex-[2] py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 text-sm"
                            >
                                Dispatch Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Payment Modal - Premium Design */}
            {showApprovePaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-300 text-center">
                        <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Approve Payment</h2>
                        <p className="text-sm text-gray-500 mb-8 px-4">
                            Verify and finalize the settlement for <span className="text-gray-900 font-bold">{project?.uniqueId}</span>.
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 flex items-center justify-between">
                            <div className="text-left">
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</span>
                                <span className="text-xl font-bold text-gray-900">₹{project?.paymentDetails?.amount?.toLocaleString()}</span>
                            </div>
                            <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                {project?.paymentDetails?.paymentMethod}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApprovePaymentModal(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApprovePayment}
                                className="flex-[2] py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 text-sm"
                            >
                                Approve Fund
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Escalate HR Modal - Premium Design */}
            {showEscalateHRModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Escalate to HR</h2>
                                <p className="text-sm text-gray-500">Submit a formal concern or report</p>
                            </div>
                        </div>

                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 focus-within:border-red-600 focus-within:bg-white transition-all mb-8">
                            <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Detailed Reason</label>
                            <textarea
                                value={escalationReason}
                                onChange={e => setEscalationReason(e.target.value)}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-gray-900 placeholder:text-red-200 resize-none h-40"
                                placeholder="Explain the situation clearly for HR review..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEscalateHRModal(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEscalateToHR}
                                className="flex-[2] py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 text-sm"
                            >
                                Send Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign to Service Manager Modal - Premium Design */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Assign Manager</h2>
                                <p className="text-sm text-gray-500">Delegate project to a service lead</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Available Managers</label>
                            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                                {loadingManagers ? (
                                    <div className="text-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
                                    </div>
                                ) : serviceManagers.length > 0 ? (
                                    serviceManagers.map((manager: any) => (
                                        <div
                                            key={manager._id}
                                            onClick={() => setSelectedManagerId(manager._id)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedManagerId === manager._id
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-gray-400">
                                                    {manager.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{manager.name}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-medium">{manager.email}</p>
                                                </div>
                                            </div>
                                            {selectedManagerId === manager._id && <CheckCircle className="w-5 h-5 text-blue-600" />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                        <p className="text-gray-400 font-medium text-sm">No managers available for this service.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignToManager}
                                disabled={!selectedManagerId}
                                className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm disabled:opacity-50"
                            >
                                Assign Service Lead
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fee Amount (INR)</label>
                                <input
                                    type="number"
                                    value={professionalFeeData.amount}
                                    onChange={e => setProfessionalFeeData({ ...professionalFeeData, amount: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-bold text-gray-900"
                                    placeholder="0"
                                />
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

            {/* Receipt Modal - open for creating OR editing by Sales Manager */}
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
                        issuedBy: user?.name || 'Sales Manager'
                    }}
                    readOnly={false}
                    onSave={async (updatedData) => {
                        const token = localStorage.getItem('token');

                        // If no receipt exists yet, create it first with POST, then update with PUT
                        if (!project.receipt) {
                            const initRes = await fetch(`${API_BASE}/${projectId}/receipt`, {
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

                        // Now save manager's modifications
                        const res = await fetch(`${API_BASE}/${projectId}/receipt`, {
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

        </div>
    );
}
