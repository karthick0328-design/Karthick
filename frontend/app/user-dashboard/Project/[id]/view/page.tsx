// app/user-dashboard/Project/[id]/view/page.tsx (Project View Page)
// Enhanced with type-aware form display, 403 handling, and token logging
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import {
  ArrowLeft,
  MessageSquare,
  Download,
  Edit,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Paperclip,
  ExternalLink,
  History,
  Plus,
  User,
  X,
  Upload,
  Receipt as ReceiptIcon,
  Building2,
  Building,
  Eye,
  Play,
  Send,
  ShieldCheck,
  UserPlus,
  Activity,
  Layers,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { validateURL } from '@/lib/validation';
import ReceiptModal from '@/components/ReceiptModal';
import DOMPurify from 'dompurify';

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
  name?: string;
}

interface BackendProject {
  _id: string;
  uniqueId: string;
  userId: { name: string; email: string; uniqueId: string; department: string };
  department: string;
  category: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'In Progress' | 'Completed' | 'On Hold';
  paymentStatus: 'Pending' | 'Quote Sent' | 'Payment Form Created' | 'Payment Submitted' | 'Awaiting Approval' | '50% Paid' | 'Official Receipt Issued' | 'Full Paid';
  quotedAmount?: number;
  baseAmount?: number;
  gst?: number;
  taxHandling?: string;
  memberCost?: number;
  projectProgress?: string;
  discount?: number;
  paymentDetails?: {
    title: string;
    projectDescription: string;
    detailedQuotation: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    paymentMethod?: string;
  };
  receipt?: {
    data: any;
    generatedAt: string;
  };
  formData?: Record<string, any>;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  reviewerRemarks?: string;
  reviewerId?: { name: string; email: string; uniqueId: string };
  reviewedAt?: string;
  activities?: {
    description: string;
    timestamp: string;
    updatedBy: { name: string; role: string };
    statusChange?: string;
    remarks?: string;
    visibility?: 'Internal' | 'External';
    attachments?: { path: string; filename: string; mimetype: string }[];
  }[];
  attachments?: { path: string; filename: string; mimetype: string }[];
}

interface FormConfig {
  department: string;
  requiredFields: string[];
  fieldTypes: Record<string, any>;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

const ProjectView = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [user, setUser] = useState<{ name: string; department: string; role: string; id: string } | null>(null);
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const chatContainer = document.getElementById('chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  useEffect(() => {
    if (showChat) {
      setTimeout(scrollToBottom, 100);
    }
  }, [showChat, messages]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Check' | 'UPI' | null>(null);
  const [fullPayment, setFullPayment] = useState(false);
  const [paymentFormDetails, setPaymentFormDetails] = useState({
    checkNumber: '',
    bankName: '',
    checkDate: '',
    upiId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);

  const getMediaUrl = (val: string) => {
    if (typeof val !== 'string') return '#';
    let url = '';
    if (val.startsWith('http')) {
      url = val;
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const parts = val.split(/[\\/]uploads/i);
      const relativePath = parts.length > 1 ? 'uploads/' + parts.pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : val;
      url = `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
    }
    return validateURL(url);
  };

  const loadProjectData = async (token: string, id: string) => {
    setLoading(true);
    setError(null);
    try {
      const projectResponse = await fetch(`${API_BASE}/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!projectResponse.ok) {
        let errorMsg = `API Error: ${projectResponse.status}`;
        if (projectResponse.status === 403) errorMsg = 'Access denied.';
        else if (projectResponse.status === 404) errorMsg = 'Project not found.';
        throw new Error(errorMsg);
      }

      const projectData = await projectResponse.json();
      if (!projectData.success) throw new Error(projectData.message || 'Failed to fetch project');
      setProject(projectData.data);

      const msgResponse = await fetch(`${API_BASE}/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (msgResponse.ok) {
        const msgData = await msgResponse.json();
        let fetchedMessages = msgData.success ? (Array.isArray(msgData.data?.messages) ? msgData.data.messages : (Array.isArray(msgData.data) ? msgData.data : [])) : [];
        // Ensure chronological order (oldest first, so newest is at bottom)
        fetchedMessages = [...fetchedMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(fetchedMessages);
      }

      const backendProject = projectData.data;
      if (backendProject.category === 'New Project' && backendProject.department) {
        const configResponse = await fetch(`${API_BASE}/form-config?department=${encodeURIComponent(backendProject.department)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.success) setFormConfig(configData.data);
        }
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !projectId) { router.push('/Login/Signin'); return; }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
        return;
      }
      setUser({ name: decoded.name || 'User', department: decoded.department, role: decoded.role, id: decoded.id || decoded.sub || '' });
      loadProjectData(token, projectId);

