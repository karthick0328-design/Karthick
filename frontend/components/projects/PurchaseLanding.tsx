'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Search, Package, ArrowLeft, ChevronRight, Plus, CheckCircle, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

export default function GenericPurchaseLanding({ serviceName, serviceLabel, basePath }: { serviceName: string, serviceLabel: string, basePath?: string }) {
    const router = useRouter();
    const effectiveBasePath = basePath || `/manager-dashboard/service/${serviceName}`;
    const [projects, setProjects] = useState<any[]>([]);
    const [submittedPurchases, setSubmittedPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'projects' | 'submitted'>('projects');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/Login/Signin');
                return;
            }

            // Fetch Project-related purchases (Assigned Projects)
            const projRes = await fetch(`${API_BASE}/projects/department/assigned-projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const projData = await projRes.json();

            // Fetch Standalone Purchase Requests (Submitted)
            const purchaseRes = await fetch(`${API_BASE}/purchase/my?service=${serviceName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const purchaseData = await purchaseRes.json();

            if (projData.success) setProjects(projData.data || []);
            if (purchaseData.success) setSubmittedPurchases(purchaseData.data || []);

        } catch (error) {
            toast.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(project =>
        project.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSubmitted = submittedPurchases.filter(p =>
        p.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.formData?.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 py-8 bg-slate-50/10 min-h-screen">
            <Toaster position="top-right" />
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-4">
                    <Link href={effectiveBasePath} className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all mb-2 group px-4 py-2 hover:bg-white rounded-xl active:scale-95 border border-transparent hover:border-slate-100">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Back to Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50">
                            <ShoppingCart className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">
                                {serviceLabel} Purchase
                            </h1>
                            <p className="text-slate-500 font-bold tracking-tight text-lg">Manage procurement cycles and project supplies</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all text-sm font-black shadow-sm placeholder:text-slate-300"
                        />
                    </div>
                    <Link
                        href={`${effectiveBasePath}/purchase/new`}
                        className="w-full sm:w-auto px-8 h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 group active:scale-95"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        Submit Request
                    </Link>
                </div>
            </div>

            {/* Premium Tabs */}
            <div className="flex items-center gap-3 p-2 bg-white rounded-3xl w-fit border border-slate-100 shadow-sm">
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`px-8 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    Project-Specific
                </button>
                <button
                    onClick={() => setActiveTab('submitted')}
                    className={`px-8 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'submitted' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    Sent Requests
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeTab === 'projects' ? (
                    filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <ProjectPurchaseCard key={project._id} project={project} basePath={effectiveBasePath} />
                        ))
                    ) : (
                        <EmptyState message="No projects found matching your search." />
                    )
                ) : (
                    filteredSubmitted.length > 0 ? (
                        filteredSubmitted.map((purchase) => (
                            <SubmittedPurchaseCard key={purchase._id} purchase={purchase} basePath={effectiveBasePath} />
                        ))
                    ) : (
                        <EmptyState message={`No standalone requests submitted for ${serviceLabel}.`} />
                    )
                )}
            </div>
        </div>
    );
}

