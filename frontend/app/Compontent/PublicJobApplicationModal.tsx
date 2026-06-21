'use client';

import React from 'react';
import { X, Upload, Send, User, Mail, FileText, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface PublicJobApplicationModalProps {
  job: any;
  onClose: () => void;
}

export default function PublicJobApplicationModal({ job, onClose }: PublicJobApplicationModalProps) {
  const [formData, setFormData] = React.useState({
    candidateName: '',
    candidateEmail: '',
    notes: ''
  });
  const [resumeFile, setResumeFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) return alert('Please upload your resume');

    try {
      setLoading(true);
      const data = new FormData();
      data.append('jobId', job._id);
      data.append('candidateName', formData.candidateName);
      data.append('candidateEmail', formData.candidateEmail);
      data.append('notes', formData.notes);
      data.append('resume', resumeFile);

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/public/apply-job`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(onClose, 3000);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert(error.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div className="relative bg-white p-12 rounded-[48px] text-center max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-600 animate-bounce">
            <CheckCircle size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic">Application Transmitted!</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Our intelligence team will review your profile shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#611B9B] w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-10 pb-6 flex items-center justify-between border-b border-white/5">
          <div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Apply for <span className="text-[#FFD100]">{job.jobTitle || job.title}</span></h3>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1 italic">Candidate Entrance Portal</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={20} />
              <input 
                required
                type="text" 
                placeholder="FULL NAME"
                value={formData.candidateName}
                onChange={(e) => setFormData({...formData, candidateName: e.target.value})}
                className="w-full pl-14 pr-8 py-5 bg-white/5 border border-white/10 rounded-[28px] text-white font-black uppercase italic text-sm focus:ring-4 focus:ring-white/5 outline-none transition-all placeholder:text-white/20"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={20} />
              <input 
                required
                type="email" 
                placeholder="EMAIL ADDRESS"
                value={formData.candidateEmail}
                onChange={(e) => setFormData({...formData, candidateEmail: e.target.value})}
                className="w-full pl-14 pr-8 py-5 bg-white/5 border border-white/10 rounded-[28px] text-white font-black uppercase italic text-sm focus:ring-4 focus:ring-white/5 outline-none transition-all placeholder:text-white/20"
              />
            </div>

            <div className="relative">
               <FileText className="absolute left-6 top-6 text-white/30" size={20} />
               <textarea 
                placeholder="ANY ADDITIONAL NOTES OR COVER MESSAGE..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full pl-14 pr-8 py-5 bg-white/5 border border-white/10 rounded-[32px] text-white font-black uppercase italic text-sm focus:ring-4 focus:ring-white/5 outline-none transition-all placeholder:text-white/20 resize-none"
               />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4 italic">Upload Resume (PDF/DOCX)</label>
            <div className={`relative group cursor-pointer p-8 border-2 border-dashed rounded-[32px] transition-all flex flex-col items-center justify-center gap-4 ${resumeFile ? 'border-[#FFD100] bg-[#FFD100]/5' : 'border-white/10 hover:border-white/30 bg-white/5'}`}>
               <input 
                type="file" 
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
               />
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:-rotate-6 ${resumeFile ? 'bg-[#FFD100] text-[#611B9B]' : 'bg-white/10 text-white/40'}`}>
                 <Upload size={32} />
               </div>
               <div className="text-center">
                 <p className="text-sm font-black text-white uppercase italic">{resumeFile ? resumeFile.name : 'Drag or Click to Upload'}</p>
                 <p className="text-[9px] font-bold text-white/30 uppercase mt-1">Maximum file size: 10MB</p>
               </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-[#FFD100] text-[#611B9B] rounded-[32px] font-black uppercase italic tracking-widest text-lg shadow-2xl hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                Transmit Dossier
              </>
            )}
          </button>
        </form>

        {/* Footer Disclaimer */}
        <div className="p-6 text-center border-t border-white/5 bg-black/10">
           <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Biology Systems Recruitment Protocol v4.0.2 - AES-256 Encrypted Transfer</p>
        </div>
      </div>
    </div>
  );
}
