'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  TrendingUp,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  Eye,
  Send,
  Layers,
  Tag,
  Cpu,
  Package,
  ArrowRight,
  Filter,
  BarChart3,
  Loader2,
  Boxes,
  FlaskConical,
  PlusCircle,
  Paperclip
} from 'lucide-react';

import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';

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
  assignedTo?: Array<{ name: string; email: string }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// --- Constants ---

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// --- Helper Components ---

// --- Product Type Registry for Better Visualization ---
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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, bgColor }) => (
  <div className="relative overflow-hidden bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-200/50 group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
    <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${bgColor} opacity-[0.4] group-hover:scale-125 transition-transform duration-700 pointer-events-none`} />
    <div className="relative flex items-center justify-between">
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <h3 className={`text-4xl font-black tracking-tighter ${color}`}>{value}</h3>
      </div>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${color} group-hover:rotate-12`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' } as any)}
      </div>
    </div>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${color} border border-current bg-opacity-10 backdrop-blur-sm`}>
    {children}
  </span>
);

const ModalWrapper: React.FC<{
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  maxWidth?: string
}> = ({ children, title, onClose, maxWidth = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none" />
    <div className={`relative bg-white rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500`}>
      <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Financial Management Portal</p>
        </div>
        <button
          onClick={onClose}
          className="bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all p-2 rounded-xl"
        >
          <XCircle className="w-6 h-6" />
        </button>
      </div>
      <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// --- Main Page Component ---

export default function RequestedServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'payments' | 'purchases'>('pending');
  const [paymentProjects, setPaymentProjects] = useState<Project[]>([]);
  const [purchaseProjects, setPurchaseProjects] = useState<Project[]>([]);
  const [financeEmployees, setFinanceEmployees] = useState<any[]>([]);

  // Modal & Action States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [reviewRemarks, setReviewRemarks] = useState('');

  const [selectedBrandProduct, setSelectedBrandProduct] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [isPurchaseInitiating, setIsPurchaseInitiating] = useState(false);

  // --- Authentication & Data Fetching ---

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

      // STRICT CHECK: Must be manager based in Financial department
      const userRole = (decoded.role || '').toLowerCase().trim();
      const userDept = (decoded.department || '').toLowerCase().trim();

      console.log('[Financial Dashboard] Auth check:', { userRole, userDept });

      // Check role is 'manager'
      if (userRole !== 'manager') {
        if (userRole === 'employee') {
          router.push('/employee-dashboard/finance');
          return;
        }
        toast.error('Access denied. Manager role required for this dashboard.');
        router.push('/dashboard');
        return;
      }

      // Check department is 'financial' or 'finance'
      const isFinDept = userDept === 'financial' || userDept === 'finance' ||
        userDept === 'finance department' || userDept.includes('finance');

      if (!isFinDept) {
        toast.error('Access denied. This dashboard is only for Financial Department.');
        router.push('/dashboard');
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

      loadPendingReviews(token);
      loadAllPayments(token);
      loadPurchaseProjects(token);
      loadFinanceEmployees(token);
    } catch (error) {
      console.error('[Financial Dashboard] Auth error:', error);
      toast.error('Authentication failed');
      router.push('/Login/Signin');
    }
  }, [router]);

  const loadPendingReviews = async (token: string) => {
    setLoading(true);
    const url = `${API_BASE}/financial/reviews`;
    try {
      console.log(`[Financial Dashboard] Fetching pending reviews from: ${url}`);
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load projects');
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Load error:', {
        message: err.message,
        url,
        stack: err.stack
      });
      toast.error(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPayments = async (token: string) => {
    const url = `${API_BASE}/financial/all-payments`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setPaymentProjects(data.data || []);
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Load payments error:', err.message);
    }
  };

  const loadPurchaseProjects = async (token: string) => {
    const url = `${API_BASE}/purchase/projects`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setPurchaseProjects(data.data || []);
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Load purchases error:', err.message);
    }
  };

  const loadFinanceEmployees = async (token: string) => {
    const url = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/api/finance/team`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setFinanceEmployees(data.data || []);
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Load employees error:', err.message);
    }
  };

  // --- Actions ---

  const handleReviewProject = async (actionOverride?: 'Approved' | 'Rejected') => {
    if (!selectedProject) return;

    const finalAction = actionOverride || reviewAction;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/${selectedProject._id}/approve-financial-review`, {
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
        console.error(`[Financial Dashboard] Review API error (${res.status}):`, errText);
        throw new Error(`Review submission error: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        toast.success(`Financial review ${finalAction.toLowerCase()} successfully!`);
        closeModal();
        loadPendingReviews(token!);
      } else {
        toast.error(data.message || 'Failed to process review');
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Review error:', err);
      toast.error(err.message || 'Failed to submit review');
    }
  };
  const handleInitiatePurchase = async () => {
    if (!selectedProject || !selectedBrandProduct || purchaseAmount <= 0 || !assignedEmployeeId) {
      toast.error('Please fill all purchase details correctly');
      return;
    }

    setIsPurchaseInitiating(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/${selectedProject._id}/purchase/initiate`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          productName: selectedBrandProduct,
          amountSent: purchaseAmount,
          quantity: purchaseQuantity,
          assignedEmployeeId,
          description: purchaseDescription
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Financial Dashboard] Purchase API error (${res.status}):`, errText);
        throw new Error(`Purchase initiation error: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        toast.success(`Purchase for ${selectedBrandProduct} initiated successfully!`);
        setSelectedBrandProduct('');
        setPurchaseAmount(0);
        setPurchaseQuantity(1);
        setPurchaseDescription('');
        setAssignedEmployeeId('');
        loadPurchaseProjects(token!);
      } else {
        toast.error(data.message || 'Failed to initiate purchase');
      }
    } catch (err: any) {
      console.error('[Financial Dashboard] Purchase error:', err);
      toast.error(err.message || 'Failed to initiate purchase');
    } finally {
      setIsPurchaseInitiating(false);
    }
  };

  // --- Helper Functions ---

  const openReviewModal = (project: Project) => {
    setSelectedProject(project);
    setApprovedAmount(project.quotedAmount || 0);
    setReviewAction('Approved');
    setReviewRemarks('');
    setShowReviewModal(true);
  };

  const openDetailsModal = (project: Project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowReviewModal(false);
    setShowDetailsModal(false);
    setSelectedProject(null);
    setReviewRemarks('');
    setApprovedAmount(0);
  };

  // --- Derived Data ---

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by tab
    if (activeTab === 'payments') {
      filtered = paymentProjects;
    } else if (activeTab === 'purchases') {
      filtered = purchaseProjects;
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(p => {
        const status = p.financialReview?.status || 'Pending';
        return status.toLowerCase() === activeTab;
      });
    }

    // Filter by search
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.uniqueId?.toLowerCase() || '').includes(query) ||
        (p.userId?.name?.toLowerCase() || '').includes(query) ||
        (p.department?.toLowerCase() || '').includes(query) ||
        (p.financialReview?.requestReason || '').toLowerCase().includes(query) ||
        ((p as any).purchaseDetails?.productName || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [projects, searchTerm, activeTab, paymentProjects, purchaseProjects]);

  const stats = useMemo(() => {
    const pending = projects.filter(p => p.financialReview?.status === 'Pending').length;
    const approved = projects.filter(p => p.financialReview?.status === 'Approved').length;
    const rejected = projects.filter(p => p.financialReview?.status === 'Rejected').length;
    const totalAmount = projects
      .filter(p => p.financialReview?.status === 'Pending')
      .reduce((sum, p) => sum + (p.financialReview?.requestedAmount || 0), 0);

    const totalPaid = paymentProjects.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);

    return { pending, approved, rejected, totalAmount, totalPaid, paymentCount: paymentProjects.length };
  }, [projects, paymentProjects]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <DollarSign className="w-16 h-16 text-green-600 animate-bounce mx-auto mb-4" />
          <p className="text-xl text-gray-700 font-medium">Loading Financial Reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />

      {/* Simplified Mobile Title (Layout handles main header) */}
      <div className="lg:hidden mb-6">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
          <DollarSign className="w-8 h-8 text-indigo-600" />
          Finance Hub
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <MetricCard
          title="Pending Reviews"
          value={stats.pending}
          icon={<Clock />}
          color="text-amber-500"
          bgColor="bg-amber-50"
        />
        <MetricCard
          title="Total Requests"
          value={projects.length}
          icon={<Briefcase />}
          color="text-blue-500"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Total Paid Value"
          value={`$${stats.totalPaid.toLocaleString()}`}
          icon={<TrendingUp />}
          color="text-emerald-500"
          bgColor="bg-emerald-50"
        />
        <MetricCard
          title="Manager Decision"
          value={stats.approved + stats.rejected}
          icon={<CheckCircle />}
          color="text-rose-500"
          bgColor="bg-rose-50"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100">

        {/* Controls Bar */}
        < div className="p-8 border-b border-slate-100 bg-white" >
          <div className="flex flex-col xl:flex-row justify-between items-center gap-8">

            {/* Custom Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto no-scrollbar">
              {[
                { id: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" /> },
                { id: 'approved', label: 'Approved', icon: <CheckCircle className="w-4 h-4" /> },
                { id: 'rejected', label: 'Rejected', icon: <XCircle className="w-4 h-4" /> },
                { id: 'purchases', label: 'Purchases', icon: <Package className="w-4 h-4" /> },
                { id: 'all', label: 'History', icon: <Layers className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100 scale-105 transform'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-4 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-96">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-300 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Scan project IDs, requests, departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 text-slate-700 font-bold placeholder-slate-300 transition-all outline-none"
                />
              </div>
              <button className="p-4 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-2xl transition-all shadow-inner">
                <Filter className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div >

        {/* Projects Table */}
        <div className="overflow-y-auto max-h-[800px] custom-scrollbar px-6">
          {
            filteredProjects.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Package className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">Financial Vault Empty</p>
                <p className="text-slate-400 font-medium mt-2">No review requests match your current filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-4 px-6 pb-6">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <th className="px-6 py-4">Project Entity</th>
                    <th className="px-6 py-4">Originator</th>
                    <th className="px-6 py-4">Financial Payload</th>
                    <th className="px-6 py-4">Context / Reason</th>

                    <th className="px-6 py-4 text-right">Discovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                  {filteredProjects.map((project: Project) => (
                    <tr
                      key={project._id}
                      className="group bg-white hover:bg-indigo-50/10 transition-all duration-500 rounded-3xl relative overflow-hidden ring-1 ring-slate-100 hover:ring-indigo-200 cursor-pointer"
                      onClick={() => openDetailsModal(project)}
                    >
                      <td className="px-6 py-8 first:rounded-l-3xl">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 transition-transform group-hover:rotate-3">
                            <Cpu className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-lg tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{project.uniqueId}</p>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1.5 mt-1">
                              <Layers className="w-3 h-3" />
                              {project.department}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-400" />
                            </div>
                            <p className="text-sm font-black text-slate-800 tracking-tight">
                              {activeTab === 'payments' ? (project.userId?.name || 'Unknown') : (project.financialReview?.requestedBy?.name || 'Unknown')}
                            </p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 ml-8">
                            {activeTab === 'payments' ? project.userId?.email : project.financialReview?.requestedBy?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-8">
                        {activeTab === 'payments' ? (
                          <div className="flex flex-col">
                            <p className="text-sm font-black text-emerald-600 tracking-tighter">
                              PAID: ${(project.paymentDetails?.paidAmount || 0).toLocaleString()}
                            </p>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden max-w-[120px]">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((project.paymentDetails?.paidAmount || 0) / (project.quotedAmount || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : activeTab === 'purchases' ? (
                          <div className="flex flex-col">
                            <p className="text-sm font-black text-indigo-600 tracking-tighter">
                              AMT: ${(project as any).purchaseDetails?.amountSent?.toLocaleString() || 0}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
                              To: {(project as any).purchaseDetails?.assignedEmployee?.name || 'Unassigned'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-black text-amber-700 uppercase tracking-wider">TBD</p>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">By Finance</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-8">
                        <div className="flex items-start gap-2 max-w-xs">
                          <Tag className="w-4 h-4 text-slate-300 mt-0.5" />
                          <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-2">
                            {activeTab === 'payments' ? project.paymentStatus : activeTab === 'purchases' ? (project as any).purchaseDetails?.productName : (project.financialReview?.requestReason || 'No justification provided')}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-8 text-right last:rounded-r-3xl">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          {activeTab === 'pending' && (
                            <button
                              onClick={() => openReviewModal(project)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => openDetailsModal(project)}
                            className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all duration-300 shadow-sm"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div >
      </div >

      {/* --- Modals --- */}

      {/* Review Modal - Only for Managers */}
      {
        showReviewModal && selectedProject && (
          <ModalWrapper title="Financial Review" onClose={closeModal}>
            <div className="space-y-6">
              {/* Project Info */}
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200/50">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight">Project Identification</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedProject.uniqueId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Department</p>
                    <p className="font-black text-slate-800">{selectedProject.department}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Requestor</p>
                    <p className="font-black text-slate-800">
                      {selectedProject.financialReview?.requestedBy?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Budget Request Status</p>
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-black text-amber-700 tracking-tight uppercase">To Be Determined</p>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Financial Manager will assess based on product requirements</p>
                    </div>
                  </div>
                </div>

                {selectedProject.financialReview?.selectedProducts && selectedProject.financialReview.selectedProducts.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Request Bill of Materials
                    </p>
                    <div className="space-y-2">
                      {selectedProject.financialReview.selectedProducts.map((product: string, idx: number) => {
                        const type = PRODUCT_TYPE_MAP[product] || 'consumable';
                        const configs = {
                          product: {
                            bg: 'bg-gradient-to-r from-indigo-50 to-blue-50',
                            text: 'text-indigo-700',
                            border: 'border-indigo-200',
                            icon: <Layers className="w-4 h-4" />,
                            label: 'SERVICE'
                          },
                          consumable: {
                            bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                            text: 'text-emerald-700',
                            border: 'border-emerald-200',
                            icon: <Package className="w-4 h-4" />,
                            label: 'CONSUMABLE'
                          },
                          brand: {
                            bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
                            text: 'text-amber-700',
                            border: 'border-amber-200',
                            icon: <Tag className="w-3.5 h-3.5" />,
                            label: 'BRAND'
                          }
                        };
                        const config = configs[type];

                        return (
                          <div key={idx} className={`flex items-center justify-between ${config.bg} ${config.text} px-4 py-2.5 rounded-xl border ${config.border} shadow-sm`}>
                            <div className="flex items-center gap-3">
                              {config.icon}
                              <span className="text-sm font-black uppercase tracking-wide">{product}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-white/60 text-[8px] font-black uppercase tracking-wider rounded-md">
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Requirements */}
              {(selectedProject.financialReview?.software || selectedProject.financialReview?.consumable || selectedProject.financialReview?.kits || selectedProject.financialReview?.others) && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Boxes className="w-3 h-3 text-indigo-500" />
                    Resource Requirements
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProject.financialReview.software && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Cpu className="w-3 h-3" /> Software
                        </p>
                        <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.software}</p>
                      </div>
                    )}
                    {selectedProject.financialReview.consumable && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Consumable
                        </p>
                        <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.consumable}</p>
                      </div>
                    )}
                    {selectedProject.financialReview.kits && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <FlaskConical className="w-3 h-3" /> Kits
                        </p>
                        <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.kits}</p>
                      </div>
                    )}
                    {selectedProject.financialReview.others && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <PlusCircle className="w-3 h-3" /> Others
                        </p>
                        <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.others}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Request Reason */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-indigo-500" />
                  Description
                </label>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                  "{selectedProject.financialReview?.requestReason || 'No description was provided for this request.'}"
                </div>
              </div>

              {/* Review Actions - Manager Only */}
              {user?.role === 'manager' && (
                <div className="pt-6 space-y-8">
                  {/* Executive Decision Section Removed by User Request */}

                  {/* Remarks and Amount Removed by User Request */}

                  {/* BRAND PURCHASE INITIATION */}
                  {reviewAction === 'Approved' && (
                    <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-6 h-6 text-indigo-600" />
                        <h4 className="font-bold text-indigo-900 tracking-tight text-xl">Initiate Brand Purchase</h4>
                      </div>

                      {/* Dynamic Attachments Display */}
                      {(() => {
                        const selectedVendor = selectedProject.financialReview?.vendors?.find(v => v.details === selectedBrandProduct);
                        const specificAttachment = selectedVendor?.attachment;
                        const generalAttachments = selectedProject.financialReview?.attachments || [];

                        const filesToShow = selectedBrandProduct
                          ? (specificAttachment ? [specificAttachment] : []) // Only show specific if selected
                          : generalAttachments; // Show all general if nothing selected

                        if (filesToShow.length === 0) return null;

                        return (
                          <div className="mb-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              {selectedBrandProduct ? 'Vendor Quote Document' : 'Review General Attachments'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {filesToShow.map((file, idx) => {
                                return (
                                  <a
                                    key={idx}
                                    href={file.path && (file.path.startsWith('http') || file.path.startsWith('/')) ? validateURL(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${file.path.split(/[\\/]uploads/i).pop()?.replace(/^[\\/]/, '') ? 'uploads/' + file.path.split(/[\\/]uploads/i).pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : file.path}`) : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-indigo-600 border border-indigo-100 flex items-center justify-between hover:bg-indigo-50 transition-colors"
                                  >
                                    <span className="truncate max-w-[100px]">{file.originalName || file.filename}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Select Vendor Quote</label>

                        {/* Vendor Selection Cards */}
                        {selectedProject.financialReview?.vendors && selectedProject.financialReview.vendors.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {selectedProject.financialReview.vendors.map((vendor, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedBrandProduct(vendor.details);
                                  setPurchaseAmount(Number(vendor.amount));
                                }}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedBrandProduct === vendor.details
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  {vendor.attachment && (
                                    <div className={`p-1.5 rounded-lg ${selectedBrandProduct === vendor.details ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-sm">{vendor.details}</p>
                                  </div>
                                </div>
                                <p className="font-black">${Number(vendor.amount).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No specific vendor quotes provided. Please enter details manually.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selected / Product Name</label>
                          <input
                            type="text"
                            value={selectedBrandProduct}
                            onChange={(e) => setSelectedBrandProduct(e.target.value)}
                            placeholder="e.g. Vendor A - Kit B"
                            className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 shadow-sm border border-slate-100"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Authorized Amount</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              value={purchaseAmount}
                              onChange={(e) => setPurchaseAmount(parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 shadow-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantity</label>
                          <input
                            type="number"
                            value={purchaseQuantity}
                            onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                            className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 shadow-sm border border-slate-100"
                            placeholder="1"
                            min="1"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description / Instructions</label>
                          <textarea
                            value={purchaseDescription}
                            onChange={(e) => setPurchaseDescription(e.target.value)}
                            placeholder="Optional instructions for the financial employee..."
                            rows={3}
                            className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 shadow-sm border border-slate-100 resize-none"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assign Financial Employee</label>
                          <select
                            value={assignedEmployeeId}
                            onChange={(e) => setAssignedEmployeeId(e.target.value)}
                            className="w-full px-6 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-700 shadow-sm border border-slate-100"
                          >
                            <option value="">Select an employee...</option>
                            {financeEmployees.length === 0 ? (
                              <option disabled>No financial employees found</option>
                            ) : (
                              financeEmployees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name} ({emp.uniqueId}) - {emp.role}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleInitiatePurchase}
                        disabled={isPurchaseInitiating || !selectedBrandProduct || purchaseAmount <= 0 || !assignedEmployeeId}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isPurchaseInitiating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send to Financial Employee
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-8">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-8 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-slate-50 transition-all"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleReviewProject('Rejected')}
                      className="flex-1 px-8 py-5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleReviewProject('Approved')}
                      className="flex-[2] px-8 py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 group"
                    >
                      <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ModalWrapper>
        )
      }

      {/* Details Modal */}
      {
        showDetailsModal && selectedProject && (
          <ModalWrapper title="Project Dossier" onClose={closeModal} maxWidth="max-w-4xl">
            <div className="space-y-10 pb-4">
              {/* Header / Identity */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                    <Cpu className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedProject.uniqueId}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{selectedProject.department}</p>
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedProject.category}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge color={getStatusBadgeColor(selectedProject.financialReview?.status || 'Pending')}>
                    {selectedProject.financialReview?.status || 'Pending'}
                  </Badge>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global Status Registry</p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Left Column: Financial Audit */}
                <div className="lg:col-span-2 space-y-8">

                  {selectedProject.financialReview?.requested && (
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-32 h-32" />
                      </div>

                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Financial Review Dossier
                      </h4>

                      <div className="grid grid-cols-2 gap-10">
                        <div className="col-span-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested Budget</p>
                          <div className="flex items-center gap-3">
                            <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
                              <p className="text-base font-black text-amber-700 tracking-tight uppercase">To Be Determined</p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
                              <AlertCircle className="w-3 h-3" />
                              <span>Amount will be set by Financial Manager</span>
                            </div>
                          </div>
                        </div>
                        {selectedProject.financialReview?.approvedAmount && (
                          <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Approved Settlement</p>
                            <p className="text-3xl font-black text-emerald-600 tracking-tighter mb-2">
                              ${selectedProject.financialReview.approvedAmount.toLocaleString()}
                            </p>
                            {(() => {
                              const validVendors = selectedProject.financialReview?.vendors?.filter(v => v.details && Number(v.amount) > 0) || [];
                              if (validVendors.length > 0) {
                                const lowestVendor = validVendors.reduce((min, v) => Number(v.amount) < Number(min.amount) ? v : min);
                                return (
                                  <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Selected Vendor</p>
                                    <p className="text-sm font-bold text-emerald-800">{lowestVendor.details}</p>
                                    <p className="text-xs text-emerald-600 font-black mt-1">${Number(lowestVendor.amount).toLocaleString()}</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submission Authority</p>
                          <p className="text-sm font-black text-slate-800 tracking-tight">
                            {selectedProject.financialReview?.requestedBy?.name || 'Unknown Authority'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                            Role: {selectedProject.financialReview?.requestedBy?.role || 'Department Manager'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Timestamp</p>
                          <p className="text-sm font-black text-slate-800 tracking-tight">
                            {selectedProject.financialReview?.requestedAt
                              ? new Date(selectedProject.financialReview.requestedAt).toLocaleString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {selectedProject.financialReview?.selectedProducts && selectedProject.financialReview.selectedProducts.length > 0 && (
                        <div className="mt-10 pt-10 border-t border-slate-200/50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Specified Bill of Materials
                          </p>
                          <div className="space-y-6">
                            {(() => {
                              const products = selectedProject.financialReview.selectedProducts;

                              // Group items by type
                              const serviceItems = products.filter((item: string) => PRODUCT_TYPE_MAP[item] === 'product');
                              const consumableItems = products.filter((item: string) => PRODUCT_TYPE_MAP[item] === 'consumable');
                              const brandItems = products.filter((item: string) => PRODUCT_TYPE_MAP[item] === 'brand');

                              return (
                                <>
                                  {/* Services Section */}
                                  {serviceItems.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                                        <Layers className="w-4 h-4 text-indigo-600" />
                                        <h5 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Services Requested</h5>
                                        <span className="ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-md">{serviceItems.length}</span>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {serviceItems.map((item: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 px-4 py-3 rounded-xl border border-indigo-200 shadow-sm">
                                            <Layers className="w-4 h-4" />
                                            <span className="text-sm font-black uppercase tracking-wide flex-1">{item}</span>
                                            <span className="px-2 py-0.5 bg-white/60 text-[8px] font-black uppercase tracking-wider rounded-md">SERVICE</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Consumables Section */}
                                  {consumableItems.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                                        <Package className="w-4 h-4 text-emerald-600" />
                                        <h5 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Consumables Required</h5>
                                        <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-md">{consumableItems.length}</span>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {consumableItems.map((item: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200 shadow-sm">
                                            <Package className="w-4 h-4" />
                                            <span className="text-sm font-black uppercase tracking-wide flex-1">{item}</span>
                                            <span className="px-2 py-0.5 bg-white/60 text-[8px] font-black uppercase tracking-wider rounded-md">CONSUMABLE</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Brands Section */}
                                  {brandItems.length > 0 && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                                        <Tag className="w-4 h-4 text-amber-600" />
                                        <h5 className="text-xs font-black text-amber-600 uppercase tracking-wider">Brand Specifications</h5>
                                        <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-md">{brandItems.length}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {brandItems.map((item: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 px-3 py-2 rounded-lg border border-amber-200 shadow-sm">
                                            <Tag className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold uppercase tracking-wide">{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Other/Uncategorized Items - Fallback */}
                                  {(() => {
                                    const otherItems = products.filter((item: string) => !PRODUCT_TYPE_MAP[item]);
                                    return otherItems.length > 0 ? (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                          <Cpu className="w-4 h-4 text-slate-500" />
                                          <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider">Other Items</h5>
                                          <span className="ml-auto px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-md">{otherItems.length}</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                          {otherItems.map((item: string, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-50 text-slate-700 px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                                              <Cpu className="w-4 h-4" />
                                              <span className="text-sm font-black uppercase tracking-wide flex-1">{item}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Ultimate fallback: Show all items if no categorization worked */}
                                  {(() => {
                                    const otherItems = products.filter((item: string) => !PRODUCT_TYPE_MAP[item]);
                                    return serviceItems.length === 0 && consumableItems.length === 0 && brandItems.length === 0 && otherItems.length === 0 && products.length > 0 ? (
                                      <div className="space-y-2">
                                        <p className="text-xs text-slate-500 italic mb-3">Displaying {products.length} requested items:</p>
                                        {products.map((item: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-3 bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg border border-slate-200">
                                            <Package className="w-4 h-4" />
                                            <span className="text-sm font-bold">{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null;
                                  })()}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vendor Quotes */}
                  {selectedProject.financialReview?.vendors && selectedProject.financialReview.vendors.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        Vendor Quotes
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedProject.financialReview.vendors.map((vendor, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="font-bold text-slate-700 text-sm">{vendor.details}</p>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor Option #{idx + 1}</span>
                            </div>
                            <div className="mt-2 sm:mt-0 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                              <span className="font-black text-slate-900">${Number(vendor.amount).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedProject.financialReview?.attachments && selectedProject.financialReview.attachments.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Supporting Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedProject.financialReview.attachments.map((file, idx) => {
                          const rawPath = file.path || '';
                          const parts = rawPath.split(/[\\/]uploads/i);
                          const relativePath = parts.length > 1 ? 'uploads/' + parts.pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : rawPath;
                          const fullUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${relativePath}`;
                          const isSafe = fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('/');
                          const finalUrl = isSafe ? encodeURI(fullUrl) : '#';

                          return (
                            <a
                              key={idx}
                              href={finalUrl}
                              data-sanitized="true"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all group"
                            >
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{file.originalName || file.filename}</p>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                                  Download <ArrowRight className="w-3 h-3" />
                                </p>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resource Requirements */}
                  {(selectedProject.financialReview?.software || selectedProject.financialReview?.consumable || selectedProject.financialReview?.kits || selectedProject.financialReview?.others) && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Boxes className="w-3 h-3" />
                        Resource Requirements
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProject.financialReview.software && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Cpu className="w-3 h-3" /> Software
                            </p>
                            <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.software}</p>
                          </div>
                        )}
                        {selectedProject.financialReview.consumable && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Package className="w-3 h-3" /> Consumable
                            </p>
                            <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.consumable}</p>
                          </div>
                        )}
                        {selectedProject.financialReview.kits && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <FlaskConical className="w-3 h-3" /> Kits
                            </p>
                            <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.kits}</p>
                          </div>
                        )}
                        {selectedProject.financialReview.others && (
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <PlusCircle className="w-3 h-3" /> Others
                            </p>
                            <p className="font-bold text-slate-700 text-sm">{selectedProject.financialReview.others}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Description</h4>
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 italic text-slate-600 text-sm leading-relaxed shadow-inner">
                      "{selectedProject.financialReview?.requestReason || 'No description was provided for this financial request.'}"
                    </div>
                  </div>

                  {/* Executive Remarks */}
                  {selectedProject.financialReview?.remarks && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Executive Audit Remarks</h4>
                      <div className={`p-8 rounded-[2.5rem] border shadow-sm ${selectedProject.financialReview.status === 'Approved'
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50/50 border-rose-100 text-rose-800'
                        }`}>
                        <p className="text-sm font-bold leading-relaxed italic">
                          "{selectedProject.financialReview.remarks}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Brand Purchase Initiation (if approved but not started) */}
                  {selectedProject.financialReview?.status === 'Approved' && !((selectedProject as any).purchaseDetails?.productName) && (
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
                        {selectedProject.financialReview?.vendors && selectedProject.financialReview.vendors.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {selectedProject.financialReview.vendors.map((vendor, idx) => (
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

                  {/* Brand Purchase Status (Flipkart Style) */}
                  {(selectedProject as any).purchaseDetails?.productName && (
                    <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl mt-12 bg-gradient-to-br from-white to-slate-50/50">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        Purchase Details
                      </h4>

                      {/* Selected Vendor and Amount */}
                      {(() => {
                        const validVendors = selectedProject.financialReview?.vendors?.filter(v => v.details && Number(v.amount) > 0) || [];
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
                                {(() => {
                                  const attachmentUrl = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${lowestVendor.attachment.path.split(/[\\\/]uploads/i).pop()?.replace(/^[\\\/]/, '') ? 'uploads/' + lowestVendor.attachment.path.split(/[\\\/]uploads/i).pop()?.replace(/^[\\\/]/, '').replace(/\\/g, '/') : lowestVendor.attachment.path}`;
                                  const safeUrl = attachmentUrl.startsWith('http') ? validateURL(attachmentUrl) : '#';
                                  return (
                                    <a
                                      href={lowestVendor.attachment.path && (lowestVendor.attachment.path.startsWith('http') || lowestVendor.attachment.path.startsWith('/')) ? validateURL(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${lowestVendor.attachment.path.split(/[\\\/]uploads/i).pop()?.replace(/^[\\\/]/, '') ? 'uploads/' + lowestVendor.attachment.path.split(/[\\\/]uploads/i).pop()?.replace(/^[\\\/]/, '').replace(/\\/g, '/') : lowestVendor.attachment.path}`) : '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-4 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all group"
                                    >
                                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 truncate">
                                          {lowestVendor.attachment.originalName || "Vendor Quote Document"}
                                        </p>
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                                          Click to view & verify
                                        </p>
                                      </div>
                                      <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Assigned Employee Info */}
                      {(selectedProject as any).purchaseDetails?.assignedEmployee && (
                        <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-200">
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <User className="w-3 h-3" />
                            Assigned Finance Employee
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-amber-600 font-medium mb-1">Employee Name</p>
                              <p className="text-sm font-black text-amber-900">{(selectedProject as any).purchaseDetails.assignedEmployee.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-amber-600 font-medium mb-1">Unique ID</p>
                              <p className="text-sm font-black text-amber-900 font-mono">{(selectedProject as any).purchaseDetails.assignedEmployee.uniqueId}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6 mt-10 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Package className="w-5 h-5" />
                        </div>
                        Logistics Tracker
                      </h4>

                      <div className="relative px-4">
                        {/* Progress Line */}
                        <div className="absolute left-[2.35rem] top-4 bottom-4 w-1 bg-slate-100 rounded-full" />

                        <div className="space-y-12 relative">
                          {[
                            { step: 'Order Placing', icon: <Package />, color: 'indigo', desc: 'Financial Manager initiated request' },
                            { step: 'Going to send', icon: <Send />, color: 'blue', desc: 'Employee verified and bill generated' },
                            { step: 'Delivered', icon: <CheckCircle />, color: 'emerald', desc: 'Product handed over to Service Manager' }
                          ].map((item, idx) => {
                            const currentStatus = (selectedProject as any).purchaseDetails?.status;
                            const statusIndex = ['Order Placing', 'Going to send', 'Delivered'].indexOf(currentStatus);
                            const isCompleted = idx <= statusIndex;
                            const isCurrent = idx === statusIndex;

                            return (
                              <div key={item.step} className="flex items-start gap-8 relative group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 transition-all duration-700 transform ${isCompleted
                                  ? `bg-${item.color}-600 text-white shadow-2xl shadow-${item.color}-200 rotate-0 scale-110`
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

                      {(selectedProject as any).purchaseDetails?.billForm?.generated && (
                        <div className="mt-12 pt-10 border-t border-slate-100">
                          <div className="bg-slate-50/80 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Identification</p>
                              <p className="text-xl font-black text-slate-900 tracking-tight">{(selectedProject as any).purchaseDetails.billForm.billNumber}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {new Date((selectedProject as any).purchaseDetails.billForm.generatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refund / Remaining</p>
                              <div className="flex items-center gap-3">
                                <p className="text-2xl font-black text-emerald-600 tracking-tighter">
                                  ${(selectedProject as any).purchaseDetails.billForm.remainingAmount.toLocaleString()}
                                </p>
                                <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded uppercase">Returned</div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Settled by Financial Employee</p>
                            </div>

                            {/* Quantity & Verification Info */}
                            {((selectedProject as any).purchaseDetails.billForm.receivedQuantity || (selectedProject as any).purchaseDetails.billForm.verified !== undefined) && (
                              <>
                                {(selectedProject as any).purchaseDetails.billForm.receivedQuantity && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Quantity</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">{(selectedProject as any).purchaseDetails.billForm.receivedQuantity}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Quality Verified</p>
                                  </div>
                                )}
                                {(selectedProject as any).purchaseDetails.billForm.verified !== undefined && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Status</p>
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm ${(selectedProject as any).purchaseDetails.billForm.verified
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                      }`}>
                                      {(selectedProject as any).purchaseDetails.billForm.verified ? (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Verified
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-4 h-4" />
                                          Pending Verification
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Bill Document/Image */}
                            {(selectedProject as any).purchaseDetails.billForm.billImage && (
                              <div className="col-span-full space-y-3 pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <FileText className="w-3 h-3" />
                                  Employee Submitted Bill Receipt
                                </p>
                                <a
                                  href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/${(selectedProject as any).purchaseDetails.billForm.billImage.split(/[\\/]uploads/i).pop()?.replace(/^[\\/]/, '') ? 'uploads/' + (selectedProject as any).purchaseDetails.billForm.billImage.split(/[\\/]uploads/i).pop()?.replace(/^[\\/]/, '').replace(/\\/g, '/') : (selectedProject as any).purchaseDetails.billForm.billImage}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-4 bg-white border-2 border-indigo-100 rounded-2xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                                >
                                  <span className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                      <Paperclip className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-black">View Receipt Document</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click to open in new tab</p>
                                    </div>
                                  </span>
                                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Registry Data */}
                <div className="space-y-10">

                  {/* Client Profile */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Client Profile
                    </h4>
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-lg font-black text-slate-900 tracking-tight">{selectedProject.userId?.name || 'Unknown User'}</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">{selectedProject.userId?.email || 'N/A'}</p>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global UID</span>
                        <span className="text-[10px] font-mono text-slate-400">{selectedProject.userId?.uniqueId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>


                  {/* Subscribed Services */}
                  {selectedProject.formData?.services && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Project Scope</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(selectedProject.formData.services) ? selectedProject.formData.services : [selectedProject.formData.services]).map((service: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Global Actions */}
              <div className="flex justify-end items-center gap-4 pt-10 border-t border-slate-100">
                {selectedProject.financialReview?.status === 'Pending' && (
                  <button
                    onClick={() => {
                      closeModal();
                      setTimeout(() => openReviewModal(selectedProject), 100);
                    }}
                    className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Proceed to Review
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </ModalWrapper>
        )
      }
    </div >
  );
}

const Spinner = () => (
  <div className="flex items-center justify-center space-x-2 animate-pulse">
    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
  </div>
);