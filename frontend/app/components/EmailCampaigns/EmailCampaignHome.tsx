'use client';

import React, { useState, useEffect } from 'react';
import {
    Mail,
    Users,
    History,
    Send,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    RefreshCcw,
    LayoutPanelLeft,
    Monitor,
    Smartphone,
    FileText,
    Settings,
    Upload,
    Paperclip,
    X
} from 'lucide-react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };


// --- Types ---
interface Recipient {
    _id: string;
    name: string;
    email: string;
    category: string;
    status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
    role?: string;
    department?: string;
    service?: string;
}

interface Campaign {
    _id: string;
    subject: string;
    sender: { name: string; email: string };
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    status: 'completed' | 'partial' | 'failed' | 'running';
    createdAt: string;
}

interface SmtpProfile {
    _id: string;
    displayName: string;
    fromEmail: string;
    smtpHost: string;
    port: number;
    username: string;
    status: 'ACTIVE' | 'INACTIVE';
}

// --- Main Layout ---
export default function EmailCampaignHome() {
    const [activeTab, setActiveTab] = useState<'composer' | 'recipients' | 'history' | 'senders'>('composer');
    const [stats, setStats] = useState({ sent: 0, failed: 0, activeRecipients: 0 });
    const [loading, setLoading] = useState(false);

    // Fetch initial stats/data
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        // Simplified fetch for dashboard usage
    };

    const tabs = [
        { id: 'composer', label: 'Composer', icon: Mail },
        { id: 'recipients', label: 'Recipients List', icon: Users },
        { id: 'history', label: 'Campaign History', icon: History },
        { id: 'senders', label: 'Senders', icon: Settings },
    ];

    return (
        <>
            <Toaster position="top-right" />
            <div className="space-y-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
                            <Mail size={10} className="text-indigo-400" />
                            <span>Master Communication Analytics</span>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                                Email Communications
                                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                            </h2>
                            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Design and send professional updates to your global community members</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveTab('senders')}
                            className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <RefreshCcw size={14} className="text-indigo-600" /> Verify System
                        </button>
                        <button className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
                            <Send size={14} /> Ready to Send
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-xl'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    {activeTab === 'composer' && <ComposerTab />}
                    {activeTab === 'recipients' && <RecipientsTab />}
                    {activeTab === 'history' && <HistoryTab />}
                    {activeTab === 'senders' && <SendersTab />}
                </div>
            </div>
        </>
    );
}

// --- Tab Components ---

