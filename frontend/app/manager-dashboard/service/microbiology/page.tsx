'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    User,
    Calendar,
    ChevronRight,
    Activity,
    Microscope,
    Beaker,
    Bug,
    Eye
} from 'lucide-react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';


export default function MicrobiologyDashboard() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'pending') setStatusFilter('Under Review');
        else if (tab === 'active') setStatusFilter('In Progress');
        else if (tab === 'completed') setStatusFilter('Completed');
        else if (tab === 'messages') setStatusFilter('Messages');
    }, [searchParams]);

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
            console.error('Error fetching projects:', error);
            toast.error('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Under Review': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'On Hold': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch =
            project.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All'
            ? true
            : statusFilter === 'Messages'
                ? (project.messages && project.messages.length > 0)
                : project.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: projects.length,
        inProgress: projects.filter(p => p.status === 'In Progress').length,
        underReview: projects.filter(p => p.status === 'Under Review').length,
        completed: projects.filter(p => p.status === 'Completed').length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Toaster position="top-right" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Microscope className="w-8 h-8 text-indigo-600" />
                        Microbiology Dashboard
                    </h1>
                    <p className="text-slate-500 mt-1">Culture analysis and ID projects</p>
                </div>

            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <LayoutDashboard className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-slate-600">Total Projects</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 font-medium">+10%</span> from last month
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Bug className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-slate-600">Culturing</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.inProgress}</div>
                        <div className="text-xs text-slate-500 mt-1">Samples incubating</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Eye className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-slate-600">Pending Review</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.underReview}</div>
                        <div className="text-xs text-slate-500 mt-1">Validation required</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-slate-600">Completed</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.completed}</div>
                        <div className="text-xs text-slate-500 mt-1">Reports issued</div>
                    </div>
                </div>
            </div>

            {/* Projects List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-h-[800px] overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-900">Active Microbiology Projects</h2>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-600"
                            >
                                <option value="All">All Status</option>
                                <option value="Under Review">Under Review</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Messages">Has Messages</option>
                            </select>
                            <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Lead</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Timeline</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProjects.length > 0 ? (
                                filteredProjects.map((project, idx) => (
                                    <tr key={project._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{project.uniqueId}</p>
                                                    <p className="text-xs text-slate-500">ID: {project._id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {project.userId?.name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{project.userId?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600 font-medium">{project.category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {project.teamLeadId ? (
                                                    <>
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                            {project.teamLeadId.name?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm text-slate-700">{project.teamLeadId.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-slate-500">Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                                                {project.submittedAt && (
                                                    <span className="text-indigo-600 font-medium mt-0.5">Submitted: {new Date(project.submittedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Link
                                                    href={`/manager-dashboard/service/microbiology/project/${project._id}`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <Search className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="font-medium">No projects found</p>
                                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
