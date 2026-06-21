'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    User,
    Briefcase,
    Eye,
    Send,
    Layers,
    Tag,
    Cpu,
    Package,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Loader2,
    Boxes,
    FlaskConical,
    PlusCircle,
    Paperclip,
    AlertCircle
} from 'lucide-react';
import { validateURL } from '@/lib/validation';

// --- Types & Interfaces ---

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
    userId: {
        name: string;
        email: string;
        uniqueId: string;
        department: string;
    };
    department: string;
    category: string;
    status: string;
    paymentStatus: string;
    quotedAmount?: number;
    formData?: any;
    remarks?: string;
    createdAt: string;
    submittedAt: string;
    financialReview?: {
        requested: boolean;
        status: 'Pending' | 'Approved' | 'Rejected';
        requestedBy: {
            _id: string;
            name: string;
            email: string;
            uniqueId: string;
            role?: string;
            service?: string;
        };
        requestReason: string;
        software?: string;
        consumable?: string;
        kits?: string;
        others?: string;
        requestedAmount: number;
        selectedProducts?: string[];
        vendors?: Array<{
            details: string;
            amount: string;
            attachment?: { originalName: string; filename: string; path: string; mimeType: string }
        }>;
        attachments?: Array<{ originalName: string; filename: string; path: string; mimeType: string }>;
        requestedAt: string;
        reviewedBy?: string;
        approvedAmount?: number;
        remarks?: string;
        reviewedAt?: string;
    };
    paymentDetails?: {
        amount: number;
        paidAmount: number;
        paymentMethod: string;
        transactionId?: string;
        dueDate?: string;
        isVerified?: boolean;
    };
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

