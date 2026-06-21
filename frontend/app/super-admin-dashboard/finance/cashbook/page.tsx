'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
   ArrowUpRight,
   ArrowDownRight,
   DollarSign,
   Calendar,
   Filter,
   Download,
   PieChart,
   Loader2,
   TrendingUp,
   CreditCard,
   Plus,
   Zap,
   Activity,
   History,
   ShieldCheck,
   ChevronRight,
   TrendingDown,
   Wallet,
   Cpu,
   Layers,
   Search,
   RefreshCw,
   FileText,
   Database,
   ArrowRight
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../../components/SummaryCard';

type Transaction = {
   _id: string;
   description: string;
   date: string;
   debit: number;
   credit: number;
   source?: string;
   type?: string;
   status?: string;
};

export default function CashbookPage() {
   const [data, setData] = useState<Transaction[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');

   const fetchCashbook = async () => {
      try {
         setLoading(true);
         const token = localStorage.getItem('token');
         const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/cashbook/transactions`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (response.data.success) {
            setData(response.data.data);
         }
      } catch (error) {
         console.error('Error fetching cashbook:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchCashbook();
   }, []);

   const totalIn = data.reduce((acc, curr) => acc + (curr.debit || 0), 0);
   const totalOut = data.reduce((acc, curr) => acc + (curr.credit || 0), 0);
   const netFlow = totalIn - totalOut;

   const financeMetrics = [
      { title: 'Total Inflow', value: `₹${totalIn.toLocaleString()}`, change: '+14.2%', status: 'up', icon: TrendingUp },
      { title: 'Total Outflow', value: `₹${totalOut.toLocaleString()}`, change: '+5.8%', status: 'down', icon: TrendingDown },
      { title: 'Net Asset Flow', value: `₹${netFlow.toLocaleString()}`, change: '+0.4%', status: 'up', icon: Zap },
      { title: 'Liquid Reserves', value: `₹${(totalIn - totalOut).toLocaleString()}`, change: '+2.1%', status: 'up', icon: Wallet },
   ];

   const filteredData = useMemo(() => {
      return data.filter(item => 
         item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
   }, [data, searchQuery]);

   return (
      <div className="space-y-10 font-sans antialiased text-slate-900">
         <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
                  <ShieldCheck size={10} className="text-indigo-400" />
                  <span>Real-Time Capital Surveillance</span>
               </div>
               <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                     Cashbook Intelligence
                     <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                  </h2>
                  <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">System-wide liquidity monitoring and transaction forensic audit log</p>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                     type="text" 
                     placeholder="Search transactions..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-indigo-100 shadow-sm w-64" 
                  />
               </div>
               <button className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2 group">
                  <Download size={14} /> Export Ledger
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {financeMetrics.map((item, idx) => {
               const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['emerald', 'red', 'purple', 'amber'];
               return (
                  <SummaryCard
                     key={idx}
                     title={item.title}
                     value={item.value}
                     change={item.change}
                     status={item.status as 'up' | 'down'}
                     icon={item.icon || Activity}
                     variant={variants[idx % 4]}
                     description="Growth rate"
                  />
               );
            })}
         </div>

         <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
            <div className="bg-indigo-950 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                    <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Transaction Records</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Live Capital Flow Synchronization</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={fetchCashbook} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all group/btn">
                        <RefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-700" />
                    </button>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                        Synchronized
                    </div>
                </div>
            </div>

            <div className="p-10 pt-4 space-y-12 flex-1">
               <div className="overflow-x-auto">
                  {loading ? (
                     <div className="py-24 flex flex-col items-center justify-center gap-6">
                        <Loader2 className="animate-spin text-indigo-600" size={48} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Initializing Bitstream Protocol...</p>
                     </div>
                  ) : (
                     <table className="w-full border-separate border-spacing-y-4">
                        <thead>
                           <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              <th className="pb-4 px-6 font-black uppercase">Transaction Context</th>
                              <th className="pb-4 px-4 font-black uppercase">Category / Type</th>
                              <th className="pb-4 px-4 font-black uppercase text-center text-emerald-600">Inflow (₹)</th>
                              <th className="pb-4 px-4 font-black uppercase text-center text-rose-600">Outflow (₹)</th>
                              <th className="pb-4 px-6 font-black text-right uppercase">Timestamp</th>
                           </tr>
                        </thead>
                        <tbody>
                           {filteredData.map((row, idx) => (
                              <tr key={row._id || idx} className="group transition-all duration-300">
                                 <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-indigo-100 transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 ${row.debit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform border border-white`}>
                                          {row.debit > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                       </div>
                                       <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{row.description}</span>
                                          <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{row.source || 'INTERNAL TRANSFER'}</span>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                                       {row.type || 'Operational'}
                                    </span>
                                 </td>
                                 <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center font-sans">
                                    <span className={`text-base font-black ${row.debit > 0 ? 'text-emerald-600' : 'text-slate-300'} tracking-tighter`}>
                                       {row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '—'}
                                    </span>
                                 </td>
                                 <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center font-sans">
                                    <span className={`text-base font-black ${row.credit > 0 ? 'text-rose-600' : 'text-slate-300'} tracking-tighter`}>
                                       {row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '—'}
                                    </span>
                                 </td>
                                 <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                                    <div className="flex flex-col items-end gap-1">
                                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{new Date(row.date).toLocaleDateString()}</span>
                                       <span className="text-[9px] font-bold text-slate-400">{new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
               <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-indigo-600 transition-all tracking-[0.2em]">
                  Audit Full Historical Capital Flow & Archive Data
               </button>
            </div>
         </div>
      </div>
   );
}
