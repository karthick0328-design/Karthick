'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import {
    ArrowLeft, ShoppingCart, Plus, Trash2, Upload, FileText, Image as ImageIcon,
    Loader2, Save, X, PlusCircle, Layout, Package, Cpu, FlaskConical, Boxes,
    Send, CheckCircle, Activity, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

interface VendorEntry {
    details: string;
    amount: string;
    file?: File;
}

interface PurchaseFormProps {
    serviceName: string;
    backUrl: string;
}

export default function PurchaseForm({ serviceName, backUrl }: PurchaseFormProps) {
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

            const vendorsToSubmit = vendors
                .filter(v => v.details || v.amount)
                .map(v => {
                    if (v.file) {
                        return { ...v, attachmentIndex: -1 };
                    }
                    return v;
                });

            const generalFiles = attachments;
            const vendorFiles = vendorsToSubmit.map(v => v.file).filter((f): f is File => !!f);
            const allFiles = [...generalFiles, ...vendorFiles];

            let currentFileIndex = 0;
            currentFileIndex += generalFiles.length;

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

            const response = await fetch(`${API_BASE}/${projectId}/request-purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Purchase request submitted successfully');
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

    const projectTitle = project?.formData?.compoundName || project?.formData?.productName || project?.category || 'Project';

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
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            Purchase Section
                        </h1>
                        <div className="mt-2 space-y-1">
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                Project Title: <span className="text-slate-900 font-bold">{projectTitle}</span>
                            </p>
                            <p className="text-gray-500 font-medium flex items-center gap-2">
                                <Layout className="w-4 h-4 text-indigo-500" />
                                Project ID: <span className="text-indigo-600 font-bold">{project?.uniqueId}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 space-y-8 pb-32">
                {/* Brand Logistics Tracking Section */}
                {project?.purchaseDetails?.productName ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <Package size={120} />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Brand Logistics Tracking</h3>
                                <p className="text-xs text-gray-500 font-medium">Tracking for {project.purchaseDetails.productName}</p>
                            </div>
                        </div>

                        <div className="relative pl-4">
                            <div className="absolute left-[2.35rem] top-4 bottom-4 w-1 bg-slate-50 rounded-full" />
                            <div className="space-y-12 relative">
                                {[
                                    { step: 'Order Placing', icon: <Package className="w-5 h-5" />, color: 'indigo', desc: 'Sourcing request initiated by Finance Manager' },
                                    { step: 'Going to send', icon: <Send className="w-5 h-5" />, color: 'blue', desc: 'Product verified and bill generated by Finance Employee' },
                                    { step: 'Delivered', icon: <CheckCircle className="w-5 h-5" />, color: 'emerald', desc: 'Product successfully delivered to Service Manager' }
                                ].map((item, idx) => {
                                    const statusOrder = ['Order Placing', 'Going to send', 'Delivered'];
                                    const currentStatus = project.purchaseDetails?.status || 'Order Placing';
                                    const currentIndex = statusOrder.indexOf(currentStatus);
                                    const isCompleted = idx <= currentIndex;
                                    const isCurrent = idx === currentIndex;

                                    return (
                                        <div key={item.step} className="flex items-start gap-8 relative">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-all duration-700 ${isCompleted
                                                ? `bg-${item.color}-600 text-white shadow-xl shadow-${item.color}-100 scale-110`
                                                : 'bg-white text-slate-200 border-2 border-slate-100 scale-100'
                                                }`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 pt-1">
                                                <div className="flex items-center gap-3">
                                                    <h5 className={`font-black text-base tracking-tight ${isCompleted ? 'text-gray-900' : 'text-slate-300'}`}>
                                                        {item.step}
                                                    </h5>
                                                    {isCurrent && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded-full animate-pulse">
                                                            Current Phase
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs mt-1 font-medium leading-relaxed ${isCompleted ? 'text-gray-500' : 'text-slate-200'}`}>
                                                    {item.desc}
                                                </p>
                                                {isCompleted && item.step === 'Order Placing' && (
                                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">
                                                        Allocated: ${project.purchaseDetails?.amountSent?.toLocaleString() || '0'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : project?.financialReview?.requested ? (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                            <FileText size={150} />
                        </div>

                        <div className="flex items-center gap-5 mb-10">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sent Purchase Request</h3>
                                <p className="text-sm text-slate-500 font-medium">Original submission details awaiting procurement</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Boxes className="w-3 h-3" /> Materials & Items
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Software', value: project.financialReview.software, icon: <Cpu className="w-4 h-4" /> },
                                        { label: 'Kits', value: project.financialReview.kits, icon: <Boxes className="w-4 h-4" /> },
                                        { label: 'Consumables', value: project.financialReview.consumable, icon: <FlaskConical className="w-4 h-4" /> },
                                        { label: 'Others', value: project.financialReview.others, icon: <PlusCircle className="w-4 h-4" /> }
                                    ].map(item => item.value && (
                                        <div key={item.label} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="text-indigo-500">{item.icon}</div>
                                                <span className="text-xs font-bold text-slate-600">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <DollarSign className="w-3 h-3" /> Budget Details
                                </h4>
                                <div className="flex items-end gap-2 mb-6">
                                    <span className="text-4xl font-black text-indigo-600">${project.financialReview.requestedAmount?.toLocaleString() || '0'}</span>
                                    <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Total Estimated</span>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Reason</p>
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        "{project.financialReview.requestReason || 'No reason provided'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {project.financialReview.vendors && project.financialReview.vendors.length > 0 && (
                            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Sourcing Vendors</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {project.financialReview.vendors.map((vendor: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col justify-between">
                                            <div>
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 mb-3">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm font-black text-slate-900 mb-1">{vendor.vendorName}</p>
                                                <p className="text-[10px] text-slate-500 font-medium line-clamp-2">{vendor.details}</p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Quote</span>
                                                <span className="text-sm font-black text-indigo-600">${vendor.amount?.toLocaleString() || '0'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100 py-32 flex flex-col items-center justify-center text-center px-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8">
                            <ShoppingCart className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">No Active Logistics</h3>
                        <p className="text-slate-400 font-bold max-w-sm">There is no brand logistics tracking or purchase request information available for this project yet.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
