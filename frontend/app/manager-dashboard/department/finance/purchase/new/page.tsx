'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    AlertCircle,
    Plus,
    X,
    FileText,
    ShoppingCart,
    Cpu,
    Package,
    FlaskConical,
    PlusCircle,
    DollarSign,
    Upload,
    User,
    Loader2,
    Paperclip
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

interface Vendor {
    details: string;
    amount: string;
    attachment?: File;
    attachmentPreview?: string;
}

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [description, setDescription] = useState('');
    const [resources, setResources] = useState({
        software: '',
        consumable: '',
        kits: '',
        others: '',
        quality: ''
    });
    const [vendors, setVendors] = useState<Vendor[]>([
        { details: '', amount: '' }
    ]);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
    const [financeEmployees, setFinanceEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/finance/team`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setFinanceEmployees(data.data || []);
                }
            } catch (err) {
                console.error('Failed to load team:', err);
            }
        };
        fetchTeam();
    }, []);

    const handleAddVendor = () => {
        setVendors([...vendors, { details: '', amount: '' }]);
    };

    const handleRemoveVendor = (index: number) => {
        const newVendors = [...vendors];
        newVendors.splice(index, 1);
        setVendors(newVendors);
    };

    const handleVendorChange = (index: number, field: keyof Vendor, value: string) => {
        const newVendors = [...vendors];
        (newVendors[index] as any)[field] = value;
        setVendors(newVendors);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isVendor: boolean = false, vendorIndex: number = -1) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (isVendor && vendorIndex !== -1) {
            const newVendors = [...vendors];
            newVendors[vendorIndex].attachment = files[0];
            newVendors[vendorIndex].attachmentPreview = files[0].name;
            setVendors(newVendors);
            toast.success(`Attached quote for Vendor ${vendorIndex + 1}`);
        } else {
            const newFiles = Array.from(files);
            setAttachments([...attachments, ...newFiles]);
            setAttachmentPreviews([...attachmentPreviews, ...newFiles.map(f => f.name)]);
            toast.success(`Added ${newFiles.length} supporting document(s)`);
        }
    };

    const handleRemoveAttachment = (index: number) => {
        const newAttachments = [...attachments];
        newAttachments.splice(index, 1);
        setAttachments(newAttachments);

        const newPreviews = [...attachmentPreviews];
        newPreviews.splice(index, 1);
        setAttachmentPreviews(newPreviews);
    };

    const handleSubmit = async (isApprove: boolean) => {
        if (!description.trim()) {
            toast.error('Please provide a description');
            return;
        }

        if (isApprove && !selectedEmployeeId) {
            toast.error('Please select a financial employee to approve and assign');
            return;
        }

        setSubmitting(true);
        const token = localStorage.getItem('token');

        try {
            // In a real scenario, we'd upload files first and get URLs
            // For now, we simulate the submission with JSON if no files, 
            // but the Project model expects certain fields.

            // Step 1: Create the PO
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/purchase/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    software: resources.software,
                    consumable: resources.consumable,
                    kits: resources.kits,
                    others: resources.others,
                    quality: resources.quality,
                    vendors: vendors.map(v => ({ details: v.details, amount: Number(v.amount) })),
                    requestedAmount: vendors.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
                })
            });

            const data = await res.json();

            if (data.success) {
                if (isApprove) {
                    // Step 2: Approve and Assign
                    const approveRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/purchase/${data.data._id}/approve`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            assignedEmployeeId: selectedEmployeeId,
                            remarks: 'Directly approved from creation',
                            approvedAmount: data.data.financialReview.requestedAmount
                        })
                    });
                    const approveData = await approveRes.json();
                    if (approveData.success) {
                        toast.success('Purchase order created and assigned successfully!');
                        router.push('/manager-dashboard/department/finance/purchase');
                    } else {
                        toast.error(approveData.message || 'Error assigning employee');
                    }
                } else {
                    toast.success('Purchase order saved as draft');
                    router.push('/manager-dashboard/department/finance/purchase');
                }
            } else {
                toast.error(data.message || 'Failed to create purchase order');
            }
        } catch (err) {
            console.error('Submission error:', err);
            toast.error('Network error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-10">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all group"
                    >
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <ShoppingCart className="text-indigo-600" />
                            New Purchase Order
                        </h1>
                        <p className="text-slate-400 font-medium">Create a new procurement request for the department.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-3 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSubmit(true)}
                        disabled={submitting}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approve & Assign
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Form Area */}
                <div className="lg:col-span-2 space-y-10">
                    {/* General Info */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                        <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">General Information</h2>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the purpose of this purchase..."
                                rows={4}
                                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-slate-700 font-bold placeholder-slate-300 transition-all resize-none shadow-inner"
                            />
                        </div>
                    </section>

                    {/* Resources */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                        <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <Package size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Resource Requirements</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Cpu className="w-3.5 h-3.5" /> Software
                                </label>
                                <input
                                    type="text"
                                    value={resources.software}
                                    onChange={(e) => setResources({ ...resources, software: e.target.value })}
                                    placeholder="Licenses, tools, etc."
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-slate-700 font-bold shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShoppingCart className="w-3.5 h-3.5" /> Consumable
                                </label>
                                <input
                                    type="text"
                                    value={resources.consumable}
                                    onChange={(e) => setResources({ ...resources, consumable: e.target.value })}
                                    placeholder="Paper, toner, stationery..."
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-slate-700 font-bold shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FlaskConical className="w-3.5 h-3.5" /> Kits
                                </label>
                                <input
                                    type="text"
                                    value={resources.kits}
                                    onChange={(e) => setResources({ ...resources, kits: e.target.value })}
                                    placeholder="Testing kits, specialized equipment..."
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-slate-700 font-bold shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <PlusCircle className="w-3.5 h-3.5" /> Others
                                </label>
                                <input
                                    type="text"
                                    value={resources.others}
                                    onChange={(e) => setResources({ ...resources, others: e.target.value })}
                                    placeholder="Miscellaneous items..."
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-slate-700 font-bold shadow-inner"
                                />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Quality Requirements & Standards
                                </label>
                                <textarea
                                    value={resources.quality}
                                    onChange={(e) => setResources({ ...resources, quality: e.target.value })}
                                    placeholder="Specify grade, certification, or quality benchmarks required..."
                                    rows={2}
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none text-slate-700 font-bold shadow-inner resize-noneTransition"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Vendors */}
                    <section className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <DollarSign size={24} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Vendor Details & Amount</h2>
                            </div>
                            <button
                                onClick={handleAddVendor}
                                className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Vendor
                            </button>
                        </div>

                        <div className="space-y-4">
                            {vendors.map((vendor, idx) => (
                                <div key={idx} className="group bg-slate-50 rounded-3xl p-6 border border-transparent hover:border-indigo-100 transition-all">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                        <div className="md:col-span-7 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Vendor Name/Details</label>
                                            <input
                                                type="text"
                                                value={vendor.details}
                                                onChange={(e) => handleVendorChange(idx, 'details', e.target.value)}
                                                placeholder="e.g., Apple Inc. - MacBook Pro"
                                                className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 font-bold transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">Amount ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                                                <input
                                                    type="number"
                                                    value={vendor.amount}
                                                    onChange={(e) => handleVendorChange(idx, 'amount', e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-5 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-slate-700 font-bold transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="hidden md:block mb-2 invisible cursor-default">File</label>
                                            <label className="w-full h-[50px] bg-white border border-slate-100 rounded-xl flex items-center justify-center cursor-pointer hover:bg-indigo-50 text-indigo-600 transition-all shadow-sm group">
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, true, idx)} />
                                                <Paperclip className={`w-5 h-5 ${vendor.attachment ? 'text-emerald-500' : ''}`} />
                                            </label>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="hidden md:block mb-2 invisible cursor-default">Remove</label>
                                            <button
                                                onClick={() => handleRemoveVendor(idx)}
                                                disabled={vendors.length === 1}
                                                className="w-full h-[50px] bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-white"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    {vendor.attachmentPreview && (
                                        <div className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg inline-flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3" />
                                            Quote Attached: {vendor.attachmentPreview}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar area */}
                <div className="space-y-8">
                    {/* Attachments Sidebar */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <Upload className="text-indigo-600 w-5 h-5" />
                            <h3 className="font-black text-slate-900">Supporting Docs</h3>
                        </div>

                        <div className="space-y-4">
                            <label className="w-full h-32 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group">
                                <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e)} />
                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                    <Plus size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Click to upload</span>
                            </label>

                            {attachmentPreviews.length > 0 && (
                                <div className="space-y-2">
                                    {attachmentPreviews.map((name, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group animate-in slide-in-from-right-4">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                                <span className="text-xs font-bold text-slate-600 truncate">{name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAttachment(idx)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignment Sidebar */}
                    <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white space-y-6 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>

                        <div className="flex items-center gap-3 border-b border-white/10 pb-4 relative z-10">
                            <User className="text-indigo-400 w-5 h-5" />
                            <h3 className="font-black text-white tracking-tight text-lg">Assign Authority</h3>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">Select Finance Employee</p>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/30 text-white font-bold transition-all shadow-inner appearance-none custom-select"
                                >
                                    <option value="" className="bg-slate-900">Select an employee...</option>
                                    {financeEmployees.map(emp => (
                                        <option key={emp._id} value={emp._id} className="bg-slate-900">
                                            {emp.name} ({emp.uniqueId})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Approval Impact</h4>
                                        <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                                            Approving will immediately notify the selected employee and grant them access to initiate the workflow.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