const PRODUCT_TYPE_MAP: Record<string, 'product' | 'consumable' | 'brand'> = {
    // Software Development
    'Frontend Development': 'product', 'Backend Development': 'product', 'Full Stack Development': 'product',
    'Mobile App Development': 'product', 'Cloud Infrastructure': 'product', 'Software Testing / QA': 'product',
    'React Premium Licenses': 'consumable', 'UI Kit (Tailwind UI)': 'consumable', 'Headless UI Pro': 'consumable',
    'Vercel Deployment Bundle': 'consumable', 'Cloudinary Asset Storage': 'consumable',
    'MongoDB Atlas Managed Instance': 'consumable', 'Redis Cloud Cluster': 'consumable',
    'AWS Lambda Execution Units': 'consumable', 'Postman Enterprise API License': 'consumable',
    'Datadog APM Units': 'consumable', 'Meta Enterprise': 'brand', 'Vercel Pro Support': 'brand',
    'Community Pro': 'brand', 'Official Tailwind UI': 'brand', 'Flowbite Pro': 'brand',
    'TailwindUI Kit': 'brand', 'AWS Edition': 'brand', 'GCP Edition': 'brand', 'Azure Edition': 'brand',

    // Microbiology
    'Microbial Identification': 'product', 'Antibiotic Susceptibility Testing': 'product',
    'Environmental Monitoring': 'product', 'Sterility Testing': 'product', 'Endotoxin Testing': 'product',
    'VITEK ID Cards': 'consumable', 'API Strips': 'consumable', 'Biochemical Media': 'consumable',
    'Staining reagents': 'consumable', 'MIC Strips': 'consumable', 'Antibiotic Disks': 'consumable',
    'Mueller-Hinton Agar packs': 'consumable', 'Air Sampler Plates': 'consumable',
    'Surface Swabs': 'consumable', 'Growth media for molds': 'consumable',
    'Gram Negative (GN)': 'brand', 'Gram Positive (GP)': 'brand', 'Yeast (YST)': 'brand',
    'Anaerobe (ANC)': 'brand', 'Oxoid': 'brand', 'BD BBL': 'brand', 'Mast Group': 'brand',
    'Sartorius Tryptic Soy': 'brand', 'Merck Sabouraud': 'brand', 'bioMérieux Count-Tact': 'brand',

    // NGS
    'Whole genome / genome analysis': 'product', 'RNA-sequence differential expression analysis': 'product',
    'Metagenomics (16S and shotgun)': 'product', 'Microbiomes profiling': 'product',
    'Variant annotation and reporting': 'product', 'Oncogenomics: tumor-normal analysis': 'product',
    'Pharmacogenomics': 'product', 'Illumina Flow Cells': 'consumable', 'Library Prep Kits': 'consumable',
    'DNA Extraction Reagents': 'consumable', 'Bioinformatics Pipeline storage': 'consumable',
    'RNA-seq Library Kits': 'consumable', 'NovaSeq 6000 S4': 'brand', 'NextSeq 2000 P3': 'brand',
    'MiSeq v3': 'brand', 'NEBNext Ultra II': 'brand', 'Illumina DNA Prep': 'brand', 'KAPA HyperPrep': 'brand',

    // Biochemistry
    'Enzyme Assays': 'product', 'Protein Purification': 'product', 'Metabolic Profiling': 'product',
    'Spectrophotometric Analysis': 'product', 'Lipid Analysis': 'product',
    'Substrate analogs': 'consumable', 'Fluorescence detection kits': 'consumable',
    'Reaction inhibitors': 'consumable', 'Affinity Chromatography Columns': 'consumable',
    'Protein Assay kits (BCA/Bradford)': 'consumable', 'Sigma-Aldrich': 'brand', 'Cayman Chemical': 'brand',
    'Tocris Bioscience': 'brand', 'Pierce/Thermo Scientific': 'brand', 'Bio-Rad': 'brand',

    // Molecular Biology
    'DNA Extraction / Purification': 'product', 'PCR / qPCR Analysis': 'product',
    'Cloning / Subcloning': 'product', 'Genotyping': 'product', 'RNA Analysis': 'product',
    'Column-based extraction kits': 'consumable', 'Taq Polymerase Master Mix': 'consumable',
    'qPCR Probes (TaqMan)': 'consumable', 'Plasmid Prep Kits': 'consumable', 'cDNA Synthesis Kit': 'consumable',
    'Qiagen DNeasy': 'brand', 'Zymo Pure': 'brand', 'Thermo Fisher GeneJET': 'brand',
    'NEB OneTaq': 'brand', 'Promega GoTaq': 'brand', 'Applied Biosystems': 'brand',

    // Drug Discovery
    'Virtual screening + Docking': 'product', 'ADMET Prediction': 'product',
    'Toxicity Profiling of compounds': 'product', 'QSAR modelling': 'product',
    'Ligand Search and Creation compound chemistry': 'product',
    'GPU Compute Hours': 'consumable', 'AutoDock Vina Enterprise': 'consumable',
    'Schrodinger Suite License': 'consumable', 'ZINC Database Access': 'consumable',
    'SwissADME Premium': 'consumable', 'PK/PB modeling tools': 'consumable', 'Metamouse Database': 'consumable',
    'In-vitro Toxicity Kits': 'consumable', 'Cell Line Preparation': 'consumable', 'Biomarker reagents': 'consumable',
    'Molecular Descriptor Software': 'consumable', 'QSAR toolbox Cloud': 'consumable', 'Model Validation service': 'consumable',
    'Chemaxon License': 'consumable', 'PubChem API Enterprise': 'consumable', 'Chemical space exploration tool': 'consumable',
    'NVIDIA H100 (AWS)': 'brand', 'NVIDIA A100 (GCP)': 'brand', 'TPU v4 (GCP)': 'brand',
    'Standard Edition': 'brand', 'Parallelized (HPC)': 'brand', 'Cloud-Native': 'brand',
    'Swiss Institute of Bioinformatics': 'brand', 'Commercial License Pack': 'brand',
    'MarvinJS Enterprise': 'brand', 'JChem Base': 'brand', 'Calculator Plugins': 'brand',
};

