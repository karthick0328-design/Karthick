'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
// Redundant imports removed (Header, SidebarUser)

const EditJobPage = () => {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // User context mocks
    const user = {
        name: 'Jane Smith',
        role: 'Manager',
        department: 'Human Resource'
    };

    const [jobForm, setJobForm] = useState({
        title: '',
        department: 'Human Resources',
        service: '',
        description: '',
        requirements: '',
        salaryRange: '',
        status: 'open'
    });

    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!id) return;
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/vacancies/${id}`, config);

                if (res.data.success) {
                    const data = res.data.data;
                    setJobForm({
                        title: data.title || '',
                        department: data.department || 'Human Resources',
                        service: data.service || '',
                        description: data.description || '',
                        requirements: Array.isArray(data.requirements) ? data.requirements.join(', ') : '',
                        salaryRange: data.salaryRange || '',
                        status: data.status || 'open'
                    });
                }
            } catch (error) {
                console.error('Error fetching job details:', error);
                toast.error('Failed to load job details');
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [id]);

    const handleUpdateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                ...jobForm,
                requirements: jobForm.requirements.split(',').map(r => r.trim()).filter(r => r !== '')
            };

            const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/vacancies/${id}`, payload, config);

            if (res.data.success) {
                toast.success('Job updated successfully');
                router.push(`/manager-dashboard/department/hr/recruitment/${id}`);
            }
        } catch (error) {
            console.error('Error updating job:', error);
            toast.error('Failed to update job');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">

            <main className="pt-20 p-6 max-w-4xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Vacancy
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Edit Job Vacancy</h1>
                            <p className="text-gray-500 mt-1">Update job listing details.</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${jobForm.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {jobForm.status}
                        </span>
                    </div>

                    <form onSubmit={handleUpdateJob} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                <input
                                    required
                                    type="text"
                                    value={jobForm.title}
                                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. Senior Bioinformatician"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                <select
                                    value={jobForm.department}
                                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
                                >
                                    <option value="">No Department</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Sales and Customer Services">Sales and Customer Services</option>
                                    <option value="Financial">Financial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Service (Optional)</label>
                                <select
                                    value={jobForm.service}
                                    onChange={(e) => setJobForm({ ...jobForm, service: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
                                >
                                    <option value="">Select Service (if applicable)</option>
                                    <option value="NGS">NGS</option>
                                    <option value="Drug Discovery">Drug Discovery</option>
                                    <option value="Software Development">Software Development</option>
                                    <option value="Microbiology">Microbiology</option>
                                    <option value="BioChemistry">BioChemistry</option>
                                    <option value="Molecular Biology">Molecular Biology</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={jobForm.status}
                                    onChange={(e) => setJobForm({ ...jobForm, status: e.target.value as 'open' | 'closed' })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
                                >
                                    <option value="open">Open</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                            <input
                                type="text"
                                value={jobForm.salaryRange}
                                onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. $70k - $90k"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                            <textarea
                                required
                                value={jobForm.description}
                                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-40 resize-none"
                                placeholder="Describe the role, responsibilities, and expectations..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Requirements (comma separated)</label>
                            <textarea
                                value={jobForm.requirements}
                                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                                placeholder="e.g. PhD in Biology, 3+ years experience, Python skills"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updating}
                                className="px-8 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all font-bold shadow-lg shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                            >
                                {updating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Update Job
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EditJobPage;
