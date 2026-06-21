'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
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
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    status: 'open' | 'closed';
    experienceLevel: string;
    location?: string;
    applicationsCount?: number;
}

const RecruitmentPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'applications' | 'vacancies'>('applications');
    const [vacancies, setVacancies] = useState<Vacancy[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);

    useEffect(() => {
        const fetchRecruitmentData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/Login');
                    return;
                }

                const config = {
                    headers: { Authorization: `Bearer ${token}` }
                };

                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/recruitment`, config);

                if (res.data.success) {
                    setVacancies(res.data.data.vacancies);
                    setApplications(res.data.data.applications);
                }
            } catch (error) {
                console.error('Error fetching recruitment data:', error);
                toast.error('Failed to load recruitment data');
            } finally {
                setLoading(false);
            }
        };

        fetchRecruitmentData();
    }, [router]);

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

    const filteredApplications = applications.filter(app =>
        app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredVacancies = vacancies.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.department && v.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mx-auto">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Recruitment Portal</h1>
                        <p className="text-gray-600 mt-1">Manage job vacancies and candidate applications.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                            <Filter className="w-4 h-4" />
                            <span>Filter</span>
                        </button>
                        <Link
                            href="/manager-dashboard/department/hr/recruitment/create"
                            className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg hover:shadow-green-200">
                            <Plus className="w-4 h-4" />
                            <span>Post New Job</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats Modal Handled Above */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Jobs</p>
                            <p className="text-2xl font-bold text-gray-900">{vacancies.filter(v => v.status === 'open').length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Applications</p>
                            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Reviews</p>
                            <p className="text-2xl font-bold text-gray-900">{applications.filter(a => a.status === 'pending').length}</p>
                        </div>
                    </div>
                </div>

                {/* Search and Tabs */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 sticky top-20 z-10">
                    <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search candidates, roles, or departments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>

                        <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-200 self-start">
                            <button
                                onClick={() => setActiveTab('applications')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'applications'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Applications
                            </button>
                            <button
                                onClick={() => setActiveTab('vacancies')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vacancies'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Vacancies
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table / Grid Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {activeTab === 'applications' ? (
                        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                                    <tr className="border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Candidate</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Applied Role</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Score</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Applied Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredApplications.length > 0 ? (
                                        filteredApplications.map((app) => (
                                            <tr key={app.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                                                            {app.candidateName.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-gray-900">{app.candidateName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-700 font-medium">{app.role}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(app.status)}`}>
                                                        {app.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-sm font-bold ${app.score >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                                                            {app.score}%
                                                        </span>
                                                        <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${app.score >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${app.score}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {new Date(app.appliedDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 hover:bg-white rounded-lg transition-all group-hover:shadow-md border border-transparent hover:border-gray-200">
                                                        <MoreVertical className="w-5 h-5 text-gray-400" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center text-gray-400">
                                                    <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-lg">No applications found matching your criteria.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                            {filteredVacancies.length > 0 ? (
                                filteredVacancies.map((vacancy) => (
                                    <div key={vacancy._id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-150 ${vacancy.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-xl ${vacancy.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getStatusStyle(vacancy.status)}`}>
                                                {vacancy.status}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{vacancy.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{vacancy.department || 'No Department Listed'}</p>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Filter className="w-3 h-3" />
                                                <span>{vacancy.experienceLevel}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Users className="w-3 h-3" />
                                                <span>0 Applications</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <Link href={`/manager-dashboard/department/hr/recruitment/${vacancy._id}`} className="text-sm font-bold text-green-600 hover:text-green-700 flex items-center">
                                                View Details
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Link>
                                            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center flex flex-col items-center text-gray-400">
                                    <Briefcase className="w-16 h-16 mb-4 opacity-10" />
                                    <p className="text-xl">No job vacancies available at the moment.</p>
                                    <button className="mt-4 text-green-600 font-bold hover:underline">Post your first job</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecruitmentPage;
