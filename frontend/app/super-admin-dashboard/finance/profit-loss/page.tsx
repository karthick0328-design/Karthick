'use client';

import React from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Loader2,
  Wallet,
  Activity,
  Layers,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  Calculator,
  Briefcase,
  FileText,
  PieChart,
  Users,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import SummaryCard from '../../components/SummaryCard';

type SummaryCardData = {
  title: string;
  value: number;
  change: string;
  status: 'up' | 'down';
  icon: React.ElementType;
  color: string;
  breakdown?: string;
};

export default function ProfitLossPage() {
  const router = useRouter();
  const [profitData, setProfitData] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const base = process.env.NEXT_PUBLIC_API_URL;

        const [profitRes, summaryRes] = await Promise.all([
          axios.get(`${base}/api/adminassignments/service-profit`, { headers }),
          axios.get(`${base}/api/adminassignments/finance/summary`, { headers })
        ]);

        if (profitRes.data.success) setProfitData(profitRes.data.data);
        if (summaryRes.data.success) setSummary(summaryRes.data.data);
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancialData();
  }, []);

  // All values come pre-computed from the backend — no client-side risk of miscount
  const filteredProfitData = profitData;
  const totalRevenue      = summary?.totalRevenue   ?? 0;
  const totalSpending     = summary?.totalSpending  ?? 0;
  const grossProfit       = summary?.netProfit      ?? 0;
  const totalTax          = summary?.totalTax       ?? 0;
  const breakdown         = summary?.breakdown;

  const spendingBreakdown = breakdown
    ? `Expenses: ₹${(breakdown.expenses || 0).toLocaleString()} | Salaries: ₹${(breakdown.salaries || 0).toLocaleString()} | POs: ₹${(breakdown.purchaseOrders || 0).toLocaleString()} | Cash Out: ₹${(breakdown.cashOut || 0).toLocaleString()}`
    : '';

  const profitPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const summaryCards: SummaryCardData[] = [
    { title: 'Total Earnings',  value: totalRevenue,  change: '+12.4%',                                                           status: 'up',                        icon: DollarSign, color: 'indigo' },
    { title: 'Total Spending',  value: totalSpending, change: '↓ All Costs',                                                       status: 'down',                      icon: Wallet,     color: 'rose',    breakdown: spendingBreakdown },
    { title: 'Total Profit',    value: grossProfit,   change: `${grossProfit >= 0 ? '+' : ''}${profitPct}%`,                       status: grossProfit >= 0 ? 'up' : 'down', icon: TrendingUp, color: 'emerald' },
    { title: 'Estimated Tax',   value: totalTax,      change: '+1.4%',                                                             status: 'up',                        icon: Calculator, color: 'amber' },
  ];

  return (
      <div className="flex flex-col gap-16 pb-24 font-sans antialiased text-slate-900 px-6">
         <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideUp {
               from { opacity: 0; transform: translateY(30px); }
               to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
               from { opacity: 0; }
               to { opacity: 1; }
            }
            @keyframes scaleIn {
               from { opacity: 0; transform: scale(0.95); }
               to { opacity: 1; transform: scale(1); }
            }
            @keyframes pulse-slow {
               0%, 100% { opacity: 1; }
               50% { opacity: 0.3; }
            }
            .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
            .animate-scale-in { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            
            .glass-card {
               background: rgba(255, 255, 255, 0.8);
               backdrop-filter: blur(20px);
               border: 1px solid rgba(255, 255, 255, 0.4);
               box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
            }
            
            .custom-scrollbar::-webkit-scrollbar {
               height: 6px;
               width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
               background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
               background: #e2e8f0;
               border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
               background: #cbd5e1;
            }

            .metric-card-hover {
               transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .metric-card-hover:hover {
               transform: translateY(-8px) scale(1.01);
               box-shadow: 0 30px 60px -12px rgba(99, 102, 241, 0.15);
            }
         `}} />

         <header className="flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
               <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2">
                  <Activity size={12} />
                  Live Financial Intelligence
               </div>
               <span className="text-slate-300">|</span>
               <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={12} />
                  Reporting period: Lifetime
               </div>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
               Profit & Loss <span className="text-indigo-600">Analytics</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-2xl">
               Monitor your operational health with real-time synchronized data across expenses, 
               payroll, and service-level revenue streams.
            </p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {summaryCards.map((card, idx) => {
               const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'red', 'emerald', 'amber'];
               return (
                  <SummaryCard
                     key={idx}
                     title={card.title}
                     value={card.value}
                     change={card.change}
                     status={card.status}
                     icon={card.icon}
                     variant={variants[idx % 4]}
                     description="Growth rate"
                  />
               );
            })}
         </div>

         {breakdown && (
            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
               <div className="flex items-center justify-between mb-8 px-4">
                  <div className="flex items-center gap-4">
                     <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                     <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Expenditure Breakdown</h2>
                  </div>
                  <div className="flex gap-2">
                     <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                        Operational Metrics
                     </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="glass-card p-1 rounded-[40px] hover:scale-[1.02] transition-all group cursor-pointer" 
                     onClick={() => router.push('/super-admin-dashboard/finance/expenses')}>
                     <div className="bg-white p-8 rounded-[38px] flex items-center justify-between border border-slate-100 h-full">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-500 shadow-sm">
                              <CreditCard size={32} strokeWidth={2.5} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.25em] mb-1">Operational</p>
                              <h4 className="text-2xl font-black text-slate-900 tracking-tighter">₹{(breakdown.expenses || 0).toLocaleString()}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Expenses</p>
                           </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-200 group-hover:text-rose-600 transform group-hover:translate-x-2 transition-all" />
                     </div>
                  </div>

                  <div className="glass-card p-1 rounded-[40px] hover:scale-[1.02] transition-all group cursor-pointer" 
                     onClick={() => router.push('/super-admin-dashboard/finance/purchase-orders')}>
                     <div className="bg-white p-8 rounded-[38px] flex items-center justify-between border border-slate-100 h-full">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                              <ShoppingCart size={32} strokeWidth={2.5} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-[0.25em] mb-1">Procurement</p>
                              <h4 className="text-2xl font-black text-slate-900 tracking-tighter">₹{(breakdown.purchaseOrders || 0).toLocaleString()}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Purchases</p>
                           </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-200 group-hover:text-indigo-600 transform group-hover:translate-x-2 transition-all" />
                     </div>
                  </div>

                  <div className="glass-card p-1 rounded-[40px] hover:scale-[1.02] transition-all group cursor-pointer" 
                     onClick={() => router.push('/super-admin-dashboard/finance/salaries')}>
                     <div className="bg-white p-8 rounded-[38px] flex items-center justify-between border border-slate-100 h-full">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm">
                              <Users size={32} strokeWidth={2.5} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.25em] mb-1">Human Capital</p>
                              <h4 className="text-2xl font-black text-slate-900 tracking-tighter">₹{(breakdown.salaries || 0).toLocaleString()}</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Salaries</p>
                           </div>
                        </div>
                        <ArrowRight size={20} className="text-slate-200 group-hover:text-emerald-600 transform group-hover:translate-x-2 transition-all" />
                     </div>
                  </div>
               </div>
            </div>
         )}

         <section className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="glass-card rounded-[48px] border border-slate-200 shadow-2xl overflow-hidden transition-all flex flex-col">
               <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-10 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-30" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                     <div className="w-16 h-16 rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                        <Layers size={32} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black tracking-tight text-white italic">Earnings Stream <span className="text-indigo-400 font-normal not-italic opacity-60">/ Efficiency Table</span></h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Performance breakdown per service module</p>
                     </div>
                  </div>

                  <div className="relative w-full md:w-96 z-10 group">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" size={20} />
                     <input
                        type="text"
                        placeholder="Search specific modules..."
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-8 text-sm font-bold text-white placeholder:text-white/20 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all focus:bg-white/10"
                     />
                  </div>
               </div>

               <div className="p-4 flex-1">
                  <div className="overflow-x-auto custom-scrollbar pb-4 rounded-[32px]">
                     {loading ? (
                        <div className="py-48 flex flex-col items-center gap-6 text-center">
                           <div className="relative">
                              <Loader2 size={64} className="animate-spin text-indigo-600 opacity-20" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <Plus size={24} className="text-indigo-600 animate-pulse" />
                              </div>
                           </div>
                           <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Syncing Financial Nodes...</p>
                        </div>
                     ) : (
                        <table className="w-full text-left border-separate border-spacing-0">
                           <thead>
                              <tr className="bg-slate-50/50">
                                 <th className="py-8 px-12 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100">Project Stream</th>
                                 <th className="py-8 px-12 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100 text-center">Revenue</th>
                                 <th className="py-8 px-12 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100 text-center">Volume</th>
                                 <th className="py-8 px-12 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100 text-center">Profitability</th>
                                 <th className="py-8 px-12 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-100 text-right">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {filteredProfitData.map((row, idx) => (
                                 <tr key={idx} className="group hover:bg-slate-50/80 transition-all duration-300">
                                    <td className="py-10 px-12">
                                       <div className="flex items-center gap-6">
                                          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-white to-slate-100 text-slate-900 group-hover:from-indigo-600 group-hover:to-violet-700 group-hover:text-white transition-all duration-700 font-extrabold text-xl flex items-center justify-center border border-slate-200 group-hover:border-indigo-400 shadow-sm group-hover:shadow-indigo-200 relative overflow-hidden">
                                             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                             {row.name?.[0]}
                                          </div>
                                          <div className="space-y-1.5 transform group-hover:translate-x-2 transition-transform duration-500">
                                             <span className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600">{row.name}</span>
                                             <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                                                   MODULE-{200 + idx}
                                                </div>
                                                <span className="text-slate-200 animate-pulse-slow">•</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Insight</span>
                                             </div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="py-10 px-12 text-center">
                                       <div className="flex flex-col gap-1 items-center">
                                          <span className="text-2xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform duration-500 underline decoration-indigo-500/20 underline-offset-8 decoration-4">₹{(row.paidRevenue > 0 ? row.paidRevenue : (row.revenue || 0)).toLocaleString()}</span>
                                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-2">Paid Collected</span>
                                       </div>
                                    </td>
                                    <td className="py-10 px-12 text-center">
                                       <div className="inline-flex items-center gap-2.5 px-6 py-2 bg-white group-hover:bg-slate-900 group-hover:text-white rounded-2xl text-[11px] font-black border border-slate-200 shadow-sm transition-all duration-500">
                                          <Briefcase size={16} className="text-slate-400" />
                                          {row.projects} Units
                                       </div>
                                    </td>
                                    <td className="py-10 px-12 text-center">
                                       <div className="flex flex-col gap-4 items-center">
                                          <div className="w-48 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner group-hover:border-indigo-200 transition-colors">
                                             <div
                                                className="h-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 rounded-full transition-all duration-1000 relative"
                                                style={{ width: row.margin }}
                                             >
                                                <div className="absolute inset-0 bg-white/30 animate-[pulse_2s_infinite] shimmer" />
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <TrendingUp size={12} className="text-emerald-500" />
                                             <span className="text-[12px] font-black text-slate-900 tracking-wider font-mono">{row.margin} Margin</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="py-10 px-12 text-right">
                                       <div className="inline-flex items-center gap-3 px-8 py-3 bg-indigo-600 text-white rounded-full font-black text-lg border-2 border-white/20 shadow-lg shadow-indigo-200 transition-all hover:bg-slate-900 hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group/btn">
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                          <span className="relative z-10">{row.margin}</span>
                                          <ArrowRight size={22} className="relative z-10" />
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                              {filteredProfitData.length === 0 && (
                                 <tr className="animate-fade-in">
                                    <td colSpan={5} className="py-48 text-center bg-slate-50/30">
                                       <div className="flex flex-col items-center gap-8">
                                          <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-slate-200 border-2 border-dashed border-slate-300 shadow-sm">
                                             <Layers size={48} strokeWidth={1.5} />
                                          </div>
                                          <div className="space-y-3">
                                             <p className="text-2xl font-black text-slate-800 tracking-[0.2em] uppercase italic">Inventory Empty</p>
                                             <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">No operational cycles detected in this layer</p>
                                          </div>
                                       </div>
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     )}
                  </div>
               </div>
            </div>
         </section>
      </div>
   );
}