const getStatusBadgeColor = (status: string) => {
    switch (status) {
        case 'Approved':
            return 'bg-emerald-500 text-emerald-500';
        case 'Rejected':
            return 'bg-rose-500 text-rose-500';
        case 'Pending':
            return 'bg-amber-500 text-amber-500';
        case 'Consolidated':
            return 'bg-indigo-500 text-indigo-500';
        default:
            return 'bg-slate-500 text-slate-500';
    }
};

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${color} border border-current bg-opacity-10 backdrop-blur-sm`}>
        {children}
    </span>
);

export default function RequestedServiceDetailsPage() {
    const router = useRouter();
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected'>('Approved');
    const [approvedAmount, setApprovedAmount] = useState<number>(0);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Purchase Initiation States
    const [financeEmployees, setFinanceEmployees] = useState<any[]>([]);
    const [selectedBrandProduct, setSelectedBrandProduct] = useState('');
    const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
    const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
    const [purchaseDescription, setPurchaseDescription] = useState('');
    const [isPurchaseInitiating, setIsPurchaseInitiating] = useState(false);
    const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            loadFinanceEmployees(token);
        }
    }, []);

    const loadFinanceEmployees = async (token: string) => {
        try {
            const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/api/finance/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) setFinanceEmployees(data.data);
            }
        } catch (err) {
            console.error('Failed to load finance team:', err);
        }
    };

    const handleInitiatePurchase = async () => {
        if (!project || !selectedBrandProduct || purchaseAmount <= 0 || !assignedEmployeeId) {
            toast.error('Please fill all purchase details correctly');
            return;
        }

        setIsPurchaseInitiating(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${project._id}/purchase/initiate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productName: selectedBrandProduct,
                    amountSent: purchaseAmount,
                    assignedEmployeeId: assignedEmployeeId,
                    quantity: purchaseQuantity,
                    description: purchaseDescription
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    toast.success('Brand purchase initiated successfully!');
                    loadProjectDetails(token!);
                } else {
                    toast.error(data.message || 'Failed to initiate purchase');
                }
            } else {
                toast.error('Server error initiating purchase');
            }
        } catch (err) {
            console.error('Purchase init error:', err);
            toast.error('Network error initiating purchase');
        } finally {
            setIsPurchaseInitiating(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/Login/Signin');
            return;
        }
        loadProjectDetails(token);
    }, [id]);

    const loadProjectDetails = async (token: string) => {
        setLoading(true);
        try {
            console.log(`[Finance Dept] Loading project details for ID: ${id} from ${API_BASE}`);
            const res = await fetch(`${API_BASE}/${id}`, {
                mode: 'cors',

                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Finance Dept] Load Details API error (${res.status}):`, errText);
                throw new Error(`Load error: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                const rawProject = data.data;
                const sanitizedProject = {
                    ...rawProject,
                    uniqueId: (rawProject.uniqueId && /^[\w-]+$/i.test(rawProject.uniqueId)) ? rawProject.uniqueId : 'INVALID',
                    financialReview: rawProject.financialReview ? {
                        ...rawProject.financialReview,
                        attachments: rawProject.financialReview.attachments?.map((a: any) => ({
                            ...a,
                            path: (a.path && /^[\w\/\.\-\\ ]+$/i.test(a.path)) ? a.path : ''
                        }))
                    } : undefined
                };
                setProject(sanitizedProject);
                setApprovedAmount(sanitizedProject.quotedAmount || 0);
            } else {
                toast.error(data.message || 'Failed to load project details');
            }
        } catch (err: any) {
            console.error('[Finance Dept] Project details load error:', err);
            toast.error(err.message || 'Network error loading details');
        } finally {
            setLoading(false);
        }
    };

    const handleReviewProject = async (actionOverride?: 'Approved' | 'Rejected') => {
        if (!project) return;
        const finalAction = actionOverride || reviewAction;
        setIsSubmitting(true);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/${project._id}/approve-financial-review`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: finalAction,
                    approvedAmount: finalAction === 'Approved' ? approvedAmount : undefined,
                    remarks: reviewRemarks
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`[Finance Dept] Review action error (${res.status}):`, errText);
                throw new Error(`Review submission error: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                toast.success(`Financial review ${finalAction.toLowerCase()} successfully!`);
                loadProjectDetails(token!);
            } else {
                toast.error(data.message || 'Failed to process review');
            }
        } catch (err: any) {
            console.error('[Finance Dept] Review submission error:', err);
            toast.error(err.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Dossier...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-12 text-center">
                <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-900">Project Not Found</h1>
                <button onClick={() => router.back()} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Back to List</button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 p-6">
            <Toaster position="top-right" />

            {/* Back Navigation */}
            <button
                onClick={() => router.back()}
                className="group flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 font-bold transition-all shadow-sm hover:shadow-md w-fit"
            >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                <span className="text-sm uppercase tracking-widest">Back to Review Registry</span>
            </button>

            {/* Main Header Card */}
            <section className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-indigo-500/5 border border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 transform hover:rotate-3 transition-transform">
                            <Cpu className="w-12 h-12" />
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">{project.uniqueId}</h1>

                            </div>
                            <div className="flex items-center gap-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> {project.department}</span>
                                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                                <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-500" /> {project.category}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                            <User className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Originator</p>
                            <p className="text-base font-black text-slate-900 leading-tight">{project.userId?.name || 'Unknown'}</p>
                            <p className="text-[10px] font-bold text-slate-400">{project.userId?.email || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Left Side: Project details and Financial Review */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Financial Review Section */}
                    {project.financialReview?.requested && (
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                                <BarChart3 className="w-48 h-48" />
                            </div>

                            <div className="flex items-center justify-between mb-10 pb-10 border-b border-slate-50">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    Financial Review Dossier
                                </h2>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Timestamp</p>
                                    <p className="text-sm font-black text-slate-900">{new Date(project.financialReview.requestedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Submission Authority</p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                                <User className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900">{project.financialReview.requestedBy?.name || 'Unknown'}</p>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                    {project.financialReview.requestedBy?.role || 'Service Manager'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Justification Summary</p>
                                        <div className="p-6 bg-slate-50 rounded-3xl text-sm font-medium text-slate-600 leading-relaxed border border-slate-100 italic">
                                            "{project.financialReview.requestReason}"
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200">
                                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-4">Current Financial Status</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black tracking-tighter">
                                                {project.financialReview.status === 'Approved'
                                                    ? `$${(project.financialReview.approvedAmount || 0).toLocaleString()}`
                                                    : 'PENDING'}
                                            </span>
                                            {project.financialReview.status === 'Approved' && (
                                                <span className="text-indigo-200 font-bold uppercase tracking-widest text-[10px]">Settled</span>
                                            )}
                                        </div>
                                        <div className="mt-6 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-indigo-100" />
                                            </div>
                                            <p className="text-xs font-bold text-indigo-100 tracking-wide">
                                                {project.financialReview.status === 'Pending' ? 'Awaiting Manager Decision' : 'Transaction Completed'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resource List */}
                            {project.financialReview.selectedProducts && project.financialReview.selectedProducts.length > 0 && (
                                <div className="mt-12 pt-12 border-t border-slate-50">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Specified Bill of Materials
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {project.financialReview.selectedProducts.map((item, idx) => {
                                            const type = PRODUCT_TYPE_MAP[item] || 'other';
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-xl bg-white shadow-sm text-indigo-600`}>
                                                            {type === 'product' ? <Layers size={16} /> : type === 'consumable' ? <Package size={16} /> : <Tag size={16} />}
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{item}</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-white text-[8px] font-black text-slate-400 uppercase rounded border border-slate-100">
                                                        {type}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Vendor Quotes */}
                            {project.financialReview.vendors && project.financialReview.vendors.length > 0 && (
                                <div className="mt-12 pt-12 border-t border-slate-50">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Competitive Vendor Bids
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {project.financialReview.vendors.map((vendor, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500 font-black">
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900">{vendor.details}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Provider Profile</p>
                                                    </div>
                                                </div>
                                                <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 font-black text-xl text-emerald-600 tracking-tighter">
                                                    ${Number(vendor.amount).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Supporting Documents */}
                            {project.financialReview.attachments && project.financialReview.attachments.length > 0 && (
                                <div className="mt-12 pt-12 border-t border-slate-50">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Supporting Documentation
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {project.financialReview.attachments.map((file, idx) => {
                                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                                            const rawPath = file.path || '';
                                            const parts = rawPath.split(/[\\/]uploads/i);
                                            const relativePath = parts.length > 1 ? 'uploads/' + parts.pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : rawPath;
                                            const fullUrl = `${baseUrl}/${relativePath}`;
                                            const isSafe = fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('/');
                                            const finalUrl = isSafe ? fullUrl : '#';

                                            return (
                                                <a
                                                    key={idx}
                                                    href={finalUrl !== '#' ? encodeURI(finalUrl) : '#'}
                                                    data-sanitized="true"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-[2rem] transition-all group"
                                                >
                                                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
                                                        <Paperclip size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-700 truncate">{file.originalName || file.filename}</p>
                                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Secure Document Access</p>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Brand Purchase Status (Flipkart Style) */}
                    {(project as any).purchaseDetails?.productName && (
                        <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl mt-12 bg-gradient-to-br from-white to-slate-50/50">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Package className="w-5 h-5" />
                                </div>
                                Purchase Details
                            </h4>

                            {/* Selected Vendor and Amount */}
                            {(() => {
                                const validVendors = project.financialReview?.vendors?.filter(v => v && v.details && Number(v.amount) > 0) || [];
                                const lowestVendor = validVendors.length > 0 ? validVendors.reduce((min, v) => Number(v.amount) < Number(min.amount) ? v : min) : null;

                                return lowestVendor && (
                                    <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-2">Selected Vendor</p>
                                                <p className="text-xl font-black text-indigo-900 mb-1">{lowestVendor.details}</p>
                                                <p className="text-xs text-indigo-600 font-medium">Chosen based on competitive quote analysis</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">Amount</p>
                                                <p className="text-3xl font-black text-indigo-700">${Number(lowestVendor.amount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {/* Selected Vendor's Supporting Document */}
                                        {lowestVendor.attachment && (
                                            <div className="pt-4 border-t border-indigo-200">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <FileText className="w-3 h-3" />
                                                    Vendor Quote Document
                                                </p>
                                                <a
                                                    href={(() => {
                                                        const rawPath = lowestVendor.attachment.path || '';
                                                        const parts = rawPath.split(/[\\/]uploads/i);
                                                        const relativePath = parts.length > 1 ? 'uploads/' + parts.pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : rawPath;
                                                        const fullUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${relativePath}`;
                                                        const isSafe = fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('/');
                                                        return isSafe ? encodeURI(fullUrl) : '#';
                                                    })()}
                                                    data-sanitized="true"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-4 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all group"
                                                >
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-indigo-900 truncate">{lowestVendor.attachment.originalName || lowestVendor.attachment.filename}</p>
                                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1 mt-1">
                                                            Download Quote <ArrowRight className="w-3 h-3" />
                                                        </p>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Logistics Tracker */}
                            <div className="relative px-4">
                                <div className="absolute left-[2.35rem] top-4 bottom-4 w-1 bg-slate-100 rounded-full" />
                                <div className="space-y-12 relative">
                                    {[
                                        { step: 'Order Placing', icon: <Package />, color: 'indigo', desc: 'Financial Manager initiated request' },
                                        { step: 'Going to send', icon: <Send />, color: 'blue', desc: 'Employee verified and bill generated' },
                                        { step: 'Delivered', icon: <CheckCircle />, color: 'emerald', desc: 'Product handed over to Service Manager' }
                                    ].map((item, idx) => {
                                        const currentStatus = (project as any).purchaseDetails?.status;
                                        const statusIndex = ['Order Placing', 'Going to send', 'Delivered'].indexOf(currentStatus);
                                        const isCompleted = idx <= statusIndex;
                                        const isCurrent = idx === statusIndex;

                                        return (
                                            <div key={item.step} className="flex items-start gap-8 relative group">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 transition-all duration-700 transform ${isCompleted
                                                    ? `bg-${item.color}-600 text-white shadow-2xl shadow-${item.color}-200 scale-110`
                                                    : 'bg-white text-slate-200 border-2 border-slate-100 scale-100'
                                                    } ${isCurrent ? 'ring-4 ring-offset-4 ring-indigo-100' : ''}`}>
                                                    {React.cloneElement(item.icon as any, { size: 24 })}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <div className="flex items-center gap-3">
                                                        <h5 className={`font-black text-lg tracking-tight ${isCompleted ? 'text-slate-900' : 'text-slate-300'}`}>
                                                            {item.step}
                                                        </h5>
                                                        {isCurrent && (
                                                            <span className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                                                Active Phase
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-xs font-medium mt-1 leading-relaxed ${isCompleted ? 'text-slate-500' : 'text-slate-200'}`}>
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bill Document/Image (if generated) */}
                            {((project as any).purchaseDetails?.billForm?.generated) && (
                                <div className="mt-12 pt-10 border-t border-slate-100">
                                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Identification</p>
                                            <p className="text-xl font-black text-slate-900 tracking-tight">{(project as any).purchaseDetails.billForm.billNumber}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {new Date((project as any).purchaseDetails.billForm.generatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Refund / Remaining</p>
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">Returned</div>
                                                <p className="text-3xl font-black text-emerald-600 tracking-tighter text-right">${Number((project as any).purchaseDetails.billForm.remainingAmount).toLocaleString()}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 text-right">Settled by Financial Employee</p>
                                        </div>

                                        {/* Quantity & Verification Info */}
                                        {((project as any).purchaseDetails.billForm.receivedQuantity || (project as any).purchaseDetails.billForm.verified !== undefined) && (
                                            <>
                                                {(project as any).purchaseDetails.billForm.receivedQuantity && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Quantity</p>
                                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{(project as any).purchaseDetails.billForm.receivedQuantity}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Quality Verified</p>
                                                    </div>
                                                )}
                                                {(project as any).purchaseDetails.billForm.verified !== undefined && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Verification Status</p>
                                                        <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-sm float-right ${(project as any).purchaseDetails.billForm.verified
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {(project as any).purchaseDetails.billForm.verified ? (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Verified
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    Pending
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Bill Image Document Link */}
                                        {(project as any).purchaseDetails?.billForm?.billImage && (
                                            <div className="col-span-full space-y-3 pt-4 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <FileText className="w-3 h-3" />
                                                    Employee Submitted Bill Receipt
                                                </p>
                                                <a
                                                    href={(() => {
                                                        const rawPath = (project as any).purchaseDetails.billForm.billImage || '';
                                                        const parts = rawPath.split(/[\\/]uploads/i);
                                                        const relativePath = parts.length > 1 ? 'uploads/' + parts.pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : rawPath;
                                                        const fullUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${relativePath}`;
                                                        const isSafe = fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('/');
                                                        return isSafe ? encodeURI(fullUrl) : '#';
                                                    })()}
                                                    data-sanitized="true"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-4 bg-white border-2 border-indigo-100 rounded-2xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Paperclip className="w-4 h-4 text-indigo-400" />
                                                        <span>View Invoice Document</span>
                                                    </div>
                                                    <Eye className="w-4 h-4 transition-transform group-hover:scale-110" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Brand Purchase Initiation (if approved but not started) */}
                    {project.financialReview?.status === 'Approved' && !((project as any).purchaseDetails?.productName) && (
                        <div className="p-10 bg-indigo-50/50 rounded-[3rem] border-2 border-dashed border-indigo-200 space-y-8 mt-12 animate-in fade-in zoom-in duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-indigo-900 tracking-tight text-2xl">Authorization Pending</h4>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Initiate Brand Purchase Phase</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Select Verified Vendor Quote</label>
                                {project.financialReview?.vendors && project.financialReview.vendors.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {project.financialReview.vendors.map((vendor, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedBrandProduct(vendor.details);
                                                    setPurchaseAmount(Number(vendor.amount));
                                                }}
                                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedBrandProduct === vendor.details
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]'
                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl ${selectedBrandProduct === vendor.details ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <Tag className="w-5 h-5" />
                                                    </div>
                                                    <p className="font-black text-sm tracking-tight">{vendor.details}</p>
                                                </div>
                                                <p className="font-black text-lg">${Number(vendor.amount).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold leading-relaxed italic">
                                        No specific vendor quotes were recorded during the review. Physical manual entry required below.
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Product / Service Identity</label>
                                    <input
                                        type="text"
                                        value={selectedBrandProduct}
                                        onChange={(e) => setSelectedBrandProduct(e.target.value)}
                                        placeholder="Exact name of unit to purchase"
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-black text-slate-800"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Settlement Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                        <input
                                            type="number"
                                            value={purchaseAmount}
                                            onChange={(e) => setPurchaseAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-10 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-black text-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Purchase Quantity</label>
                                    <input
                                        type="number"
                                        value={purchaseQuantity}
                                        onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-black text-slate-800"
                                        placeholder="1"
                                        min="1"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Financial Agent</label>
                                    <select
                                        value={assignedEmployeeId}
                                        onChange={(e) => setAssignedEmployeeId(e.target.value)}
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-black text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="">Choose delegate for logistics...</option>
                                        {financeEmployees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()} [{emp.uniqueId}]</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Special Instructions</label>
                                    <textarea
                                        value={purchaseDescription}
                                        onChange={(e) => setPurchaseDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Add any specific instructions for the purchase..."
                                        className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-bold text-slate-700 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleInitiatePurchase}
                                disabled={isPurchaseInitiating || !selectedBrandProduct || purchaseAmount <= 0 || !assignedEmployeeId}
                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isPurchaseInitiating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Authorize & Dispatch Order
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side: Manager Decision Form & Timeline */}
                <div className="space-y-10">

                    {/* Action Form */}
                    {project.financialReview?.status === 'Pending' ? (
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl shadow-indigo-100 sticky top-10">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Final Verdict</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10 pb-6 border-b border-slate-50">Decision Management Portal</p>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Verdict Selection</label>
                                    <div className="flex gap-4 p-2 bg-slate-50 rounded-3xl">
                                        <button
                                            onClick={() => setReviewAction('Approved')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${reviewAction === 'Approved' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setReviewAction('Rejected')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${reviewAction === 'Rejected' ? 'bg-white text-rose-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                </div>

                                {reviewAction === 'Approved' && (
                                    <div className="animate-in zoom-in-95 duration-300">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Approved Settlement Amount</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                            <input
                                                type="number"
                                                value={approvedAmount}
                                                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                                                className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-100 text-xl font-black text-emerald-700 outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Audit Remarks</label>
                                    <textarea
                                        value={reviewRemarks}
                                        onChange={(e) => setReviewRemarks(e.target.value)}
                                        rows={4}
                                        className="w-full p-6 bg-slate-50 border-none rounded-[2.5rem] focus:ring-4 focus:ring-indigo-100 text-sm font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="Add executive remarks or reason for rejection..."
                                    />
                                </div>

                                <button
                                    onClick={() => handleReviewProject()}
                                    disabled={isSubmitting}
                                    className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${reviewAction === 'Approved'
                                        ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-1'
                                        : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700 hover:-translate-y-1'
                                        } disabled:opacity-50 disabled:translate-y-0`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Submit Final Verdict
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform">
                                <FileText size={160} />
                            </div>
                            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 relative z-10">Audit Log Entries</h2>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Verdict Status</p>
                                    <div className="flex items-center gap-3">
                                        {project.financialReview?.status === 'Approved'
                                            ? <CheckCircle className="text-emerald-500" />
                                            : <XCircle className="text-rose-500" />
                                        }
                                        <p className="text-xl font-black uppercase tracking-tight">{project.financialReview?.status}</p>
                                    </div>
                                </div>

                                {project.financialReview?.remarks && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Executive Summary</p>
                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-xs font-bold leading-relaxed text-indigo-100 block">
                                            "{project.financialReview.remarks}"
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 border-t border-white/10">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reviewed At</p>
                                    <p className="text-xs font-bold text-slate-300">
                                        {project.financialReview?.reviewedAt ? new Date(project.financialReview.reviewedAt).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Origin Section Details */}
                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Project Context</h4>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                                <p className="text-xs font-black text-slate-900">{project.status}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Payment</p>
                                <p className="text-xs font-black text-slate-900">{project.paymentStatus}</p>
                            </div>
                        </div>

                        {project.formData?.services && (
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enrolled Services</p>
                                <div className="flex flex-wrap gap-2">
                                    {(Array.isArray(project.formData.services) ? project.formData.services : [project.formData.services]).map((s: string, idx: number) => (
                                        <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-lg border border-indigo-100/50">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
