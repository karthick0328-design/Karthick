'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Briefcase,
    Clock,
    CheckCircle2,
    Activity,
    Filter,
    Plus,
    ArrowRight,
    ClipboardList,
    AlertCircle,
    FileText,
    Calendar
} from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Project {
    _id: string;
    uniqueId: string;
    department: string;
    status: string;
    formData: {
        titleProject?: string;
        [key: string]: any;
    };
    createdAt: string;
}

export default function EmployeeProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projects/employee/assigned-projects');
            if (response.data.success) {
                setProjects(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.formData?.titleProject?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' ||
            (filter.toLowerCase() === 'assigned' && project.status.toLowerCase() === 'under review') ||
            project.status.toLowerCase() === filter.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'in progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'assigned': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
                    <p className="text-gray-500 font-medium">Manage and track your assigned scientific tasks</p>
                </div>
                <div className="flex gap-3">
                    {/* Add any global actions here */}
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by ID or compound name..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {['all', 'Assigned', 'In Progress', 'Completed', 'On Hold'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/10'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {loading ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                            <Activity className="animate-spin mb-4" size={32} />
                            <p className="font-medium">Loading your projects...</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <ClipboardList size={64} className="text-gray-200 mb-4" />
                            <p className="text-xl font-bold text-gray-900">No projects found</p>
                            <p className="text-gray-500 font-medium mt-1">Assignments will appear here when they are ready.</p>
                        </div>
                    ) : (
                        filteredProjects.map((project, i) => (
                            <motion.div
                                key={project._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link
                                    href={`/employee-dashboard/projects/${project._id}`}
                                    className="group block bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-blue-500 transition-all relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(project.status)}`}>
                                            {project.status}
                                        </span>
                                        <span className="text-xs font-mono text-gray-400">#{project.uniqueId}</span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {project.formData?.titleProject || 'Untitled Project'}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium mb-4">{project.department}</p>

                                    <div className="flex flex-col gap-1 pt-4 border-t border-gray-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                                                <Clock size={10} className="text-gray-300" />
                                                Created {new Date(project.createdAt).toLocaleDateString()}
                                            </span>
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                        {project.formData?.timeline && (
                                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                                                <Calendar size={10} className="text-rose-400" />
                                                Due {new Date(project.formData.timeline).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
