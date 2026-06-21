'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import {
    Package,
    Send,
    CheckCircle,
    FileText,
    ArrowRight,
    Search,
    Clock,
    DollarSign,
    Loader2,
    XCircle,
    Paperclip,
    Save,
    Upload,
    AlertCircle,
    CheckSquare,
    Square,
    MessageSquare,
    UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { validateURL } from '@/lib/validation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

export default function FinancePurchasePage() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showBillModal, setShowBillModal] = useState(false);

    // Bill Form states
    const [billNumber, setBillNumber] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [receivedQuantity, setReceivedQuantity] = useState(0);
    const [verified, setVerified] = useState(false);
    const [billFile, setBillFile] = useState<File | null>(null);
    const [quality, setQuality] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [hasMounted, setHasMounted] = useState(false);
    const [financeAccess, setFinanceAccess] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        setHasMounted(true);
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

            // Fetch fresh permissions (base API is one level up from /projects)
            const res = await fetch(`${API_BASE.split('/projects')[0]}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.user) {
                currentAccess = data.user.financeAccess || [];
                currentRole = data.user.role || '';
                setFinanceAccess(currentAccess);
                setUserRole(currentRole);
            }

            if (currentRole === 'employee' && !currentAccess.includes('purchase')) {
                toast.error('Access Denied: Purchase Module');
                router.push('/employee-dashboard/finance');
                return;
            }

            loadPurchases();
        } catch (err) {
            console.error('Initialization failed', err);
            router.push('/login');
        }
    };

    const loadPurchases = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/purchase/projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setProjects(data.data || []);
            }
        } catch (err) {
            toast.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBill = async (action: 'save' | 'complete') => {
        if (!billNumber || totalAmount < 0) {
            toast.error('Please fill bill details');
            return;
        }

        if (action === 'complete' && !verified) {
            toast.error('Please verify the quality and bill details first.');
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('billNumber', billNumber);
        formData.append('totalAmount', totalAmount.toString());
        formData.append('remainingAmount', remainingAmount.toString());
        formData.append('receivedQuantity', receivedQuantity.toString());
        formData.append('quality', quality);
        formData.append('verified', verified.toString());
        formData.append('action', action);

        if (billFile) {
            formData.append('file', billFile);
        }

        try {
            const res = await fetch(`${API_BASE}/${selectedProject._id}/purchase/bill`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Content-Type header is automatic with FormData
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Bill ${action === 'save' ? 'saved' : 'completed'} successfully`);
                if (action === 'complete') {
                    setShowBillModal(false);
                } else {
                    // Update local state to show it's saved (enable button)
                    setSelectedProject((prev: any) => ({
                        ...prev,
                        purchaseDetails: {
                            ...prev.purchaseDetails,
                            billForm: { ...prev.purchaseDetails.billForm, saved: true }
                        }
                    }));
                }
                loadPurchases();
            } else {
                toast.error(data.message || 'Failed to process bill');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePickup = async (projectId: string) => {
        const token = localStorage.getItem('token');
        try {
            setIsSubmitting(true);
            const res = await fetch(`${API_BASE.replace('/projects', '')}/purchase/${projectId}/approve`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assignedEmployeeId: (jwtDecode(token || '') as any).id,
                    remarks: 'Self-assigned via Employee Dashboard',
                    approvedAmount: 0 // Controller handles merging with requested
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Purchase picked up successfully');
                loadPurchases();
            } else {
                toast.error(data.message || 'Failed to pick up purchase');
            }
        } catch (err) {
            toast.error('Network error during pickup');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeliver = async (projectId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${projectId}/purchase/deliver`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Product marked as Delivered');
                loadPurchases();
            }
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-8">
            <Toaster position="top-right" />

            <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Package size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Fulfillment</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {projects.map((p) => {
                        const vendor = p.financialReview?.vendors?.find((v: any) => v.details === p.purchaseDetails.productName);
                        // Safe check for attachment path
                        const vendorAttachment = vendor?.attachment && vendor.attachment.path ? vendor.attachment : null;

                        // Assuming 'p.link' is the property that needs sanitization and is intended for the Link component
                        // If 'p.link' does not exist, or if the entire card is not meant to be a link, this might need adjustment.
                        // For now, we'll assume a project might have a 'link' property.
                        const sanitizedProjectLink = p.link ? validateURL(p.link) : '#';

                        return (
                            <div
                                key={p._id}
                                className="bg-white flex flex-col p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">
                                            {p.uniqueId.slice(-2)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-slate-900">{p.purchaseDetails.productName}</h3>
                                                {p.formData?.isSuperadminPurchase && (
                                                    <span className="text-[8px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">S-ADMIN</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.department} Project</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${p.purchaseDetails.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' :
                                        p.purchaseDetails.status === 'Going to send' ? 'bg-indigo-100 text-indigo-600' :
                                            'bg-amber-100 text-amber-600'
                                        }`}>
                                        {p.purchaseDetails.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 rounded-[2rem]">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorized Amount</p>
                                        <p className="text-2xl font-black text-slate-900">${p.purchaseDetails.amountSent.toLocaleString()}</p>
                                    </div>
                                    {p.purchaseDetails.quantity && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ordered Quantity</p>
                                            <p className="text-2xl font-black text-slate-900">{p.purchaseDetails.quantity}</p>
                                        </div>
                                    )}
                                    {p.purchaseDetails.description && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle size={10} /> Instructions</p>
                                            <p className="text-sm font-bold text-slate-600 italic leading-relaxed">"{p.purchaseDetails.description}"</p>
                                        </div>
                                    )}
                                    {vendorAttachment && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendor Reference</p>
                                            {(() => {
                                                const path = vendorAttachment.path || '';
                                                const normalizedPath = path.replace(/\\/g, '/');
                                                const uploadsIndex = normalizedPath.indexOf('/uploads/');
                                                let safeUrl = '#';

                                                if (uploadsIndex !== -1) {
                                                    const baseApi = API_BASE.replace('/api/projects', '');
                                                    const relativePath = normalizedPath.substring(uploadsIndex);
                                                    safeUrl = `${baseApi}${relativePath}`;
                                                }

                                                const isSafe = (safeUrl.startsWith('http://') || safeUrl.startsWith('https://') || safeUrl.startsWith('/'));
                                                const finalUrl = isSafe ? encodeURI(safeUrl) : '#';

                                                return (
                                                    <a
                                                        href={finalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        data-sanitized="true"
                                                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <span className="flex items-center gap-2"><Paperclip size={14} /> {vendorAttachment.originalName || 'Quote Document'}</span>
                                                        <ArrowRight size={14} />
                                                    </a>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {!p.purchaseDetails.assignedEmployee ? (
                                        <button
                                            onClick={() => handlePickup(p._id)}
                                            disabled={isSubmitting}
                                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} 
                                            Pickup Assignment
                                        </button>
                                    ) : (
                                        <React.Fragment>
                                            {(p.purchaseDetails.status === 'Order Placing' || (p.purchaseDetails.status === 'Going to send' && !p.purchaseDetails.billForm?.generated)) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedProject(p);
                                                        setBillNumber(p.purchaseDetails.billForm?.billNumber || '');
                                                        setTotalAmount(p.purchaseDetails.billForm?.totalAmount ?? p.purchaseDetails.amountSent ?? 0);
                                                        setRemainingAmount(p.purchaseDetails.billForm?.remainingAmount ?? (p.purchaseDetails.amountSent - (p.purchaseDetails.billForm?.totalAmount ?? p.purchaseDetails.amountSent ?? 0)));
                                                        setReceivedQuantity(p.purchaseDetails.billForm?.receivedQuantity || p.purchaseDetails.quantity || 1);
                                                        setQuality(p.purchaseDetails.billForm?.quality || '');
                                                        setVerified(p.purchaseDetails.billForm?.verified || false);
                                                        setBillFile(null);
                                                        setShowBillModal(true);
                                                    }}
                                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <FileText size={16} /> Process Bill & Verify
                                                </button>
                                            )}

                                            {p.purchaseDetails.status === 'Going to send' && (
                                                <button
                                                    onClick={() => handleDeliver(p._id)}
                                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={16} /> Mark Delivered
                                                </button>
                                            )}
                                        </React.Fragment>
                                    )}
                                    {p.purchaseDetails.status === 'Delivered' && (
                                        <div className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                            <CheckCircle size={16} /> Transaction Complete
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bill Generation Modal */}
            {showBillModal && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Process Purchase</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref: {selectedProject.uniqueId}</p>
                            </div>
                            <button onClick={() => setShowBillModal(false)} className="p-2 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Header Info */}
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                                    <p className="font-bold text-slate-800">{selectedProject.purchaseDetails.productName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Budget</p>
                                    <p className="font-black text-indigo-600">${selectedProject.purchaseDetails.amountSent}</p>
                                </div>
                                {selectedProject.purchaseDetails.description && (
                                    <div className="col-span-2 pt-4 border-t border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manager Instructions</p>
                                        <p className="text-xs font-medium text-slate-600 italic">"{selectedProject.purchaseDetails.description}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Inputs */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bill / Invoice Number</label>
                                        <input
                                            type="text"
                                            value={billNumber}
                                            onChange={(e) => setBillNumber(e.target.value)}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 transition-all font-mono"
                                            placeholder="INV-XXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Received Quantity (Quality)</label>
                                        <input
                                            type="number"
                                            value={receivedQuantity}
                                            onChange={(e) => setReceivedQuantity(parseFloat(e.target.value) || 0)}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Actual Cost</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                            <input
                                                type="number"
                                                value={totalAmount}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setTotalAmount(val);
                                                    setRemainingAmount(selectedProject.purchaseDetails.amountSent - val);
                                                }}
                                                className="w-full pl-8 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Refund Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                            <input
                                                type="number"
                                                value={remainingAmount}
                                                readOnly
                                                className={`w-full pl-8 pr-6 py-4 border-none rounded-2xl outline-none text-sm font-black transition-all ${remainingAmount < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quality Notes / Verification Remarks</label>
                                        <textarea
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            rows={2}
                                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 transition-all resize-none"
                                            placeholder="Condition of items, quality verification details..."
                                        />
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Upload Bill / Receipt / Proof</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all text-slate-400 group-hover:text-indigo-500">
                                            <Upload className="w-5 h-5" />
                                            <span className="text-xs font-bold">{billFile ? billFile.name : 'Click to upload bill image or PDF'}</span>
                                        </div>
                                    </div>
                                    {selectedProject.purchaseDetails.billForm?.billImage && !billFile && (
                                        <div className="flex items-center justify-between mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                <CheckCircle size={10} /> Existing file on record
                                            </p>
                                            {(() => {
                                                const path = selectedProject.purchaseDetails.billForm.billImage || '';
                                                const normalizedPath = path.replace(/\\/g, '/');
                                                const uploadsIndex = normalizedPath.indexOf('/uploads/');
                                                let safeUrl = '#';

                                                if (uploadsIndex !== -1) {
                                                    const baseApi = API_BASE.replace('/api/projects', '');
                                                    const relativePath = normalizedPath.substring(uploadsIndex);
                                                    safeUrl = `${baseApi}${relativePath}`;
                                                }

                                                const isSafe = safeUrl.startsWith('http://') || safeUrl.startsWith('https://') || safeUrl.startsWith('/');
                                                const finalUrl = isSafe ? encodeURI(safeUrl) : '#';

                                                return (
                                                    <a
                                                        href={finalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        data-sanitized="true"
                                                        className="px-2 py-1 bg-white rounded-lg text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        View
                                                    </a>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Verification */}
                                <div
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${verified ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                    onClick={() => setVerified(!verified)}
                                >
                                    {verified ? <CheckSquare className="text-emerald-500 w-6 h-6" /> : <Square className="text-slate-300 w-6 h-6" />}
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">Verify Quality & Delivery</p>
                                        <p className="text-[10px] text-slate-400">Confirm that goods meet quality standards.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleGenerateBill('save')}
                                    disabled={isSubmitting}
                                    className="px-6 py-5 bg-white border-2 border-slate-100 text-slate-500 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save Draft
                                </button>
                                <button
                                    onClick={() => handleGenerateBill('complete')}
                                    disabled={isSubmitting || !selectedProject.purchaseDetails.billForm?.saved}
                                    className="px-6 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Complete Transaction
                                </button>
                            </div>
                            {!selectedProject.purchaseDetails.billForm?.saved && (
                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">You must save the bill draft before completing.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