function ProjectPurchaseCard({ project, basePath }: { project: any, basePath: string }) {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden group relative">
            <div className="p-9">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
                                {project.category}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{project.uniqueId}</h3>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${project.purchaseDetails?.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        project.purchaseDetails?.status ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                            'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        {project.purchaseDetails?.status || 'No Order'}
                    </div>
                </div>

                <div className="space-y-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-xl font-black text-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {project.userId?.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Client</p>
                            <p className="text-lg font-black text-slate-800 leading-tight tracking-tight">{project.userId?.name}</p>
                        </div>
                    </div>

                    {project.purchaseDetails?.productName ? (
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200/60 group-hover:border-indigo-200 group-hover:bg-indigo-50/30 transition-all duration-500">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Group</p>
                                    <p className="text-base font-black text-slate-700 truncate max-w-[150px]">{project.purchaseDetails.productName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Budget</p>
                                    <div className="flex items-center gap-1 justify-end">
                                        <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="text-lg font-black text-indigo-600">
                                            {project.purchaseDetails.amountSent?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full bg-indigo-500 ${project.purchaseDetails?.status === 'Delivered' ? 'w-full' : 'w-1/2 animate-shimmer'}`} />
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 bg-slate-50/30 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                            <ShoppingCart className="w-6 h-6 text-slate-300 mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Procurement</p>
                        </div>
                    )}
                </div>

                <Link
                    href={`${basePath}/project/${project._id}/purchase`}
                    className="w-full h-16 flex items-center justify-center gap-3 bg-slate-900 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 group/btn shadow-xl shadow-slate-200"
                >
                    <ShoppingCart className="w-4 h-4" />
                    {project.purchaseDetails ? 'Track Logistics' : 'Open Request'}
                    <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
            </div>
        </div>
    );
}

function SubmittedPurchaseCard({ purchase, basePath }: { purchase: any, basePath: string }) {
    const status = purchase.financialReview?.status || 'Pending';

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden group relative">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-9">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-200 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:rotate-6 transition-all duration-500 shadow-sm relative">
                            <Package className={`w-8 h-8 ${purchase.category === 'Purchase Order' ? 'text-indigo-600' : 'text-slate-600'} group-hover:text-white`} />
                            {purchase.category !== 'Purchase Order' && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" title="Project Linked" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                                    {purchase.uniqueId}
                                </span>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                    {purchase.category === 'Purchase Order' ? 'Standalone' : 'Project Linked'}
                                </p>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight max-w-[180px] line-clamp-2">
                                {purchase.formData?.projectTitle || purchase.formData?.productName || 'Purchase Request'}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-inner group-hover:bg-slate-50 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Gateway</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full border-2 border-white ${status === 'Approved' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' :
                                status === 'Rejected' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' :
                                    'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                                }`} />
                            <span className={`text-[13px] font-black tracking-tighter uppercase ${status === 'Approved' ? 'text-emerald-700' :
                                status === 'Rejected' ? 'text-red-700' :
                                    'text-amber-700'
                                }`}>{status}</span>
                        </div>
                    </div>
                    <div className="p-5 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl shadow-indigo-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Claim Amt</p>
                        <p className="text-lg font-black text-white tracking-tighter leading-none">
                            ${purchase.financialReview?.requestedAmount?.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-6 space-y-4 mb-8 shadow-inner">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</span>
                        <span className="text-xs font-black text-slate-800">{new Date(purchase.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc Reference</span>
                        <span className="text-xs font-black text-slate-800 tracking-tighter">{purchase.uniqueId}</span>
                    </div>
                    {purchase.financialReview?.vendors?.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bidding</span>
                            <div className="flex -space-x-2">
                                {[...Array(Math.min(3, purchase.financialReview.vendors.length))].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400 shadow-sm">V{i + 1}</div>
                                ))}
                                {purchase.financialReview.vendors.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-sm">+{purchase.financialReview.vendors.length - 3}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Link
                        href={`${basePath}/project/${purchase._id}/purchase`}
                        className="flex-1 h-14 bg-white text-slate-900 rounded-2xl border-2 border-slate-100 font-black text-[11px] uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all active:scale-95 flex items-center justify-center"
                    >
                        Inspect
                    </Link>
                    {status === 'Approved' && (
                        <div className="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 active:scale-95">
                            <CheckCircle className="w-4 h-4" />
                            Ready
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="col-span-full py-32 bg-white rounded-[5rem] border-4 border-dashed border-slate-50 flex flex-col items-center justify-center text-center px-8 group">
            <div className="w-28 h-28 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-10 rotate-3 group-hover:rotate-0 transition-all duration-700 bg-gradient-to-tr from-slate-50 to-white shadow-inner">
                <ShoppingCart className="w-14 h-14 text-slate-200" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Inventory Empty</h3>
            <p className="text-slate-400 font-bold max-w-sm text-xl leading-relaxed">{message}</p>
        </div>
    );
}
