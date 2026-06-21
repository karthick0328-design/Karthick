'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Clock,
    CheckCircle2,
    Briefcase,
    Beaker,
    Dna,
    Microscope,
    FlaskConical,
    Binary,
    Atom,
    ArrowRight,
    TrendingUp,
    Inbox
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const services = [
    { id: 'drug-discovery', name: 'Drug Discovery', icon: FlaskConical, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'biochemistry', name: 'Biochemistry', icon: Beaker, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'microbiology', name: 'Microbiology', icon: Microscope, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'molecular-biology', name: 'Molecular Biology', icon: Atom, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'ngs', name: 'NGS', icon: Dna, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'software-development', name: 'Software Development', icon: Binary, color: 'text-cyan-500', bg: 'bg-cyan-50' },
];

export default function EmployeeMainDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                // If user is an employee and has a service/seniority assigned, redirect to their specific dash
                // Exception for Finance Department
                if (user.role === 'employee') {
                    const dept = (user.department || '').toLowerCase();
                    const srv = (user.service || '').toLowerCase();

                    if (dept.includes('finance') || dept.includes('financial') || srv.includes('finance') || srv.includes('financial')) {
                        router.push('/employee-dashboard/finance');
                        return;
                    }

                    if (user.service && user.seniority) {
                        const serviceSlug = user.service.toLowerCase().replace(/\s+/g, '-');
                        const senioritySlug = user.seniority.toLowerCase();
                        router.push(`/employee-dashboard/service/${serviceSlug}/seniority/${senioritySlug}`);
                        return;
                    }
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        setIsLoading(false);
    }, [router]);

    const [stats, setStats] = React.useState({
        active: 0,
        pending: 0,
        completedToday: 0,
        total: 0
    });

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/projects/employee/assigned-projects`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.success) {
                    const projects = data.data;
                    const active = projects.filter((p: any) => p.status === 'In Progress').length;
                    const pending = projects.filter((p: any) => ['Under Review', 'On Hold', 'Assigned'].includes(p.status)).length;
                    const completedToday = projects.filter((p: any) =>
                        p.status === 'Completed' &&
                        new Date(p.updatedAt).toDateString() === new Date().toDateString()
                    ).length;
                    setStats({ active, pending, completedToday, total: projects.length });
                }
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            }
        };

        if (!isLoading) {
            fetchStats();
        }
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-900/10">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Welcome to Your Workspace</h1>
                        <p className="text-blue-100 max-w-xl">
                            Access your assigned projects and collaborate with your team across all BioLab services.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            href="/employee-dashboard/projects"
                            className="px-6 py-3 bg-white text-blue-600 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-bold"
                        >
                            My Projects
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Projects', value: stats.active.toString().padStart(2, '0'), icon: Briefcase, color: 'blue' },
                    { label: 'Tasks Pending', value: stats.pending.toString().padStart(2, '0'), icon: Clock, color: 'emerald' }, // Changed to emerald to match "Start Task"
                    { label: 'Completed Today', value: stats.completedToday.toString().padStart(2, '0'), icon: CheckCircle2, color: 'indigo' },
                    { label: 'Total Assigned', value: stats.total.toString().padStart(2, '0'), icon: Activity, color: 'slate' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4`}>
                            <stat.icon size={24} className={`text-${stat.color}-600`} />
                        </div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Services Grid */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Service Portals</h2>
                    <p className="text-sm text-gray-500 font-medium">Select a department to view specific tasks</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, i) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link
                                href={`/employee-dashboard/service/${service.id}/seniority/junior`}
                                className="group block bg-white border border-gray-100 p-6 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/5 transition-all relative overflow-hidden"
                            >
                                <div className={`w-12 h-12 rounded-xl ${service.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                                    <service.icon size={24} className={service.color} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 font-medium">View operations and project timeline</p>
                                <div className="flex items-center gap-1 text-sm font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Enter Dashboard <ArrowRight size={14} />
                                </div>

                                {/* Decorative background icon */}
                                <service.icon size={80} className={`absolute -right-4 -bottom-4 ${service.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>
        </div>
    );
}