      // Auto-open payment modal if navigated from review-bill with pay=true
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('pay') === 'true') {
        const type = urlParams.get('type');
        if (type === 'full') setFullPayment(true);
        else setFullPayment(false);
        setShowPaymentModal(true);
      }
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/Login/Signin');
    }
  }, [projectId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`${API_BASE}/${projectId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newMessage }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.data?.message || data.data]);
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const submitPayment = async (method: 'Cash' | 'Check' | 'UPI') => {
    try {
      const token = localStorage.getItem('token');
      const body: any = { paymentMethod: method, fullPayment };
      if (method === 'Check') {
        if (!paymentFormDetails.checkNumber || !paymentFormDetails.bankName || !paymentFormDetails.checkDate) throw new Error('Check details required');
        Object.assign(body, paymentFormDetails);
      } else if (method === 'UPI') {
        if (!paymentFormDetails.upiId) throw new Error('UPI ID required');
        body.upiId = paymentFormDetails.upiId;
      }

      const res = await fetch(`${API_BASE}/${projectId}/submit-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Payment submitted');
        setShowPaymentModal(false);
        loadProjectData(token!, projectId);
      } else throw new Error(data.message);
    } catch (err: any) { toast.error(err.message); }
  };

  const submitBalancePayment = async (method: 'Cash' | 'Check' | 'UPI') => {
    try {
      const token = localStorage.getItem('token');
      const body: any = { paymentMethod: method };
      if (method === 'Check') {
        if (!paymentFormDetails.checkNumber || !paymentFormDetails.bankName || !paymentFormDetails.checkDate) throw new Error('Check details required');
        Object.assign(body, paymentFormDetails);
      } else if (method === 'UPI') {
        if (!paymentFormDetails.upiId) throw new Error('UPI ID required');
        body.upiId = paymentFormDetails.upiId;
      }

      const res = await fetch(`${API_BASE}/${projectId}/submit-balance-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Balance payment submitted');
        setShowPaymentModal(false);
        loadProjectData(token!, projectId);
      } else throw new Error(data.message);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleUploadFiles = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      uploadFiles.forEach(file => formData.append('attachments', file));
      const res = await fetch(`${API_BASE}/${projectId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Uploaded');
        setShowUploadModal(false);
        setUploadFiles([]);
        loadProjectData(token!, projectId);
      }
    } catch (err) { toast.error('Upload failed'); } finally { setIsUploading(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-50 text-slate-500';
      case 'Submitted': return 'bg-indigo-50 text-indigo-600';
      case 'Under Review': return 'bg-amber-50 text-amber-600';
      case 'In Progress': return 'bg-emerald-50 text-emerald-600';
      case 'Completed': return 'bg-blue-50 text-blue-600';
      case 'On Hold': return 'bg-rose-50 text-rose-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <Edit className="w-4 h-4" />;
      case 'Submitted': return <CheckCircle className="w-4 h-4" />;
      case 'Under Review': return <Eye className="w-4 h-4" />;
      case 'In Progress': return <Play className="w-4 h-4" />;
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'On Hold': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (!user || loading) return <div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="w-16 h-16 border-4 border-t-indigo-600 animate-spin rounded-full"></div></div>;
  if (error) return <div className="p-20 text-center"><h2>{error}</h2><button onClick={() => loadProjectData(localStorage.getItem('token')!, projectId)}>Retry</button></div>;
  if (!project) return <div className="p-20 text-center"><h2>Project Not Found</h2></div>;

  const isEditable = project.status === 'Draft';

  return (
    <div className="animate-in fade-in duration-500">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white border border-gray-200 shadow-xl rounded-2xl',
          duration: 4000,
        }}
      />
      <div className="w-full flex-1 flex flex-col p-4 md:p-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link
            href="/user-dashboard/Project"
            className="inline-flex items-center gap-3 text-slate-400 hover:text-indigo-600 mb-8 font-black uppercase tracking-[0.2em] text-[10px] transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Project Portfolio</span>
          </Link>
          <div className="bg-indigo-950 rounded-[3rem] shadow-2xl border border-indigo-900 p-10 relative overflow-hidden group">
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-50 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <h1 className="text-4xl font-black text-white tracking-tight">{project.uniqueId}</h1>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl ${getStatusColor(project.status)} shadow-sm border border-white/10 backdrop-blur-md`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span className="font-black uppercase tracking-widest text-[10px]">{project.status}</span>
                  </div>
                </div>
                <p className="text-xl font-black text-indigo-400 mb-6">{project.paymentDetails?.title || project.category}</p>
                <div className="flex flex-wrap items-center gap-8 text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500/60">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-indigo-200">{project.department}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-indigo-200">Started {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                  {project.submittedAt && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span className="text-indigo-200">Completed {new Date(project.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChat(true)}
                  className="relative flex items-center gap-3 px-6 py-4 bg-indigo-900 border border-indigo-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-800 transition-all shadow-sm group"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Project Discussion</span>
                  {messages.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-indigo-950 shadow-lg font-black">
                      {messages.length}
                    </span>
                  )}
                </button>
                {isEditable && (
                  <Link
                    href={validateURL(`/user-dashboard/Project/${projectId}/edit`)}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/40"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modify Protocol</span>
                  </Link>
                )}
                <div className="h-12 w-[1px] bg-indigo-800 hidden md:block mx-1" />
                <button
                  onClick={() => window.print()}
                  className="w-12 h-12 flex items-center justify-center bg-indigo-900 text-indigo-400 rounded-2xl hover:text-white hover:bg-indigo-800 transition-all border border-indigo-800 shadow-sm"
                  aria-label="Download project"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Project Workflow Progress Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Project Workflow Progress</h2>
              </div>
              <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">
                {(() => {
                  const status = project.status;
                  if (status === 'Draft' || status === 'Submitted') return 'Phase 1';
                  if (status === 'Under Review') return 'Phase 2';
                  if (status === 'In Progress') return 'Phase 3';
                  if (status === 'Completed') return 'Phase 4';
                  return 'Phase 1';
                })()}
              </div>
            </div>

            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />

              <div className="relative flex justify-between items-center px-4 md:px-20">
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 z-10 ${project.status !== 'Draft'
                    ? 'bg-orange-500 text-white scale-110 shadow-orange-200'
                    : 'bg-white text-slate-300 border-slate-50'
                    }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${project.status !== 'Draft' ? 'text-slate-900' : 'text-slate-300'
                    }`}>INITIAL REVIEW</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 z-10 ${['Under Review', 'In Progress', 'Completed'].includes(project.status)
                    ? 'bg-indigo-500 text-white scale-110 shadow-indigo-200'
                    : 'bg-white text-slate-300 border-slate-50'
                    }`}>
                    <Building className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${['Under Review', 'In Progress', 'Completed'].includes(project.status) ? 'text-slate-900' : 'text-slate-300'
                    }`}>DEPARTMENT REVIEW</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 z-10 ${['In Progress', 'Completed'].includes(project.status)
                    ? 'bg-blue-500 text-white scale-110 shadow-blue-200'
                    : 'bg-white text-slate-300 border-slate-50'
                    }`}>
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${['In Progress', 'Completed'].includes(project.status) ? 'text-slate-900' : 'text-slate-300'
                    }`}>EXECUTION TEAM</span>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all duration-500 z-10 ${project.status === 'In Progress'
                    ? 'bg-emerald-500 text-white scale-110 shadow-emerald-200 animate-pulse'
                    : project.status === 'Completed'
                      ? 'bg-emerald-500 text-white scale-110'
                      : 'bg-white text-slate-300 border-slate-50'
                    }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${['In Progress', 'Completed'].includes(project.status) ? 'text-slate-900' : 'text-slate-300'
                    }`}>WORK IN PROGRESS</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Configuration Parameters */}
            {project.category === 'New Project' && formConfig ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-indigo-500 bg-indigo-600 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                    <FileText className="w-5 h-5 text-white" />
                    Project Details
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Object.keys(project.formData || {}).map((field) => {
                      const value = project.formData?.[field];
                      if (value === undefined || value === null || value === '') return null;

                      let displayValue = String(value);
                      const isVideo = typeof value === 'string' && (value.match(/\.(mp4|webm|ogg|mov)$/i) || value.includes('video'));
                      const isImage = typeof value === 'string' && value.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                      return (
                        <div key={field} className="group">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 group-hover:text-indigo-500 transition-colors">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-transparent group-hover:border-slate-100 group-hover:bg-white transition-all">
                            {isVideo ? (
                              <video src={getMediaUrl(value)} controls className="w-full rounded-xl shadow-sm" />
                            ) : isImage ? (
                              <img src={getMediaUrl(value)} alt={field} className="w-full h-auto rounded-xl cursor-pointer hover:scale-[1.02] transition-transform duration-500 shadow-sm" onClick={() => window.open(getMediaUrl(value), '_blank')} />
                            ) : (
                              <p className="text-slate-900 font-bold text-sm tracking-tight">{displayValue}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {project.remarks && (
                    <div className="mt-8 pt-8 border-t border-slate-50">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-indigo-500">Operational Remarks</label>
                      <p className="text-slate-600 text-sm font-medium leading-relaxed italic">"{project.remarks}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8"
              >
                <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Project Metadata
                </h2>
                <pre className="p-6 bg-slate-50 rounded-2xl text-[11px] font-mono text-slate-500 overflow-x-auto border border-slate-100">
                  {JSON.stringify(project.formData, null, 2)}
                </pre>
              </motion.div>
            )}

            {/* 2. Archive Repository */}
            {project.attachments && project.attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-teal-500 bg-teal-600 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                    <Paperclip className="w-5 h-5 text-white" />
                    Attachments Files
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-black text-teal-100 uppercase tracking-widest">
                      {project.attachments.length} DOCUMENTS
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.attachments.map((file, idx) => (
                      <div key={idx} className="group relative p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-500">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:rotate-6 transition-transform">
                            {file.mimetype.includes('image') ? (
                              <img src={DOMPurify.sanitize(validateURL(getMediaUrl(file.path)))} alt={file.filename} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <FileText className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{file.filename}</p>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{file.mimetype.split('/')[1]}</p>
                          </div>
                          <a
                            href={DOMPurify.sanitize(validateURL(getMediaUrl(file.path)))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Project Update Result (Journey) */}
            {project.activities && project.activities.filter(a => a.visibility === 'External').length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                    <History className="w-5 h-5 text-white" />
                    Project Update Results
                  </h2>
                  <div className="px-3 py-1 bg-white/20 text-white rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/30">
                    Journey History
                  </div>
                </div>
                <div className="p-8">

                  <div className="space-y-6 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[39px] top-4 bottom-4 w-px bg-slate-100 hidden sm:block" />

                    {project.activities
                      .filter(a => a.visibility === 'External')
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((activity, idx, arr) => {
                        const stepNumber = arr.length - idx;
                        return (
                          <div key={idx} className="relative flex flex-col sm:flex-row gap-6 group">
                            {/* Circle Indicator */}
                            <div className="hidden sm:flex items-center justify-center w-20 shrink-0 relative z-10">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-4 border-white shadow-lg transition-transform group-hover:scale-110 duration-500 ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                {stepNumber}
                              </div>
                            </div>

                            {/* Content Card */}
                            <div className={`flex-1 p-6 rounded-3xl border transition-all duration-500 relative ${idx === 0
                              ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-50/50 ring-1 ring-indigo-50'
                              : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-lg'
                              }`}>
                              {idx === 0 && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                  Latest Update
                                </div>
                              )}

                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">
                                    {activity.description}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(activity.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      <Clock className="w-3 h-3" />
                                      {new Date(activity.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-white rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 shadow-sm">
                                    {activity.updatedBy.role}
                                  </span>
                                </div>
                              </div>

                              {activity.remarks && (
                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 mb-4">
                                  <p className="text-xs text-slate-600 leading-relaxed font-medium italic">
                                    "{activity.remarks}"
                                  </p>
                                </div>
                              )}

                              {activity.attachments && activity.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {activity.attachments.map((file, fIdx) => (
                                    <a
                                      key={fIdx}
                                      href={DOMPurify.sanitize(validateURL(getMediaUrl(file.path)))}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-[9px] font-bold text-slate-600 flex items-center gap-2 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-sm transition-all shadow-sm group"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span className="truncate max-w-[120px]">{file.filename || 'Document'}</span>
                                      <Download className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Payment & Financials (1/3) */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
            {/* Financial Details Section */}
            {(project.quotedAmount || project.paymentDetails) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-emerald-500 bg-emerald-600 flex items-center justify-between">
                  <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-white" />
                    Payment Details
                  </h2>
                  <div className="px-2 py-0.5 bg-white/20 text-white rounded-lg font-black text-[8px] uppercase tracking-widest border border-white/30 backdrop-blur-sm">
                    {project.paymentStatus}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {(() => {
                    const totalAmt = project.paymentDetails?.amount || project.quotedAmount || 0;
                    const paidAmt = project.paymentDetails?.paidAmount || 0;
                    const remaining = Math.max(0, totalAmt - paidAmt);
                    const gstPercent = project.gst || project.receipt?.data?.gst || 0;
                    const gstAmt = (project.baseAmount || project.quotedAmount || 0) * (gstPercent / 100);

                    const isFullPaidState = project?.paymentStatus === 'Full Paid' || (totalAmt > 0 && paidAmt >= totalAmt);
                    const isPartialPaidState = project?.paymentStatus === '50% Paid' || project?.paymentStatus === 'Official Receipt Issued' || (paidAmt > 0 && !isFullPaidState);
                    const documentTitle = isFullPaidState ? 'Bill' : (isPartialPaidState ? 'Receipt' : 'Proforma');

                    return (
                      <>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Base Amount</span>
                            <span className="text-slate-900">₹{(project.baseAmount || project.quotedAmount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            <span>GST ({gstPercent}%)</span>
                            <span>+₹{gstAmt.toLocaleString()}</span>
                          </div>
                          <div className="pt-4 border-t border-slate-50 flex justify-between items-center transition-all">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Worth</span>
                            <span className="text-xl font-black text-slate-900">₹{totalAmt.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Total Settled</p>
                              <p className="text-sm font-black text-emerald-700 leading-none">₹{paidAmt.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {remaining > 0 && (
                          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Remaining</p>
                                <p className="text-sm font-black text-rose-700 leading-none">₹{remaining.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 pt-4">
                          {project.paymentStatus === 'Payment Form Created' && !project.receipt && (
                            <Link
                              href={`/user-dashboard/Project/${projectId}/view/review-bill`}
                              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                              <History className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                              Review Proforma
                            </Link>
                          )}
                          {project.paymentStatus === 'Official Receipt Issued' && remaining > 0 && (
                            <button
                              onClick={() => {
                                setFullPayment(true);
                                setShowPaymentModal(true);
                              }}
                              className="w-full py-3 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                              <CreditCard className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
                              Pay Balance
                            </button>
                          )}
                          {project.receipt && project.paymentStatus !== 'Official Receipt Issued' && project.paymentStatus !== 'Full Paid' && (
                            <Link
                              href={`/user-dashboard/Project/${projectId}/view/review-bill?official=true`}
                              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 group"
                            >
                              <History className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                              View {documentTitle}
                            </Link>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* Payment Bill Card */}
            {project.receipt && (() => {
              const totalAmt = project.paymentDetails?.amount || project.quotedAmount || 0;
              const paidAmt = project.paymentDetails?.paidAmount || 0;
              const isFullPaidState = project?.paymentStatus === 'Full Paid' || (totalAmt > 0 && paidAmt >= totalAmt);
              const documentTitle = isFullPaidState ? 'Bill' : 'Receipt';
              return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative"
              >
                <div className="p-4 bg-cyan-600 border-b border-cyan-500 flex items-center gap-3">
                  <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-sm">
                    <ReceiptIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-white tracking-tight">Payment Document</h2>
                </div>
                <div className="p-6 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-50" />
                  <div className="relative z-10">
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Verified Transaction Matrix</p>
                      <Link
                        href={`/user-dashboard/Project/${projectId}/view/review-bill?official=true`}
                        className="block w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-center"
                      >
                        Download {documentTitle}
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )})()}

            {/* Sidebar Division Info removed as per user request */}
          </div>
        </div>
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Discussion</h2>
                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Project Transmission</p>
                  </div>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div
                id="chat-messages-container"
                className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 bg-slate-50 scroll-smooth custom-scrollbar"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No transmission found</p>
                  </div>
                ) : (
                  messages
                    .filter(msg => {
                      const content = msg.content || msg.message?.content || "";
                      return !content.includes("[ESCALATED TO HR]");
                    })
                    .map((msg, idx) => {
                      const isOwn = msg.senderId?._id === user?.id || msg.senderId === user?.id;
                      const msgRole = msg.senderId?.role || (isOwn ? 'You' : 'Management');
                      const date = new Date(msg.timestamp || Date.now());
                      const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${isOwn ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'}`}>
                            <div className="flex items-center justify-between gap-10 mb-1">
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-60">
                                {isOwn ? 'You' : (msg.senderId?.name || 'Manager')} • <span className="text-indigo-600 font-extrabold">{msgRole}</span>
                              </p>
                              <p className="text-[8px] font-bold opacity-40 whitespace-nowrap">{formattedDate} • {formattedTime}</p>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{msg.content || msg.message?.content}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-100">
                <div className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Coordinate reply..."
                    className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-900"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 bg-slate-900 text-white relative">
                <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Archive Upload</h2>
                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">Document Integration</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-6">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50 hover:bg-white hover:border-indigo-500 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Paperclip className="w-6 h-6 text-indigo-600" />
                      </div>
                      <p className="text-sm text-slate-900 font-black uppercase tracking-widest mb-1">Select Files</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">MAX 5 INTEGRATIONS (PDF, IMAGE)</p>
                    </div>
                    <input type="file" className="hidden" multiple onChange={(e) => e.target.files && setUploadFiles(Array.from(e.target.files).slice(0, 5))} />
                  </label>

                  {uploadFiles.length > 0 && (
                    <div className="grid gap-2">
                      {uploadFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <button onClick={() => setUploadFiles(f => f.filter((_, i) => i !== idx))} className="p-1 hover:text-rose-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowUploadModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Abort</button>
                    <button onClick={handleUploadFiles} disabled={uploadFiles.length === 0 || isUploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50">
                      {isUploading ? 'Integrating...' : 'Execute Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {project?.paymentStatus === 'Official Receipt Issued' ? 'Settle Balance' : 'Project Authorization'}
                  </h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Industrial Grade Encryption Active</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-50">
                      <Plus className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Consolidated Bill</p>
                      <h4 className="text-lg font-black text-slate-900 leading-none">₹{(project?.paymentDetails?.amount || project?.quotedAmount || 0).toLocaleString()}</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-200 relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">{project?.paymentStatus === 'Official Receipt Issued' ? 'Required Payment' : (fullPayment ? 'Full Settlement' : 'Deposit (50%)')}</p>
                      <p className="text-3xl font-black text-indigo-900 tracking-tighter">
                        ₹{(project?.paymentStatus === 'Official Receipt Issued'
                          ? (project?.paymentDetails?.amount || 0) - (project?.paymentDetails?.paidAmount || 0)
                          : (fullPayment ? (project?.paymentDetails?.amount || project?.quotedAmount || 0) : (project?.paymentDetails?.amount || project?.quotedAmount || 0) * 0.5)
                        ).toLocaleString()}
                      </p>
                    </div>

                    {project?.paymentStatus !== 'Official Receipt Issued' && (
                      <button
                        onClick={() => setFullPayment(!fullPayment)}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 shadow-inner ${fullPayment ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${fullPayment ? 'translate-x-9' : 'translate-x-1'}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Protocol</p>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'UPI', label: 'UPI Instant', desc: 'Secure digital confirmation', icon: Send },
                      { id: 'Check', label: 'Bank Check', desc: 'Settle via physical instrument', icon: FileText },
                      { id: 'Cash', label: 'Cash Transfer', desc: 'Offline office facilitation', icon: User },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id as any)}
                        className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all group ${selectedPaymentMethod === method.id ? 'bg-indigo-50 border-indigo-600 shadow-xl' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedPaymentMethod === method.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-600'}`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{method.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{method.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPaymentMethod === 'Check' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Check Number</label>
                      <input type="text" value={paymentFormDetails.checkNumber} onChange={e => setPaymentFormDetails({ ...paymentFormDetails, checkNumber: e.target.value })} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none ring-indigo-500/10 focus:ring-4" placeholder="Instrument ID" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Bank Registry</label>
                        <input type="text" value={paymentFormDetails.bankName} onChange={e => setPaymentFormDetails({ ...paymentFormDetails, bankName: e.target.value })} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold font-mono outline-none" placeholder="IFSC/Branch" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Authorization Date</label>
                        <input type="date" value={paymentFormDetails.checkDate} onChange={e => setPaymentFormDetails({ ...paymentFormDetails, checkDate: e.target.value })} className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold outline-none" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {selectedPaymentMethod === 'UPI' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                    <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-4 mb-3 block">Digital ID (VPA)</label>
                    <input type="text" value={paymentFormDetails.upiId} onChange={e => setPaymentFormDetails({ ...paymentFormDetails, upiId: e.target.value })} className="w-full px-6 py-4 bg-white border border-indigo-100 rounded-2xl text-xs font-bold outline-none" placeholder="user@bank" />
                  </motion.div>
                )}

                <div className="pt-4 flex gap-4">
                  <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Abort</button>
                  <button
                    onClick={() => project?.paymentStatus === 'Official Receipt Issued' ? submitBalancePayment(selectedPaymentMethod!) : submitPayment(selectedPaymentMethod!)}
                    disabled={!selectedPaymentMethod}
                    className="flex-[3] py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-2xl disabled:opacity-50"
                  >
                    Finalize Authorization
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showReceiptModal && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receiptData={(window as any)._previewReceipt || project?.receipt?.data}
          readOnly={user?.role === 'user' || !(window as any)._previewReceipt}
          onPay={() => {
            setShowReceiptModal(false);
            setShowPaymentModal(true);
          }}
          onSave={async (updatedData) => {
            if ((window as any)._previewReceipt) {
              (window as any)._previewReceipt = updatedData;
              toast.success('Bill descriptions updated locally for review');
            }
          }}
        />
      )}
    </div>
  );
};

export default ProjectView;
