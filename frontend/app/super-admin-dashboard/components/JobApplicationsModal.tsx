'use client';

import React from 'react';
import { X, User, ExternalLink, Mail, Clock, CheckCircle, AlertCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { validateURL } from '@/lib/validation';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };
import axios from 'axios';

interface JobApplicationsModalProps {
  job: any;
  onClose: () => void;
}

export default function JobApplicationsModal({ job, onClose }: JobApplicationsModalProps) {
  const [applications, setApplications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/job-applications?jobId=${job._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setApplications(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (job?._id) fetchApplications();
  }, [job?._id]);

  const handleStatusUpdate = async (appId: string, status: string) => {
    try {
      setUpdatingId(appId);
      const token = localStorage.getItem('token');
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/job-applications/${appId}/status`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accept': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Reject': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Waiting List': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-4xl rounded-[48px] shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-10 pb-6 flex items-center justify-between shrink-0 border-b border-slate-50">
          <div>
            <div className="flex items-center gap-3">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{job?.jobTitle || job?.title}</h3>
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase italic">Vetting Dashboard</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Application Pipeline Management</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Retrieving Resumes from Encryption Vault...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                 <Search className="text-slate-200" size={32} />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase italic">No applications detected for this vacancy.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => (
                <div key={app._id} className="group p-6 rounded-[32px] bg-slate-50/50 hover:bg-white border border-transparent hover:border-indigo-100 transition-all shadow-sm hover:shadow-xl flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-950 text-white flex items-center justify-center shadow-lg group-hover:-rotate-3 transition-transform">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase italic leading-tight">{app.candidateName}</h4>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{app.candidateEmail}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase flex items-center gap-1">
                          <Clock size={10} /> {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a 
                      href={DOMPurify.sanitize(validateURL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${app.resumeUrl.replace(/[^\w\-./]/g, '')}`))} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm flex items-center gap-2 group/btn"
                    >
                      <ExternalLink size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 w-0 group-hover/btn:w-auto transition-all underline">View Resume</span>
                    </a>
                    
                    <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                    
                    <div className="flex gap-2">
                      <button 
                        disabled={updatingId === app._id}
                        onClick={() => handleStatusUpdate(app._id, 'Accept')}
                        className={`p-3 rounded-xl transition-all flex items-center gap-2 ${app.status === 'Accept' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-50 shadow-sm'}`}
                      >
                         <CheckCircle size={16} />
                         {app.status === 'Accept' && <span className="text-[9px] font-black uppercase tracking-widest">Accepted</span>}
                      </button>
                      
                      <button 
                        disabled={updatingId === app._id}
                        onClick={() => handleStatusUpdate(app._id, 'Waiting List')}
                        className={`p-3 rounded-xl transition-all flex items-center gap-2 ${app.status === 'Waiting List' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border border-slate-100 text-amber-500 hover:bg-amber-50 shadow-sm'}`}
                      >
                         <AlertCircle size={16} />
                         {app.status === 'Waiting List' && <span className="text-[9px] font-black uppercase tracking-widest">Waitlisted</span>}
                      </button>

                      <button 
                        disabled={updatingId === app._id}
                        onClick={() => handleStatusUpdate(app._id, 'Reject')}
                        className={`p-3 rounded-xl transition-all flex items-center gap-2 ${app.status === 'Reject' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-white border border-slate-100 text-rose-600 hover:bg-rose-50 shadow-sm'}`}
                      >
                         <XCircle size={16} />
                         {app.status === 'Reject' && <span className="text-[9px] font-black uppercase tracking-widest">Rejected</span>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-8 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
           <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Mail size={16} className="text-indigo-600" /> Auto-Notify candidates on status update
           </div>
           <button onClick={onClose} className="px-8 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all italic">Synchronize Vetting Metadata</button>
        </div>
      </div>
    </div>
  );
}