function ComposerTab() {
    const [subject, setSubject] = useState('Update from MBH Institute');
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [html, setHtml] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [availableRecipients, setAvailableRecipients] = useState<Recipient[]>([]);
    const [projectEmails, setProjectEmails] = useState<Recipient[]>([]); // New list
    const [viewList, setViewList] = useState<'manual' | 'project'>('manual');
    const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [smtpProfiles, setSmtpProfiles] = useState<SmtpProfile[]>([]);
    const [selectedSmtpId, setSelectedSmtpId] = useState<string>('default');

    useEffect(() => {
        // Fetch default template and contacts
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return console.warn("No token found");

            try {
                const results = await Promise.allSettled([
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/template/default`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/contacts`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/project-emails`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/smtp-profiles`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                // Map results safely
                if (results[0].status === 'fulfilled') setHtml(results[0].value.data.template);
                if (results[1].status === 'fulfilled') setAvailableRecipients(results[1].value.data.data);
                if (results[2].status === 'fulfilled') setProjectEmails(results[2].value.data.data);
                if (results[3].status === 'fulfilled') setSmtpProfiles(results[3].value.data.data);

                // Log any failures
                let hasError = false;
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        console.error(`Endpoint ${i} failed:`, res.reason.message);
                        hasError = true;
                    }
                });
                if (hasError) toast.error("Some data failed to load. Check console.");

            } catch (err: any) {
                console.error("Critical error in fetchData:", err.message);
                toast.error("Failed to initialize composer");
            }
        };
        fetchData();
    }, []);


    const toggleRecipient = (id: string) => {
        setSelectedRecipientIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const currentList = viewList === 'manual' ? availableRecipients : projectEmails;
    const filteredList = currentList.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSend = async () => {
        if (!subject || !html) return toast.error("Subject and content required.");

        // Find selected recipients from both lists
        const allPossible = [...availableRecipients, ...projectEmails];
        const recipients = allPossible.filter(r => selectedRecipientIds.includes(r._id));

        if (recipients.length === 0) return toast.error("Please select at least one recipient.");

        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('htmlTemplate', html);
            formData.append('recipientsJson', JSON.stringify(recipients));
            formData.append('smtpProfileId', selectedSmtpId);

            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/campaign`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success("Campaign initiated in background!");
        } catch (error) {
            toast.error("Failed to start campaign.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-20">
            {/* Editor Side */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm animate-in slide-in-from-left duration-500">
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Subject Line</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                            placeholder="Type subject..."
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Sender Account</label>
                        <select
                            value={selectedSmtpId}
                            onChange={(e) => setSelectedSmtpId(e.target.value)}
                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none appearance-none"
                        >
                            <option value="default">System Default (cag_team@ponnaiyacag.com)</option>
                            {smtpProfiles.map(p => (
                                <option key={p._id} value={p._id}>{p.displayName} ({p.fromEmail})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Email Content</label>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/30">
                            {/* Toolbar */}
                            <div className="flex gap-1 p-3 border-b border-slate-100 bg-white">
                                {['B', 'I', 'U', 'H1', 'H2', 'L', 'O', 'Q', '</>', '🔗', '🖼️', '🎥'].map(tool => (
                                    <button key={tool} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold text-xs">{tool}</button>
                                ))}
                            </div>
                            <textarea
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                className="w-full h-[400px] p-6 bg-transparent outline-none font-mono text-sm resize-none text-slate-600 scrollbar-hide"
                                placeholder="Write your HTML template here..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Attachments</label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed border-slate-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition-all group">
                                <Plus className="text-slate-300 group-hover:text-indigo-400 mb-1" />
                                <span className="text-[10px] font-bold text-slate-400">Add File</span>
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) setAttachments([...attachments, ...Array.from(e.target.files)]);
                                    }}
                                />
                            </label>
                            {attachments.map((file, i) => (
                                <div key={i} className="w-32 h-24 bg-slate-50 border border-slate-100 rounded-2xl p-3 relative flex flex-col justify-end">
                                    <button
                                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md text-rose-500 hover:scale-110 active:scale-95"
                                    >
                                        <X size={12} />
                                    </button>
                                    <FileText size={20} className="text-indigo-600 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="w-full py-5 rounded-[24px] bg-[#059669] text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSending ? (
                            <RefreshCcw size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                        Send to {selectedRecipientIds.length} Recipients
                    </button>

                    {/* Tiny Selection Helper */}
                    <div className="pt-6 border-t border-slate-50 space-y-6">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient Source</p>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewList('manual')}
                                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewList === 'manual' ? 'bg-white shadow-sm' : 'text-slate-400'}`}
                                >
                                    Manual
                                </button>
                                <button
                                    onClick={() => setViewList('project')}
                                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${viewList === 'project' ? 'bg-white shadow-sm' : 'text-slate-400'}`}
                                >
                                    Project Entire
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search email or name..."
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none font-bold text-[10px] focus:ring-0 outline-none"
                            />
                            <AlertCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>

                        <div className="max-h-[220px] overflow-y-auto pr-2 space-y-1 scrollbar-hide border-y border-slate-50 py-2">
                            {filteredList.map(rec => (
                                <div
                                    key={rec._id}
                                    onClick={() => toggleRecipient(rec._id)}
                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${selectedRecipientIds.includes(rec._id) ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${selectedRecipientIds.includes(rec._id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {rec.name[0]}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 leading-none mb-0.5">{rec.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 leading-none">{rec.email}</p>
                                        </div>
                                    </div>
                                    {selectedRecipientIds.includes(rec._id) && (
                                        <CheckCircle2 size={16} className="text-indigo-600" />
                                    )}
                                </div>
                            ))}
                            {filteredList.length === 0 && (
                                <div className="text-center py-6 text-slate-300 font-bold text-[10px] uppercase">No matching records</div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedRecipientIds([...new Set([...selectedRecipientIds, ...filteredList.map(r => r._id)])])}
                                className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-tight"
                            >
                                Select These ({filteredList.length})
                            </button>
                            <button
                                onClick={() => setSelectedRecipientIds([])}
                                className="px-3 py-2 bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-tight hover:bg-slate-50"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Side */}
            <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-xl">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'desktop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <Monitor size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <Smartphone size={18} />
                        </button>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</span>
                </div>

                <div className={`mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-slate-900 transition-all duration-500 ${viewMode === 'desktop' ? 'w-full h-[700px]' : 'w-[320px] h-[640px]'}`}>
                    <div className="h-full overflow-y-auto scrollbar-hide bg-[#f8f9fa] flex flex-col pt-8 px-8">
                        {/* Fake Browser Top */}
                        <div className="mb-4 text-[10px] text-slate-400 font-bold tracking-tight">
                            Sub: {subject}
                        </div>
                        <div
                            className="bg-white min-h-full rounded-t-3xl shadow-sm p-4 overflow-x-hidden"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html.replace(/\{\{name\}\}/g, 'John Doe').replace(/\{\{unsubscribe_link\}\}/g, '#')) }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function RecipientsTab() {
    const [contacts, setContacts] = useState<Recipient[]>([]);
    const [projectEmails, setProjectEmails] = useState<Recipient[]>([]);
    const [viewMode, setViewMode] = useState<'manual' | 'project'>('manual');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [newContact, setNewContact] = useState({ name: '', email: '', category: 'General' });

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem('token');
            const [contRes, projRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/contacts`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/project-emails`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setContacts(contRes.data.data);
            setProjectEmails(projRes.data.data);
        } catch (error) {
            toast.error("Failed to load contacts.");
        } finally {
            setLoading(false);
        }
    };

    const addContact = async () => {
        if (!newContact.email || !newContact.name) return toast.error("Name and email required.");
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/contacts`, newContact, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Contact added!");
            setNewContact({ name: '', email: '', category: 'General' }); // Reset form
            fetchContacts();
        } catch (error) {
            toast.error("Failed to add contact.");
        }
    };

    const deleteContact = async (id: string) => {
        if (!confirm("Delete contact?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/contacts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchContacts();
        } catch (error) {
            toast.error("Delete failed.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Selection Card */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#047857] text-white rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in duration-500">
                    <div className="flex items-center gap-4 mb-8">
                        <Users size={32} />
                        <h3 className="text-xl font-black">Selection</h3>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center mb-8 border border-white/10">
                        <span className="block text-5xl font-black mb-2">{viewMode === 'manual' ? contacts.length : projectEmails.length}</span>
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{viewMode === 'manual' ? 'Recipients Tracked' : 'Project Users'}</span>
                    </div>

                    <div className="flex bg-white/10 p-1 rounded-2xl mb-8">
                        <button
                            onClick={() => setViewMode('manual')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'manual' ? 'bg-white text-emerald-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => setViewMode('project')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'project' ? 'bg-white text-emerald-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
                        >
                            Project
                        </button>
                    </div>

                    <p className="text-sm text-white/80 font-medium leading-relaxed mb-8">
                        {viewMode === 'manual'
                            ? "Emails will be sent individually to each person in your custom contact list."
                            : "Emails will be sent to registered staff and users in the system directory."}
                    </p>

                    <button className="w-full py-4 bg-white text-emerald-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                        Back to Composer
                    </button>
                </div>

                {/* Quick Add Form */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom duration-500">
                    <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                        <Plus size={18} className="text-indigo-600" /> Quick Add
                    </h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter name"
                            className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                            value={newContact.name}
                            onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Enter email"
                            className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                            value={newContact.email}
                            onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                        />
                        <button
                            onClick={addContact}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Save to List
                        </button>
                    </div>
                </div>
            </div>

            {/* List Side */}
            <div className="lg:col-span-2 bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm animate-in slide-in-from-right duration-500">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" /> {viewMode === 'manual' ? 'Custom Contacts' : 'Project Directory'}
                    </h3>
                    <div className="flex gap-2">
                        {viewMode === 'manual' && (
                            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                                <Upload size={14} /> Import CSV
                            </button>
                        )}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-100 w-64"
                            />
                            <AlertCircle size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#F9FAFB]">
                            <tr>
                                <th className="px-8 py-4 text-left"><input type="checkbox" className="rounded-md" /></th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Information</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Department / Services</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Roles</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Scanning records...</td></tr>
                            ) : (viewMode === 'manual' ? contacts : projectEmails).filter(c =>
                                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.email.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No matching records</td></tr>
                            ) : (viewMode === 'manual' ? contacts : projectEmails).filter(c =>
                                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.email.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map((contact) => (
                                <tr key={contact._id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-4"><input type="checkbox" className="rounded-md" /></td>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-extrabold text-slate-900 text-xs">{contact.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 lowercase">{contact.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-[10px] uppercase">
                                                {contact.department || contact.service || (viewMode === 'project' ? 'No Dept/Service' : 'Custom')}
                                            </span>
                                            {(contact.department && contact.service) && (
                                                <span className="text-[9px] font-medium text-slate-400 capitalize">{contact.service}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tight">
                                            {contact.role || contact.category.replace('System (', '').replace(')', '')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-1.5 font-black text-[9px] text-[#22C55E] uppercase tracking-tighter">
                                            <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
                                            {contact.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        {viewMode === 'manual' && (
                                            <button
                                                onClick={() => deleteContact(contact._id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HistoryTab() {
    const [history, setHistory] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data.data);
        } catch (error) {
            toast.error("Failed to load history.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">Campaign Audit Log</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Track all outgoing communications and delivery metrics.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#F9FAFB]">
                        <tr>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject / Date</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipients</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Metrics</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Verifying historical data...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest">No previous campaigns</td></tr>
                        ) : history.map((cam) => (
                            <tr key={cam._id} className="hover:bg-slate-50/30 transition-all">
                                <td className="px-8 py-5">
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-slate-900 text-xs">{cam.subject}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(cam.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-600">{cam.sender?.name}</td>
                                <td className="px-8 py-5 font-black text-xs text-slate-900">{cam.recipientCount}</td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase">Sent: {cam.sentCount}</span>
                                            <span className="text-[10px] font-black text-rose-500 uppercase">Fail: {cam.failedCount}</span>
                                        </div>
                                        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(cam.sentCount / cam.recipientCount) * 100}%` }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cam.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        cam.status === 'running' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                            'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                        {cam.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SendersTab() {
    const [profiles, setProfiles] = useState<SmtpProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        fromEmail: '',
        smtpHost: '',
        port: 465,
        username: '',
        password: ''
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/smtp-profiles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfiles(res.data.data);
        } catch (error) {
            toast.error("Failed to load SMTP profiles.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/smtp-profiles`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("SMTP profile saved!");
            setShowModal(false);
            setFormData({ displayName: '', fromEmail: '', smtpHost: '', port: 465, username: '', password: '' });
            fetchProfiles();
        } catch (error) {
            toast.error("Failed to save SMTP profile.");
        }
    };

    const deleteProfile = async (id: string) => {
        if (!confirm("Delete this SMTP sender?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/email-campaign/smtp-profiles/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchProfiles();
        } catch (error) {
            toast.error("Delete failed.");
        }
    };

    return (
        <div className="space-y-10 py-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900">SMTP Senders</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage multiple email accounts for sending communications.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#059669] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:scale-105 transition-all"
                >
                    <Plus size={14} /> Add Sender Account
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* System Default (Static) */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-50 flex items-center justify-center mb-6">
                            <Mail size={24} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">System Default</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Specified in your server .env file</p>
                        <span className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Running</span>
                    </div>
                </div>

                {/* Dinamic Profiles */}
                {profiles.map((profile) => (
                    <div key={profile._id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative group animate-in zoom-in duration-300">
                        <button
                            onClick={() => deleteProfile(profile._id)}
                            className="absolute top-6 right-6 p-2 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                                <Mail size={24} className="text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-1">{profile.displayName}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{profile.fromEmail}</p>
                            <div className="flex gap-2">
                                <span className="px-4 py-1.5 bg-slate-50 text-slate-600 rounded-full text-[8px] font-black uppercase tracking-tight border border-slate-100">{profile.smtpHost}</span>
                                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-tight border border-emerald-100">Active</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Overlay */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Add SMTP Sender</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Science Dept"
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.displayName}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Email</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="dept@domain.com"
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.fromEmail}
                                        onChange={e => setFormData({ ...formData, fromEmail: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMTP Host</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="smtp.domain.com"
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.smtpHost}
                                        onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Port</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="465"
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={formData.port}
                                        onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Username / Email"
                                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password / App Password</label>
                                <input
                                    required
                                    type="password"
                                    placeholder="********"
                                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-[#059669] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                            >
                                Save SMTP Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
