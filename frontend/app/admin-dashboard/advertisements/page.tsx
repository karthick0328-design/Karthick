'use client';

import { useState, useEffect } from 'react';
import SidebarAdmin from '../../adminCompontent/sidebarAdmin';
import Header from '../../adminCompontent/Header';
import { Megaphone, Plus, Search, Filter, Trash2, Edit2, ExternalLink, Calendar, Briefcase, Info, Eye, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socket';
import { validateURL } from '@/lib/validation';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };

export default function AdminAnnouncements() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Announcement',
        showOnHomepage: true,
        status: 'Active',
        jobTitle: '',
        jobType: 'Full-Time',
        location: '',
        applicationDeadline: '',
    });
    const [image, setImage] = useState<File | null>(null);
    const [attachment, setAttachment] = useState<File | null>(null);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/announcements', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncements(data.data);
            }
        } catch (error) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();

        // Socket real-time updates
        const token = localStorage.getItem('token');
        if (token) {
            const socket = getSocket(token);
            socket.on('announcement_update', (data: { id: string, views?: number, applicationsCount?: number }) => {
                setAnnouncements((prev: any) => 
                    prev.map((item: any) => 
                        item._id === data.id 
                        ? { ...item, ...data } 
                        : item
                    )
                );
            });

            return () => {
                socket.off('announcement_update');
            };
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Publishing...');
        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, (formData as any)[key]));
            if (image) data.append('image', image);
            if (attachment) data.append('attachment', attachment);

            const res = await fetch('http://localhost:5000/api/announcements', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            const result = await res.json();
            if (result.success) {
                toast.success('Announcement published!', { id: toastId });
                setIsModalOpen(false);
                fetchAnnouncements();
                setFormData({
                    title: '',
                    description: '',
                    category: 'Announcement',
                    showOnHomepage: true,
                    status: 'Active',
                    jobTitle: '',
                    jobType: 'Full-Time',
                    location: '',
                    applicationDeadline: '',
                });
                setImage(null);
                setAttachment(null);
            } else {
                toast.error(result.message || 'Failed to publish', { id: toastId });
            }
        } catch (error) {
            toast.error('Server error', { id: toastId });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if ((await res.json()).success) {
                toast.success('Deleted successfully');
                fetchAnnouncements();
            }
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className={`transition-all duration-300 ease-in-out flex-1 ${sidebarOpen ? 'ml-72' : 'ml-24'}`}>
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Megaphone size={24} />
                                </div>
                                Announcements & Advertisements
                            </h1>
                            <p className="text-slate-500 mt-1 font-medium ml-14">Manage website homepage content and job openings</p>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                            <Plus size={20} /> Create New
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="bg-white h-64 rounded-3xl animate-pulse border border-slate-100"></div>
                            ))
                        ) : announcements.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                                <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="text-slate-500 font-bold">No announcements published yet.</p>
                            </div>
                        ) : (
                            announcements.map((item: any) => (
                                <div key={item._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                                    <div className="h-40 bg-slate-100 relative">
                                        {item.image ? (
                                            <img 
                                                src={DOMPurify.sanitize(validateURL(`http://localhost:5000/uploads/announcements/${item.image.replace(/[^\w\-./]/g, '')}`))} 
                                                className="w-full h-full object-contain bg-white" 
                                                alt="Announcement Banner" 
                                                onError={(e) => (e.currentTarget.src = '/images/placeholder_ad.png')}
                                            />
                                        ) : (
                                            <img src={
                                                item.category === 'Job Opening' ? '/images/job_opening.svg' :
                                                item.category === 'Advertisement' ? '/images/biology_ad.png' :
                                                '/images/event_announcement.png'
                                            } className="w-full h-full object-cover" alt="" />
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur shadow-sm ${
                                                item.category === 'Job Opening' ? 'text-emerald-600' :
                                                item.category === 'Advertisement' ? 'text-blue-600' : 'text-indigo-600'
                                            }`}>
                                                {item.category}
                                            </span>
                                        </div>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDelete(item._id)} className="p-2 bg-white/90 backdrop-blur rounded-lg text-rose-600 shadow-sm hover:bg-rose-50 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-black text-slate-800 text-lg mb-2 line-clamp-1">{item.title}</h3>
                                        <p className="text-slate-500 text-sm font-medium line-clamp-3 mb-4 flex-1">{item.description}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100/50">
                                                    <Eye size={14} className="text-blue-500" />
                                                    <span className="tabular-nums animate-pulse text-blue-600">{item.views || 0}</span>
                                                </div>
                                                {item.category === 'Job Opening' && (
                                                    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">
                                                        <UserCheck size={14} className="text-emerald-500" />
                                                        <span className="tabular-nums text-emerald-600">{item.applicationsCount || 0}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                                <Calendar size={12} />
                                                {new Date(item.publishDate || item.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800">New Publication</h2>
                                <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">Website Engagement Control</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <Search className="rotate-45 text-slate-400" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 transition-all" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 transition-all appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="Announcement">Announcement</option>
                                        <option value="Advertisement">Advertisement</option>
                                        <option value="Job Opening">Job Opening</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Show on Homepage</label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                                            <input type="radio" checked={formData.showOnHomepage} onChange={() => setFormData({...formData, showOnHomepage: true})} className="accent-indigo-600" /> Yes
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                                            <input type="radio" checked={!formData.showOnHomepage} onChange={() => setFormData({...formData, showOnHomepage: false})} className="accent-indigo-600" /> No
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {formData.category === 'Job Opening' && (
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                        <Briefcase size={18} />
                                        <span className="text-xs font-black uppercase tracking-widest">Recruitment Details</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="Job Title" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})}>
                                            <option value="Full-Time">Full-Time</option>
                                            <option value="Part-Time">Part-Time</option>
                                            <option value="Internship">Internship</option>
                                        </select>
                                        <input type="text" placeholder="Location" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                                        <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.applicationDeadline} onChange={e => setFormData({...formData, applicationDeadline: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all min-h-[120px]" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Banner Image</label>
                                    <input type="file" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" onChange={e => setImage(e.target.files?.[0] || null)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Supporting PDF</label>
                                    <input type="file" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100" onChange={e => setAttachment(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest text-sm">Publish Now</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-sm">Discard</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
