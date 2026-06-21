'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import {
    ArrowLeft, DollarSign, Plus, Trash2, Upload, FileText, Image as ImageIcon,
    Loader2, Save, X, PlusCircle, Layout, Package, Cpu, FlaskConical, Boxes
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

interface VendorEntry {
    details: string;
    amount: string;
    file?: File;
}

interface FinancialReviewFormProps {
    serviceName: string;
    backUrl: string;
}

export default function FinancialReviewForm({ serviceName, backUrl }: FinancialReviewFormProps) {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [project, setProject] = useState<any>(null);

    // Form states
    const [reason, setReason] = useState('');
    const [software, setSoftware] = useState('');
    const [consumable, setConsumable] = useState('');
    const [kits, setKits] = useState('');
    const [others, setOthers] = useState('');
    const [vendors, setVendors] = useState<VendorEntry[]>([{ details: '', amount: '' }]);
    const [attachments, setAttachments] = useState<File[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        fetchProjectDetails(token);
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
                toast.error('Failed to fetch project details');
            }
        } catch (error) {
            toast.error('Error fetching project');
        } finally {
            setPageLoading(false);
        }
    };

    const handleAddVendor = () => {
        setVendors([...vendors, { details: '', amount: '' }]);
    };

    const handleRemoveVendor = (index: number) => {
        if (vendors.length === 1) {
            setVendors([{ details: '', amount: '' }]);
            return;
        }
        setVendors(vendors.filter((_, i) => i !== index));
    };

    const handleVendorChange = (index: number, field: keyof VendorEntry, value: string) => {
        const updated = [...vendors];
        (updated[index] as any)[field] = value;
        setVendors(updated);
    };

    const handleVendorFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const updated = [...vendors];
            updated[index].file = e.target.files[0];
            setVendors(updated);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAttachments([...attachments, ...files]);
        }
    };

    const removeFile = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason || reason.trim().length < 10) {
            toast.error('Please provide a detailed reason (min 10 chars)');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('reason', reason);
            formData.append('software', software);
            formData.append('consumable', consumable);
            formData.append('kits', kits);
            formData.append('others', others);
            // Process vendors to include attachment indexing
            const vendorsToSubmit = vendors
                .filter(v => v.details || v.amount)
                .map(v => {
                    if (v.file) {
                        return { ...v, attachmentIndex: -1 }; // Placeholder, will set real index below
                    }
                    return v;
                });

            // Flatten all files to upload
            const generalFiles = attachments;
            const vendorFiles = vendorsToSubmit.map(v => v.file).filter((f): f is File => !!f);

            // Combine all files
            const allFiles = [...generalFiles, ...vendorFiles];

            // Update indices
            let currentFileIndex = 0;

            // General files take first indices
            currentFileIndex += generalFiles.length;

            // Update vendor attachment indices
            const finalVendors = vendorsToSubmit.map(v => {
                const newVendor: any = { details: v.details, amount: v.amount };
                if (v.file) {
                    newVendor.attachmentIndex = currentFileIndex++;
                }
                return newVendor;
            });

            formData.append('vendors', JSON.stringify(finalVendors));

            allFiles.forEach((file) => {
                formData.append('attachments', file);
            });

            const response = await fetch(`${API_BASE}/${projectId}/request-financial-review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Financial review requested successfully');
                setTimeout(() => {
                    router.push(backUrl);
                }, 1500);
            } else {
                toast.error(data.message || 'Failed to submit request');
            }
        } catch (error) {
            toast.error('Error submitting request');
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <Toaster position="top-right" />

            <div className="max-w-5xl mx-auto px-6 pt-8 mb-8">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-semibold text-sm">Back to Project</span>
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            Request Financial Review
                        </h1>
                        <div className="mt-2 space-y-1">
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                Project Title: <span className="text-slate-900 font-bold">{project?.formData?.compoundName || project?.formData?.productName || project?.category || 'Project'}</span>
                            </p>
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                <Layout className="w-4 h-4 text-indigo-500" />
                                Project ID: <span className="text-indigo-600 font-bold">{project?.uniqueId}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Layout className="w-5 h-5 text-indigo-500" />
                                Description
                            </h2>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[120px]"
                                placeholder="Explain why this financial review is necessary..."
                                required
                            />
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Boxes className="w-5 h-5 text-indigo-500" />
                                Resource Requirements
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Cpu className="w-3 h-3" /> Software
                                    </label>
                                    <input
                                        type="text"
                                        value={software}
                                        onChange={(e) => setSoftware(e.target.value)}
                                        placeholder="e.g. Specialized Enterprise License"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Consumable
                                    </label>
                                    <input
                                        type="text"
                                        value={consumable}
                                        onChange={(e) => setConsumable(e.target.value)}
                                        placeholder="e.g. Chemical Reagents"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FlaskConical className="w-3 h-3" /> Kits
                                    </label>
                                    <input
                                        type="text"
                                        value={kits}
                                        onChange={(e) => setKits(e.target.value)}
                                        placeholder="e.g. Diagnostic Toolkit"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <PlusCircle className="w-3 h-3" /> Others
                                    </label>
                                    <input
                                        type="text"
                                        value={others}
                                        onChange={(e) => setOthers(e.target.value)}
                                        placeholder="Any other requirements"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-500" />
                                    Vendor Details & Amounts
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleAddVendor}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {vendors.map((vendor, index) => (
                                    <div key={index} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="flex-1 space-y-2 w-full">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Details</label>
                                                <input
                                                    type="text"
                                                    value={vendor.details}
                                                    onChange={(e) => handleVendorChange(index, 'details', e.target.value)}
                                                    placeholder="e.g. BioTech Solutions Inc."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="w-full md:w-32 space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount ($)</label>
                                                <input
                                                    type="number"
                                                    value={vendor.amount}
                                                    onChange={(e) => handleVendorChange(index, 'amount', e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveVendor(index)}
                                                className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {/* Vendor File Upload */}
                                        <div className="w-full flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <input
                                                    type="file"
                                                    id={`vendor-file-${index}`}
                                                    onChange={(e) => handleVendorFileChange(index, e)}
                                                    className="hidden"
                                                    accept="image/*,.pdf"
                                                />
                                                <label
                                                    htmlFor={`vendor-file-${index}`}
                                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-all ${vendor.file
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {vendor.file ? (
                                                        <>
                                                            <FileText className="w-4 h-4" />
                                                            <span className="text-xs font-bold truncate max-w-[200px]">{vendor.file.name}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-4 h-4" />
                                                            <span className="text-xs font-bold">Upload Quote (PDF/Image)</span>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                            {vendor.file && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...vendors];
                                                        updated[index].file = undefined;
                                                        setVendors(updated);
                                                    }}
                                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
                            <h3 className="text-xl font-bold mb-4">Review Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-indigo-400/30">
                                    <span className="opacity-70 text-sm">Total Vendors</span>
                                    <span className="font-bold">{vendors.filter(v => v.details).length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-indigo-400/30">
                                    <span className="opacity-70 text-sm">Total Amount</span>
                                    <span className="text-2xl font-black">
                                        ${vendors.reduce((sum, v) => sum + (Number(v.amount) || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                                {(() => {
                                    const validVendors = vendors.filter(v => v.details && Number(v.amount) > 0);
                                    if (validVendors.length > 0) {
                                        const lowestVendor = validVendors.reduce((min, v) =>
                                            Number(v.amount) < Number(min.amount) ? v : min
                                        );
                                        return (
                                            <div className="pt-2">
                                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="opacity-90 text-xs font-bold uppercase tracking-wide">Lowest Vendor</span>
                                                        <span className="text-lg font-black text-green-200">
                                                            ${Number(lowestVendor.amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium opacity-90 truncate">{lowestVendor.details}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-8 bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        Submit Request
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-indigo-500" />
                                Attachments
                            </h2>

                            <label className="group h-32 w-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all mb-6">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                />
                                <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">
                                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                </div>
                                <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600">Add PDF or Images</span>
                            </label>

                            <div className="space-y-3">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {file.type.includes('pdf') ? (
                                                <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                                                    <ImageIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{file.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(idx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </form >
            </main >
        </div >
    );
}
