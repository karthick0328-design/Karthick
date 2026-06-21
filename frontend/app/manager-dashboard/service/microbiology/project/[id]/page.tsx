'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    Activity, Briefcase, CheckSquare, Clock, Mail, Phone,
    PlayIcon, Search, Send, User, XCircle, ChevronRight,
    Beaker, Dna, Microscope, FlaskConical, DollarSign, AlertCircle, ArrowLeft, GitBranch,
    UserPlus, Calendar, CreditCard, Package, CheckCircle, ShieldCheck, Layers, SendHorizonal, Paperclip, FileText, Download, ExternalLink, Plus, Upload, X
} from 'lucide-react';
import Link from 'next/link';
import ServiceProjectDetailView from '../../../shared/ServiceProjectDetailView';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';


interface Project {
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
    formData?: {
        compoundName?: string;
        targetProtein?: string;
        assayType?: string;
        screeningMethod?: string;
        expectedOutcome?: string;
        timeline?: string;
        resourcesNeeded?: string;
        remarks?: string;
        services?: string[];
        [key: string]: string | number | boolean | string[] | undefined;
    };
    remarks?: string;
    reviewerRemarks?: string;
    submittedAt?: string;
    reviewedAt?: string;
    createdAt: string;
    activities?: Array<{
        _id?: string;
        description: string;
        timestamp: string;
        updatedBy: { name: string; role: string };
        remarks?: string;
        visibility?: string;
    }>;
    workflowStep: number;
    approvals?: {
        serviceManager: { status: string; remarks?: string; reviewedBy?: string };
        financial: { status: string; remarks?: string };
        hr: { status: string; remarks?: string };
    };
    paymentDetails?: {
        amount: number;
        paidAmount: number;
        paymentMethod?: string;
        status?: string;
    };
    teamLeadId?: {
        _id: string;
        name: string;
    };
    purchaseDetails?: {
        productName: string;
        amountSent: number;
        assignedEmployee?: { name: string };
        status: string;
        billForm?: {
            generated: boolean;
            billNumber?: string;
            totalAmount?: number;
            remainingAmount?: number;
            generatedAt?: string;
        };
        deliveredAt?: string;
        updatedAt: string;
    };
    attachments?: Array<{ path: string; filename: string; mimetype: string }>;
}

