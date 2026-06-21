"use client"
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  Activity, Award, AlertTriangle, UserCheck,
  Search, Filter, Plus, FileText, CheckCircle,
  XCircle, Clock, BarChart2, Briefcase, Eye, ShieldAlert,
  ChevronDown, ChevronUp
} from 'lucide-react';
import api from '@/lib/api';

// No need for local API_URL constant when using the unified api utility

export default function PerformanceComplianceReporting() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('performance'); // 'dashboard', 'performance', 'complaints', 'raise'
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Filters
  const [deptFilter, setDeptFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal / Detail State
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Form State for creating complaint
  const [complaintForm, setComplaintForm] = useState({
    title: '',
    description: '',
    employeeId: '',
    category: 'Performance Issue',
  });
  const [submitting, setSubmitting] = useState(false);
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [resolutionMenuOpen, setResolutionMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser(decoded);

        // Admin or Head default to dashboard, others to performance
        if (['admin', 'head'].includes(decoded.role)) {
          setActiveTab('dashboard');
        }
      } catch (err) {
        console.error("Invalid token", err);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'dashboard' && ['admin', 'head'].includes(user.role)) fetchAnalytics();
      if (activeTab === 'performance') fetchPerformanceReports();
      if (activeTab === 'complaints') fetchComplaints();
      if (['performance', 'complaints', 'raise'].includes(activeTab) && members.length === 0) fetchMembers();
    }
  }, [user, activeTab, deptFilter, serviceFilter, members.length]);

  const fetchMembers = async () => {
    try {
      const resp = await api.get('members');
      if (resp.data.success) {
        setMembers(resp.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const resp = await api.get('complaints/analytics');
      setAnalytics(resp.data.analytics);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter) params.append('department', deptFilter);
      if (serviceFilter) params.append('service', serviceFilter);

      const resp = await api.get(`complaints/performance-reports?${params.toString()}`);
      setPerformanceReports(resp.data.reports);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch performance reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (deptFilter) params.append('department', deptFilter);
      if (serviceFilter) params.append('service', serviceFilter);

      const resp = await api.get(`complaints?${params.toString()}`);
      setComplaints(resp.data.complaints);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('complaints', complaintForm);
      alert('Complaint submitted successfully!');
      setComplaintForm({ title: '', description: '', employeeId: '', category: 'Performance Issue' });
      setActiveTab('complaints');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAction = async (complaintId: string, status: string, action?: string) => {
    try {
      const payload: any = { status };
      if (action) payload.adminAction = action;
      if (adminNotesInput) payload.adminNotes = adminNotesInput;

      await api.put(`complaints/${complaintId}/status`, payload);
      alert('Action taken successfully. Notifications sent to relevant parties.');
      setSelectedComplaint(null);
      setAdminNotesInput('');
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  // UI Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Good': return <span className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">Good</span>;
      case 'Average': return <span className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">Average</span>;
      case 'Needs Improvement': return <span className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-[#fff7ed] text-[#9a3412] border border-[#ffedd5] shadow-inner uppercase tracking-wider">Needs Improvement</span>;
      default: return <span className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-slate-50 text-slate-500 border border-slate-100 uppercase tracking-wider">{status}</span>;
    }
  };

  const getComplaintStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Reported': 'bg-red-100 text-red-700',
      'Under Review': 'bg-amber-100 text-amber-700',
      'Investigation': 'bg-blue-100 text-blue-700',
      'Action Taken': 'bg-emerald-100 text-emerald-700',
      'Closed': 'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
  };

  if (!user) return <div className="p-8 text-center text-slate-500">Loading Access Profile...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header - Matching Image 1 */}
      <div className="space-y-2">
        <h1 className="text-[42px] font-black text-[#1e293b] tracking-tight leading-loose"> Performance & Compliance </h1>
        <p className="text-[#64748b] text-lg font-medium max-w-3xl">Monitor worker progression, detect underperformance, and enforce compliance workflows.</p>
      </div>

      {/* Navigation Tabs - Refined for Image 1 Look */}
      <div className="flex items-center space-x-6 border-b border-slate-100 pb-1">
        {['admin', 'head'].includes(user.role) && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-4 font-bold text-sm tracking-wide transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <BarChart2 size={18} /> Compliance Analytics
          </button>
        )}
        <button
          onClick={() => setActiveTab('performance')}
          className={`group flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-[13px] tracking-wide transition-all shadow-sm ${activeTab === 'performance' ? 'bg-[#6366f1] text-white shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Award size={18} /> Performance Reports
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'complaints' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ShieldAlert size={18} className="opacity-50" /> Complaint Logs
        </button>
        {['head', 'manager', 'tl'].includes(user.role) && (
          <button
            onClick={() => setActiveTab('raise')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all text-[#ef4444] border border-[#fee2e2] hover:bg-rose-50"
          >
            <Plus size={20} /> Raise Complaint
          </button>
        )}
      </div>

      {/* Filters Base - Exact Image 1 Styling */}
      {['performance', 'complaints'].includes(activeTab) && (
        <div className="flex flex-wrap gap-10 bg-white p-8 rounded-[1.5rem] border border-[#f1f5f9] shadow-sm">
          <div className="flex-1 min-w-[300px] space-y-4">
            <label className="text-[11px] font-black text-[#64748b] uppercase tracking-[0.2em] block">department</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 text-sm font-bold text-[#1e293b] focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none">
              <option value="">All Departments</option>
              {[
                'Sales & Customer Services', 
                'Human Resources', 
                'Financial',
                ...members.map(m => m.department).filter(d => d && !['Sales & Customer Services', 'Human Resources', 'Financial'].includes(d))
              ].filter((v, i, a) => v && a.indexOf(v) === i).sort().map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[300px] space-y-4">
            <label className="text-[11px] font-black text-[#64748b] uppercase tracking-[0.2em] block">service group</label>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 text-sm font-bold text-[#1e293b] focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none">
              <option value="">All Services</option>
              {[
                'NGS', 
                'Drug Discovery', 
                'Software Development', 
                'Microbiology', 
                'Biochemistry', 
                'Molecular Biology',
                ...members.map(m => m.service).filter(s => s && !['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'Biochemistry', 'Molecular Biology'].includes(s))
              ].filter((v, i, a) => v && a.indexOf(v) === i).sort().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Content Areas */}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && analytics && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-300 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-500">Total Complaints</p>
                <h3 className="text-3xl font-black text-slate-800 mt-2">{analytics.totalComplaints}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-amber-300 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-500">Under Review</p>
                <h3 className="text-3xl font-black text-slate-800 mt-2">{analytics.underReview}</h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-emerald-300 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-500">Resolved</p>
                <h3 className="text-3xl font-black text-slate-800 mt-2">{analytics.resolved}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle size={24} />
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-2xl shadow-sm flex items-center justify-between group border border-rose-100">
              <div>
                <p className="text-sm font-bold text-rose-600">Needs Improvement (Est)</p>
                <h3 className="text-3xl font-black text-rose-900 mt-2">
                  {analytics.totalComplaints - analytics.resolved}
                </h3>
              </div>
              <div className="w-12 h-12 bg-rose-200/50 rounded-xl flex items-center justify-center text-rose-700">
                <AlertTriangle size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Complaints by Department</h3>
              <ul className="space-y-4">
                {analytics.byDepartment?.map((d: any) => (
                  <li key={d._id || 'Unknown'} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{d._id || 'Unassigned'}</span>
                    <span className="text-sm font-bold bg-slate-100 px-3 py-1 rounded-md text-slate-700">{d.count}</span>
                  </li>
                ))}
                {(!analytics.byDepartment || analytics.byDepartment.length === 0) && <li className="text-sm text-slate-400">No data available</li>}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Complaints by Category</h3>
              <ul className="space-y-4">
                {analytics.byCategory?.map((c: any) => (
                  <li key={c._id || 'Unknown'} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{c._id || 'Other'}</span>
                    <span className="text-sm font-bold bg-slate-100 px-3 py-1 rounded-md text-slate-700">{c.count}</span>
                  </li>
                ))}
                {(!analytics.byCategory || analytics.byCategory.length === 0) && <li className="text-sm text-slate-400">No data available</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-[2rem] border border-[#f1f5f9] shadow-xl shadow-slate-200/20 overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc]/50 border-b border-slate-100">
                  <th className="px-10 py-6 text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em]">employee</th>
                  <th className="px-10 py-6 text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em]">role & dept</th>
                  <th className="px-10 py-6 text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em]">task const.</th>
                  <th className="px-10 py-6 text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em]">attendance %</th>
                  <th className="px-10 py-6 text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em]">status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-10 py-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">Analyzing Performance Data...</td></tr>
                ) : performanceReports.length === 0 ? (
                  <tr><td colSpan={5} className="px-10 py-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">No records found.</td></tr>
                ) : (
                  performanceReports.map((report) => (
                    <tr key={report._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                      <td className="px-10 py-7">
                        <div className="font-extrabold text-[#1e293b] text-[15px]">{report.name}</div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="text-[13px] font-bold text-[#475569] capitalize">{report.role}</div>
                        <div className="text-[11px] text-[#94a3b8] font-bold mt-0.5">{report.department || 'N/A'} {report.service ? `• ${report.service}` : ''}</div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col gap-2">
                          <div className="w-full bg-[#f1f5f9] rounded-full h-2.5 max-w-[140px]">
                            <div className="h-2.5 rounded-full bg-[#cbd5e1]" style={{ width: `${report.taskCompletion}%` }}></div>
                          </div>
                          <span className="text-xs font-black text-[#475569]">{report.taskCompletion}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-sm font-black text-[#1e293b]">
                        {report.attendance}%
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex flex-col items-start gap-2">
                           {getStatusBadge(report.status)}
                           {report.activeComplaints > 0 && (
                             <div className="px-2 py-0.5 bg-rose-50 text-[10px] font-black text-rose-500 rounded-md border border-rose-100 flex items-center gap-1.5 uppercase tracking-wider">
                               <ShieldAlert size={10} /> {report.activeComplaints} Report(s)
                             </div>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complaints Logs Tab */}
      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {loading ? (
            <div className="col-span-full p-8 text-center text-slate-500">Loading Complaint Logs...</div>
          ) : complaints.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">No complaints filed.</div>
          ) : (
            complaints.map(comp => (
              <div
                key={comp._id}
                onClick={() => setSelectedComplaint(comp)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">{comp.category}</span>
                    <h4 className="font-bold text-slate-900 mt-1">{comp.title}</h4>
                  </div>
                  {getComplaintStatusBadge(comp.status)}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{comp.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-indigo-500">
                        <UserCheck size={10} />
                      </div>
                      Against: {comp.employeeId?.name || 'Unknown'}
                    </div>
                    {comp.reportedBy && (
                      <div className="text-[10px] text-slate-400 font-medium pl-7">
                        Reported by: {comp.reportedBy.name} 
                        {(comp.reportedByService || comp.reportedBy.service || comp.service) && (
                          <span className="text-indigo-400 ml-1 font-bold">
                            ({comp.reportedByService || comp.reportedBy.service || comp.service})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{new Date(comp.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Raise Complaint Tab */}
      {activeTab === 'raise' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-rose-50/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Raise Performance Complaint</h2>
              <p className="text-sm text-slate-500">Submit a formal complaint for non-compliance or underperformance.</p>
            </div>
          </div>

          <form onSubmit={handleRaiseComplaint} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Target Employee / Manager*</label>
              <select
                required
                value={complaintForm.employeeId}
                onChange={e => setComplaintForm({ ...complaintForm, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="">Select User to Report...</option>
                {members
                  .filter(m => m._id !== user.id && m.role !== 'admin') // Can't report yourself or admin
                  .filter(m => {
                    if (user.role === 'head') return ['manager', 'tl', 'employee'].includes(m.role);
                    if (user.role === 'manager') return ['tl', 'employee'].includes(m.role);
                    if (user.role === 'tl') return m.role === 'employee';
                    return false;
                  })
                  .map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.role.toUpperCase()}) - {m.department}
                    </option>
                  ))
                }
              </select>
              <p className="text-xs text-slate-400 mt-1">Select the individual you are filing this report against. Only reportable roles are shown.</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">Complaint Title*</label>
                <input
                  required
                  type="text"
                  placeholder="E.g., Repeated late attendance"
                  value={complaintForm.title}
                  onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-1">Category*</label>
                <select
                  value={complaintForm.category}
                  onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Performance Issue">Performance Issue</option>
                  <option value="Attendance Issue">Attendance Issue</option>
                  <option value="Behavior Issue">Behavior Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description of Issue*</label>
              <textarea
                required
                rows={5}
                placeholder="Provide detailed information regarding the non-compliance..."
                value={complaintForm.description}
                onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {submitting ? 'Filing Complaint...' : 'File Official Complaint'}
            </button>
          </form>
        </div>
      )}

      {/* Complaint Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedComplaint.title}</h3>
                  {getComplaintStatusBadge(selectedComplaint.status)}
                </div>
                <p className="text-sm font-medium text-slate-500 mt-1">Ref: {selectedComplaint._id.substring(0, 8).toUpperCase()} • Filed on {new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-6 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Target Individual</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.employeeId?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-600 capitalize">{selectedComplaint.employeeId?.role || 'N/A'}</p>
                  <p className="text-xs text-slate-500 mt-1">{selectedComplaint.department || ''} {selectedComplaint.service ? `• ${selectedComplaint.service}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Reported By</p>
                  <p className="font-bold text-slate-900">{selectedComplaint.reportedBy?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-600 capitalize">{selectedComplaint.reportedBy?.role || 'N/A'}</p>
                  <p className="text-xs text-[#94a3b8] font-bold mt-1">
                    {selectedComplaint.reportedByDepartment || selectedComplaint.reportedBy?.department || selectedComplaint.department || 'N/A'} 
                    {(selectedComplaint.reportedByService || selectedComplaint.reportedBy?.service || selectedComplaint.service) && (
                      <span className="text-indigo-500 ml-1">• {selectedComplaint.reportedByService || selectedComplaint.reportedBy?.service || selectedComplaint.service}</span>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-2">Issue Description</h4>
                <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedComplaint.description}
                </div>
              </div>

              {selectedComplaint.adminAction && (
                <div className="space-y-3">
                  <h4 className="font-bold text-emerald-600 mb-2 border-b border-emerald-100 pb-2 flex items-center gap-2">
                    <CheckCircle size={16} /> Admin Decision & Status
                  </h4>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Action Taken</p>
                    <p className="text-slate-800 font-bold">{selectedComplaint.adminAction}</p>
                  </div>
                  {selectedComplaint.adminNotes && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Admin Feedback/Notes</p>
                      <p className="text-slate-700 text-sm italic">"{selectedComplaint.adminNotes}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {user.role === 'admin' && selectedComplaint.status !== 'Closed' && (
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Admin Action & Feedback</h4>

                <div className="mb-4">
                  <textarea
                    placeholder="Add official message or notes for the reporter and target..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={2}
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedComplaint.status === 'Reported' && (
                    <button onClick={() => handleAdminAction(selectedComplaint._id, 'Under Review')} className="py-2.5 px-4 bg-amber-600 text-white rounded-xl font-bold shadow-md hover:bg-amber-700 transition-colors text-sm">
                      Under Review
                    </button>
                  )}
                  {['Under Review', 'Investigation', 'Reported'].includes(selectedComplaint.status) && (
                    <button onClick={() => handleAdminAction(selectedComplaint._id, 'Investigation')} className="py-2.5 px-4 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors text-sm">
                      Investigate
                    </button>
                  )}

                  <div className="relative">
                    <button 
                      onClick={() => setResolutionMenuOpen(!resolutionMenuOpen)}
                      className="w-full py-2.5 px-4 bg-white border border-slate-300 rounded-xl font-bold text-sm flex items-center justify-between gap-2 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    >
                      <span className="truncate">Resolution...</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${resolutionMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {resolutionMenuOpen && (
                      <div className="absolute bottom-[115%] left-0 w-full min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-[150] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Select Resolution</p>
                        {[
                          "Issue a warning",
                          "Schedule a performance review",
                          "Request improvement plan",
                          "Assign training",
                          "Escalate the issue"
                        ].map((res) => (
                          <button
                            key={res}
                            onClick={() => {
                              handleAdminAction(selectedComplaint._id, 'Action Taken', res);
                              setResolutionMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            {res}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={() => handleAdminAction(selectedComplaint._id, 'Closed', 'Close the complaint')} className="py-2.5 px-4 bg-slate-800 text-white rounded-xl font-bold shadow-md hover:bg-slate-900 transition-colors text-sm">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
