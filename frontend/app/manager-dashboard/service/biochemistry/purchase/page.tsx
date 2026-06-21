'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart,
    Search,
    Filter,
    ChevronRight,
    Package,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

export default function BiochemistryPurchaseLanding() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/Login/Signin');
                return;
            }

            const response = await fetch(`${API_BASE}/projects/department/assigned-projects`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setProjects(data.data);
            } else {
                toast.error(data.message || 'Failed to fetch projects');
            }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 py-8">
            <Toaster position="top-right" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link href="/manager-dashboard/service/biochemistry" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 group">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="font-semibold text-sm">Back to Dashboard</span>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <ShoppingCart className="w-8 h-8" />
                        </div>
                        Purchase Management
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage project purchases and logistics</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by project ID or client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                        <div
                            key={project._id}
                            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden group border-b-4 border-b-indigo-500"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{project.category}</p>
                                        <h3 className="text-xl font-bold text-slate-900">{project.uniqueId}</h3>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {project.userId?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</p>
                                            <p className="text-sm font-bold text-slate-700">{project.userId?.name}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Purchase Status</span>
                                            <span className={`font-black ${project.purchaseDetails?.status ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {project.purchaseDetails?.status || 'NOT INITIATED'}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 transition-all duration-1000"
                                                style={{ width: project.purchaseDetails?.status ? '50%' : '5%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    href={`/manager-dashboard/service/biochemistry/project/${project._id}/purchase`}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all group/btn"
                                >
                                    Open Purchase Section
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                </Link>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">No projects found</h3>
                        <p className="text-slate-400 mt-2">No projects match your current search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
