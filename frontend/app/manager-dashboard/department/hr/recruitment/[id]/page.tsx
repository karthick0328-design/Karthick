'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Briefcase,
    Search,
    Menu,
    MoreVertical,
    Filter,
    Plus,
    ArrowLeft,
    GraduationCap,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building,
    MapPin,
    DollarSign,
    FileText,
    Calendar,
    Edit,
    Trash
} from 'lucide-react';
// Redundant imports removed (Header, SidebarUser)

interface Application {
    id: string;
    candidateName: string;
    role: string;
    status: 'pending' | 'reviewed' | 'interview' | 'hired' | 'rejected';
    appliedDate: string;
    score: number;
}

interface Vacancy {
    _id: string;
    title: string;
    department: string;
    service?: string;
    description: string;
    requirements: string[];
    salaryRange: string;
    status: 'open' | 'closed';
    createdAt: string;
    applicationsCount?: number;
    postedBy: {
        _id: string;
        name: string;
    };
}

const VacancyDetailsPage = () => {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [vacancy, setVacancy] = useState<Vacancy | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);

    const user = {
        name: 'Jane Smith',
        role: 'Manager',
        department: 'Human Resource'
    };

    useEffect(() => {
        const fetchVacancyDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Fetch vacancy details
                const vacancyRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vacancies/${id}`, config);
                if (vacancyRes.data.success) {
                    setVacancy(vacancyRes.data.data);
                }

                // In a real app, we would fetch applications specific to this vacancy
                // For now, we simulate or fetch all and filter (if backend logic isn't specific yet)
                // Assuming we might not have a specific endpoint for applications of a vacancy yet,
                // we'll just use the general recruitment data or mock it for now.
                // Or better, simulate fetching:
                const appsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/recruitment`, config);
                if (appsRes.data.success) {
                    // Filter applications that match this role/vacancy if possible
                    // Since applications mock might not link to vacancy specificly, we can filter by role matching title
                    const allApps = appsRes.data.data.applications;
                    const relevantApps = allApps.filter((app: Application) =>
                        vacancyRes.data.data && app.role === vacancyRes.data.data.title
                    );
                    setApplications(relevantApps);
                }

            } catch (error) {
                console.error('Error fetching vacancy details:', error);
                toast.error('Failed to load vacancy details');
            } finally {
                setLoading(false);
            }
        };

        fetchVacancyDetails();
    }, [id]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open':
            case 'hired': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'interview':
            case 'reviewed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'rejected':
            case 'closed': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!vacancy) {
        return (
            <div className="flex items-center justify-center flex-col p-20">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Vacancy Not Found</h2>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">

            <main className="pt-20 p-6 max-w-7xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Recruitment
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content: Vacancy Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{vacancy.title}</h1>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        {vacancy.department && (
                                            <span className="flex items-center">
                                                <Building className="w-4 h-4 mr-1" />
                                                {vacancy.department}
                                            </span>
                                        )}
                                        {vacancy.service && (
                                            <span className="flex items-center">
                                                <Briefcase className="w-4 h-4 mr-1" />
                                                {vacancy.service}
                                            </span>
                                        )}
                                        <span className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            Posted {new Date(vacancy.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border ${getStatusStyle(vacancy.status)}`}>
                                    {vacancy.status}
                                </span>
                            </div>

                            <div className="border-t border-gray-100 pt-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-green-500" />
                                        Description
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {vacancy.description}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                                        Requirements
                                    </h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {vacancy.requirements.map((req, index) => (
                                            <li key={index} className="flex items-start text-gray-600">
                                                <span className="w-2 h-2 mt-2 mr-2 bg-green-500 rounded-full" />
                                                {req}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                                        Salary Range
                                    </h3>
                                    <p className="text-gray-900 font-medium bg-green-50 inline-block px-4 py-2 rounded-lg border border-green-100">
                                        {vacancy.salaryRange}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Applications Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">Applications</h3>
                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {applications.length}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Candidate</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {applications.length > 0 ? (
                                            applications.map((app) => (
                                                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                                {app.candidateName.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-gray-900">{app.candidateName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(app.status)}`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                                        {new Date(app.appliedDate).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                                    No applications yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Actions & Meta */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href={`/manager-dashboard/department/hr/recruitment/${id}/edit`}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-medium shadow-lg hover:shadow-green-200"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Job
                                </Link>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to close/delete this job vacancy?')) {
                                            try {
                                                const token = localStorage.getItem('token');
                                                const config = { headers: { Authorization: `Bearer ${token}` } };
                                                const res = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/vacancies/${id}`, config);
                                                if (res.data.success) {
                                                    toast.success('Job closed successfully');
                                                    router.push('/manager-dashboard/department/hr/recruitment');
                                                }
                                            } catch (err) {
                                                toast.error('Failed to close job');
                                            }
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
                                >
                                    <Trash className="w-4 h-4" />
                                    Close Job
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VacancyDetailsPage;
