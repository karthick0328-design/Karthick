'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
// Redundant imports removed (Header, SidebarUser)

const PostJobPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // User context mocks - should be replaced with actual auth context
    const user = {
        name: 'Jane Smith',
        role: 'Manager',
        department: 'Human Resource'
    };

    const [jobForm, setJobForm] = useState({
        title: '',
        department: '', // Changed from default 'Human Resources' to empty
        service: '',
        description: '',
        requirements: '',
        salaryRange: ''
    });

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                ...jobForm,
                requirements: jobForm.requirements.split(',').map(r => r.trim())
            };

            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/vacancy`, payload, config);

            if (res.data.success) {
                toast.success('Job posted successfully');
                router.push('/manager-dashboard/department/hr/recruitment');
            }
        } catch (error) {
            console.error('Error creating job:', error);
            toast.error('Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">

            <main className="pt-20 p-6 max-w-4xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Recruitment
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                        <h1 className="text-2xl font-bold text-gray-900">Post New Job Vacancy</h1>
                        <p className="text-gray-500 mt-1">Create a new job listing to attract talent.</p>
                    </div>

                    <form onSubmit={handleCreateJob} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                <input
                                    required
                                    type="text"
                                    value={jobForm.title}
                                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
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
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
                            <input
                                type="text"
                                value={jobForm.salaryRange}
                                onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                                placeholder="e.g. $70k - $90k"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                            <textarea
                                required
                                value={jobForm.description}
                                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-40 resize-none placeholder-gray-400"
                                placeholder="Describe the role, responsibilities, and expectations..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Requirements (comma separated)</label>
                            <textarea
                                value={jobForm.requirements}
                                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-32 resize-none placeholder-gray-400"
                                placeholder="e.g. PhD in Biology, 3+ years experience, Python skills"
                            />
                            <p className="mt-2 text-xs text-gray-500 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Separate individual requirements with commas
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors font-medium border border-transparent hover:border-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all font-medium shadow-lg hover:shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Post Job
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

export default PostJobPage;