export default function ProjectDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modal states
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showEscalateHRModal, setShowEscalateHRModal] = useState(false);
    const [showAssignTLModal, setShowAssignTLModal] = useState(false);
    const [tls, setTls] = useState<any[]>([]);
    const [selectedTL, setSelectedTL] = useState('');

    // Form states
    const [taskNotes, setTaskNotes] = useState('');
    const [progressTitle, setProgressTitle] = useState('');
    const [progressNotes, setProgressNotes] = useState('');
    const [completionNotes, setCompletionNotes] = useState('');
    const [escalationReason, setEscalationReason] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
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

    // Workflow states
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected'>('Approved');
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [quotedAmount, setQuotedAmount] = useState<number>(0);

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

    const fetchTLs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/projects/department/tls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setTls(data.data);
                setShowAssignTLModal(true);
            } else {
                toast.error('Failed to fetch Team Leads');
            }
        } catch (error) {
            toast.error('Error fetching Team Leads');
        }
    };

    const handleAssignTL = async () => {
        if (!selectedTL) {
            toast.error('Please select a Team Lead');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/department/assigned-projects/${projectId}/assign-tl`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamLeadId: selectedTL })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Team Lead assigned successfully');
                setShowAssignTLModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to assign TL');
            }
        } catch (error) {
            toast.error('Error assigning TL');
        }
    };

    const handleServiceManagerReview = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${projectId}/review/service-manager`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: reviewStatus,
                    remarks: reviewRemarks,
                    quotedAmount: quotedAmount || undefined
                })
            });
            const data = await response.json();
            if (data.success) {
                toast.success(`Project ${reviewStatus === 'Approved' ? 'Accepted' : 'Rejected'} successfully`);
                setShowReviewModal(false);
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Review submission failed');
            }
        } catch (error) {
            toast.error('Error submitting review');
        }
    };

    const handleStartTask = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/department/assigned-projects/${projectId}/start-task`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ taskNotes })
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Task started successfully!');
                setShowTaskModal(false);
                setTaskNotes('');
                fetchProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to start task');
            }
        } catch (error) {
            toast.error('Error starting task');
        }
    };

    const handleUpdateProgress = async () => {
        if (progressNotes.trim().length < 10) {
            toast.error('Progress notes must be at least 10 characters');
            return;
        }
        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('progressTitle', progressTitle);
            formData.append('progressNotes', progressNotes);
            selectedFiles.forEach(file => {
                formData.append('attachments', file);
            });

            const response = await fetch(`${API_BASE}/department/assigned-projects/${projectId}/update-progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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
            toast.error('Error updating progress');
        } finally {
            setUploading(false);
        }
    };

    const handleCompleteProject = async () => {
        if (completionNotes.trim().length < 10) {
            toast.error('Completion notes must be at least 10 characters');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/department/assigned-projects/${projectId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
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
            toast.error('Error completing project');
        }
    };

    const handlePushProgress = async (activityId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/department/assigned-projects/${projectId}/push-progress/${activityId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'SM_Push' })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Progress published to client');
                fetchProjectDetails(token);
            } else {
                toast.error(data.message || 'Failed to publish progress');
            }
        } catch (error) {
            console.error('Push error:', error);
            toast.error('Error publishing progress');
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

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                    <Microscope className="w-12 h-12 text-emerald-600 animate-bounce mx-auto mb-4" />
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
                <p className="text-gray-600 mb-6">{"The project you're looking for doesn't exist or you don't have access."}</p>
                <Link href="/manager-dashboard/service/microbiology" className="text-emerald-600 font-semibold hover:underline flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="font-sans">
            <Toaster position="top-right" />

            <ServiceProjectDetailView
                project={project}
                user={user}
                loading={loading}
                chatMessages={chatMessages}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                handleSendMessage={handleSendMessage}
                messagesEndRef={messagesEndRef}
                actions={{
                    setShowEscalateHRModal,
                    setShowReviewModal,
                    fetchTLs,
                    setShowTaskModal,
                    setShowProgressModal,
                    setShowCompleteModal,
                    setShowUploadModal,
                    setQuotedAmount,
                    handlePushProgress
                }}
                serviceTitle="Microbiology Unit"
                serviceIcon={<Microscope className="w-5 h-5" />}
                breadcrumb="MANAGER DASHBOARD / SERVICE / MICROBIOLOGY"
                backUrl="/manager-dashboard/service/microbiology"
                workflowBar={
                    <div className="p-10">
                        <div className="relative flex items-center justify-between max-w-4xl mx-auto">
                            {/* Connector Line Base */}
                            <div className="absolute left-0 right-0 top-[20px] h-1 bg-slate-100 rounded-full" />
                            {/* Active Connector Liner */}
                            <div
                                className="absolute left-0 top-[20px] h-1 bg-indigo-600 transition-all duration-1000 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                                style={{ width: `${((project.workflowStep - 1) / 3) * 100}%` }}
                            />

                            {[
                                { step: 1, label: 'SM Review', icon: ShieldCheck },
                                { step: 2, label: 'Protocols', icon: GitBranch },
                                { step: 3, label: 'Lead Assign', icon: UserPlus },
                                { step: 4, label: 'Cultivation', icon: Activity }
                            ].map((item) => {
                                const Icon = item.icon;
                                const isActive = project.workflowStep >= item.step;
                                const isCurrent = project.workflowStep === item.step;

                                return (
                                    <div key={item.step} className="relative z-10 flex flex-col items-center gap-4">
                                        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-700 ${isActive
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                                            : 'bg-white border-2 border-slate-100 text-slate-300'
                                            } ${isCurrent ? 'scale-125 rotate-3 ring-4 ring-indigo-50' : ''}`}>
                                            <Icon size={22} className={isCurrent ? 'animate-pulse' : ''} />
                                            {isActive && !isCurrent && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-500">
                                                    <CheckCircle size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {item.label}
                                            </p>
                                            {isCurrent && (
                                                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse">ACTIVE NODE</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                }
            />

            {/* Start Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <PlayIcon className="w-6 h-6 text-emerald-500 fill-current" />
                            Start Microbiology Task
                        </h2>
                        <label className="block mb-6">
                            <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Task Notes (Optional)</span>
                            <textarea
                                value={taskNotes}
                                onChange={(e) => setTaskNotes(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[120px]"
                                placeholder="Add any initial notes about this task..."
                            />
                        </label>
                        <div className="flex gap-3">
                            <button onClick={handleStartTask} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all">Start Task</button>
                            <button onClick={() => setShowTaskModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Activity className="w-6 h-6 text-blue-600" />
                            Update Progress
                        </h2>
                        <div className="space-y-4 mb-6">
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Update Title *</span>
                                <input
                                    type="text"
                                    value={progressTitle}
                                    onChange={(e) => setProgressTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Initial Analysis Completed"
                                />
                            </label>
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Detailed Notes *</span>
                                <textarea
                                    value={progressNotes}
                                    onChange={(e) => setProgressNotes(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
                                    placeholder="Provide details about the progress made..."
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{progressNotes.length} / 10 minimum characters</p>
                            </label>

                            <div className="block">
                                <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Attachments</span>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-blue-500 transition-colors bg-gray-50/50">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                                            }
                                        }}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer py-2">
                                        <Paperclip className="w-8 h-8 text-gray-400 mb-2" />
                                        <p className="text-xs font-bold text-gray-500">Click to upload files</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Images, PDFs, Documents up to 50MB</p>
                                    </label>
                                </div>
                                {selectedFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                    <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                                                    <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                                    className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-md transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleUpdateProgress}
                                disabled={progressNotes.length < 10 || !progressTitle.trim() || uploading}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    'Submit Update'
                                )}
                            </button>
                            <button onClick={() => setShowProgressModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Project Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <CheckSquare className="w-6 h-6 text-purple-600" />
                            Final Project Completion
                        </h2>
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-6">
                            <p className="text-sm text-purple-800 font-medium">Warning: This will mark the project as completed. This action cannot be undone.</p>
                        </div>
                        <label className="block mb-6">
                            <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Final Completion Notes *</span>
                            <textarea
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[150px]"
                                placeholder="Summarize total findings, results, and outcome..."
                            />
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCompleteProject}
                                disabled={completionNotes.length < 10}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                            >
                                Complete Project
                            </button>
                            <button onClick={() => setShowCompleteModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}


            {/* Escalation to HR Modal */}
            {showEscalateHRModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2 text-rose-600">
                            <AlertCircle className="w-7 h-7" />
                            Escalate to HR
                        </h2>
                        <p className="text-gray-500 text-sm mb-6 font-medium">Submit a formal project escalation to Human Resources.</p>
                        <label className="block mb-6">
                            <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Reason for Escalation *</span>
                            <textarea
                                value={escalationReason}
                                onChange={(e) => setEscalationReason(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent min-h-[150px]"
                                placeholder="Details about specific issues, blockers, or policy violations..."
                            />
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={handleEscalateToHR}
                                disabled={escalationReason.length < 10}
                                className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-700 transition-all disabled:opacity-50"
                            >
                                Submit Escalation
                            </button>
                            <button onClick={() => setShowEscalateHRModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Assign TL Modal */}
            {showAssignTLModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <UserPlus className="w-6 h-6 text-indigo-600" />
                            Assign Team Lead
                        </h2>
                        <div className="space-y-4 mb-6">
                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 block mb-2">Select Team Lead</span>
                                <select
                                    value={selectedTL}
                                    onChange={(e) => setSelectedTL(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                >
                                    <option value="">-- Select a TL --</option>
                                    {tls.map((tl) => (
                                        <option key={tl._id} value={tl._id}>
                                            {tl.name} ({tl.email})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAssignTL}
                                disabled={!selectedTL}
                                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                Confirm Assignment
                            </button>
                            <button onClick={() => setShowAssignTLModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Service Manager Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-7 h-7 text-amber-500" />
                            Accept Project
                        </h2>
                        <p className="text-gray-500 text-sm mb-6">Evaluate the project and provide a quote to move to the next stage.</p>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setReviewStatus('Approved')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${reviewStatus === 'Approved' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-100 hover:border-amber-200'
                                        }`}
                                >
                                    <CheckCircle className="w-6 h-6" />
                                    <span className="font-bold">Accept</span>
                                </button>
                                <button
                                    onClick={() => setReviewStatus('Rejected')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${reviewStatus === 'Rejected' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 hover:border-rose-200'
                                        }`}
                                >
                                    <XCircle className="w-6 h-6" />
                                    <span className="font-bold">Reject</span>
                                </button>
                            </div>

                            {reviewStatus === 'Approved' && (
                                <label className="block">
                                    <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Quoted Service Amount ($)</span>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={quotedAmount}
                                            onChange={(e) => setQuotedAmount(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold text-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 italic">This amount will be used for financial review.</p>
                                </label>
                            )}

                            <label className="block">
                                <span className="text-sm font-bold text-gray-700 block mb-2 uppercase tracking-wide">Remarks *</span>
                                <textarea
                                    value={reviewRemarks}
                                    onChange={(e) => setReviewRemarks(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[100px]"
                                    placeholder="Add notes about your decision..."
                                />
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleServiceManagerReview}
                                disabled={!reviewRemarks.trim()}
                                className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${reviewStatus === 'Approved' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-rose-600 text-white hover:bg-rose-700'
                                    }`}
                            >
                                <SendHorizonal className="w-5 h-5" />
                                Confirm {reviewStatus === 'Approved' ? 'Acceptance' : 'Rejection'}
                            </button>
                            <button onClick={() => setShowReviewModal(false)} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
