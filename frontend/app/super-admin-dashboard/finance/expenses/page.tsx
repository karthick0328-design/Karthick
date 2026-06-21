'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Filter,
  Download,
  ClipboardList,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  Paperclip,
  File,
  Eye,
  ChevronDown,
  Search,
  Loader2,
  X,
  Activity,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Layers,
  Zap,
  CreditCard,
  Building2,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../../components/SummaryCard';
import { toast, Toaster } from 'react-hot-toast';
import SidebarAdmin from '../../../adminCompontent/sidebarAdmin';
import Header from '../../../adminCompontent/Header';
import createDOMPurify from 'dompurify';
import { validateURL, getSanitizedURL } from '@/lib/validation';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    receiptDate: new Date().toISOString().split('T')[0],
    category: 'Other',
    basicAmount: '',
    taxAmount: '0',
    paidTo: '',
    paymentMode: 'Cash',
    description: ''
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const sanitizedData = response.data.data.map((exp: any) => ({
          ...exp,
          fileUrl: getSanitizedURL(exp.fileUrl),
          paidTo: exp.paidTo ? createDOMPurify(window as any).sanitize(exp.paidTo) : '',
          category: exp.category ? createDOMPurify(window as any).sanitize(exp.category) : '',
          description: exp.description ? createDOMPurify(window as any).sanitize(exp.description) : ''
        }));
        setExpenses(sanitizedData);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expense records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!formData.basicAmount || !formData.paidTo) {
      toast.error('Please fill in required fields');
      return;
    }

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      submitData.append(key, value);
    });
    if (file) {
      submitData.append('file', file);
    }

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/expenses`, submitData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        toast.success('Expense recorded successfully');
        setShowModal(false);
        setFormData({
          receiptDate: new Date().toISOString().split('T')[0],
          category: 'Other',
          basicAmount: '',
          taxAmount: '0',
          paidTo: '',
          paymentMode: 'Cash',
          description: ''
        });
        setFile(null);
        fetchExpenses();
      } else {
        toast.error(res.data.message || 'Failed to save expense');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Network error. Failed to save.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/expenses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Record deleted');
        fetchExpenses();
      }
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp =>
      exp.paidTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [expenses, searchQuery]);

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalTax = expenses.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

  const expenseSummary = [
    { title: 'Gross Expenditure', value: `₹${totalExpense.toLocaleString()}`, change: '+12.5%', status: 'down', icon: FileText },
    { title: 'Tax Deductions', value: `₹${totalTax.toLocaleString()}`, change: '+0.8%', status: 'up', icon: AlertTriangle },
    { title: 'Net Base Amount', value: `₹${(totalExpense - totalTax).toLocaleString()}`, change: '+4.2%', status: 'up', icon: DollarSign },
    { title: 'Audit Capacity', value: expenses.length.toString(), change: '+2', status: 'up', icon: ClipboardList },
  ];

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <Toaster position="top-right" />

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 ring-2 ring-rose-50">
            <TrendingDown size={10} className="text-rose-400" />
            <span>Operational Spend Surveillance</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Expense Intelligence
              <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">System-wide expenditure monitoring and multi-category financial auditing</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                 type="text" 
                 placeholder="Search records..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-rose-100 shadow-sm w-64" 
              />
           </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-slate-900 transition-all flex items-center gap-2 group"
          >
            <Plus size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Add Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {expenseSummary.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['red', 'purple', 'amber', 'emerald'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="Monthly Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
         <div className="bg-rose-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="relative">
                 <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Expense Ledger</h3>
                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Live Operational Spend Sync</p>
             </div>
             <div className="flex gap-4 items-center">
                 <button onClick={fetchExpenses} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all group/btn">
                     <RefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-700" />
                 </button>
                 <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                     <Download size={14} /> Download XLS
                 </button>
             </div>
         </div>

         <div className="p-10 pt-4 space-y-12 flex-1">
            <div className="overflow-x-auto">
               {loading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-6">
                     <Loader2 className="animate-spin text-rose-600" size={48} />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Syncing Spend Bitstream...</p>
                  </div>
               ) : (
                  <table className="w-full border-separate border-spacing-y-4">
                     <thead>
                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                           <th className="pb-4 px-6 font-black uppercase">Recipient Context</th>
                           <th className="pb-4 px-4 font-black uppercase">Category / Mode</th>
                           <th className="pb-4 px-4 font-black uppercase text-center">Net Amount</th>
                           <th className="pb-4 px-4 font-black uppercase text-center text-rose-500">Gross Amount</th>
                           <th className="pb-4 px-6 font-black text-right uppercase">Audit History</th>
                        </tr>
                     </thead>
                     <tbody>
                        {filteredExpenses.map((row, idx) => (
                           <tr key={row._id || idx} className="group transition-all duration-300">
                              <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-rose-100 transition-all">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-950 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform border border-white/10">
                                       <Building2 size={20} />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                       <span className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{row.paidTo}</span>
                                       <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{row.description || 'OPERATIONAL DISBURSEMENT'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 italic w-fit">
                                       {row.category}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">{row.paymentMode}</span>
                                 </div>
                              </td>
                              <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center font-sans font-black text-slate-900">
                                 ₹{row.basicAmount?.toLocaleString()}
                              </td>
                              <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center font-sans font-black text-rose-600 text-base tracking-tighter">
                                 ₹{row.totalAmount?.toLocaleString()}
                              </td>
                              <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                                 <div className="flex items-center justify-end gap-3">
                                    {row.attachments?.map((fileUrl: string, fIdx: number) => {
                                      const safeHref = fileUrl && !/^\s*javascript:/i.test(fileUrl) 
                                        ? createDOMPurify(window as any).sanitize(fileUrl) 
                                        : '#';
                                      return (
                                        <a 
                                          key={fIdx} 
                                          href={safeHref} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-indigo-100 group/link"
                                          title="Expand Vector"
                                        >
                                          <LinkIcon size={14} className="group-hover/link:rotate-12 transition-transform" />
                                        </a>
                                      );
                                    })}
                                    {row.fileUrl && (
                                       <a 
                                          href={(() => {
                                            const safe = row.fileUrl && !/^\s*javascript:/i.test(row.fileUrl)
                                              ? createDOMPurify(window as any).sanitize(row.fileUrl)
                                              : '#';
                                            return safe;
                                          })()}
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-3 bg-white text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all shadow-sm"
                                       >
                                          <Eye size={16} />
                                       </a>
                                    )}
                                    <button 
                                       onClick={() => handleDeleteExpense(row._id)}
                                       className="p-3 bg-white text-rose-300 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all shadow-sm"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </div>
            <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-rose-600 transition-all tracking-[0.2em]">
               Access Full Financial Spend Sync & Archive Archive
            </button>
         </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300 relative">
            <div className="p-10 space-y-8">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-100 border border-white/20">
                        <Plus size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">New Expenditure Log</h3>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Operational Capital Allocation</p>
                     </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400">
                     <X size={20} />
                  </button>
               </div>

              <form onSubmit={handleSaveExpense} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Receipt Date</label>
                    <input type="date" value={formData.receiptDate} onChange={e => setFormData({...formData, receiptDate: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none uppercase tracking-widest">
                      {['Office Supplies', 'Maintenance', 'Utilities', 'Salaries', 'Rent', 'Travel', 'Marketing', 'Software', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Amount (₹)</label>
                    <input type="number" value={formData.basicAmount} onChange={e => setFormData({...formData, basicAmount: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">GST (₹)</label>
                    <input type="number" value={formData.taxAmount} onChange={e => setFormData({...formData, taxAmount: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none" placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Paid To / Recipient</label>
                   <input type="text" value={formData.paidTo} onChange={e => setFormData({...formData, paidTo: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none uppercase tracking-widest" placeholder="NAME OF INDIVIDUAL OR ORG" />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description / Notes</label>
                   <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 outline-none resize-none" placeholder="ENTER TRANSACTION DETAILS" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Attachment (Optional)</label>
                  <div className="relative group/upload">
                    <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center gap-2 group-hover/upload:border-rose-300 group-hover/upload:bg-rose-50/30 transition-all">
                      <Paperclip size={24} className="text-slate-300 group-hover/upload:text-rose-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{file ? file.name : 'Upload Receipt'}</p>
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/20 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 group">
                   <Zap size={16} className="group-hover:animate-bounce" /> Authorize Transaction
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
