'use client';

import React from 'react';
import { 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Clock,
  Briefcase,
  CheckCircle,
  Cpu,
  Globe,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function ServiceProfitPage() {
  const [profitData, setProfitData] = React.useState<any[]>([]);
  const [purchaseData, setPurchaseData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProfit = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/service-profit`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setProfitData(response.data.data);
          setPurchaseData(response.data.purchases);
        }
      } catch (error) {
        console.error('Error fetching profit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfit();
  }, []);

  const totalRevenue = profitData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalPaid = profitData.reduce((acc, curr) => acc + (curr.paidRevenue || 0), 0);
  const averageYield = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

  const serviceKPIs = [
    { title: 'Total Service Pipeline', value: `₹${(totalRevenue/100000).toFixed(1)}L`, change: '+12.4%', status: 'up', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Units Monitored', value: profitData.length.toString(), change: '+0', status: 'up', icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { title: 'Cumulative Yield', value: `${averageYield}%`, change: '+4.2%', status: 'up', icon: Zap, color: 'bg-rose-50 text-rose-600' },
    { title: 'Liquidity Index', value: `₹${(totalPaid/100000).toFixed(1)}L`, change: '+1.4%', status: 'up', icon: Activity, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
            <Layers size={10} className="text-indigo-400" />
            <span>Master Service Analytics</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               Service P&L
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Individual unit profitability and performance yield monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm hover:shadow-lg transition-all flex items-center gap-2">
            <Filter size={14} /> Service Context
          </button>
          <button className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center gap-2">
            <Download size={14} /> Yield Report XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {serviceKPIs.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['emerald', 'purple', 'red', 'amber'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Activity}
              variant={variants[idx % 4]}
              description="Analytics Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
        <div className="bg-emerald-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative">
                <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Unit Profitability Matrix</h3>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Global performance and yield surveillance</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                <input type="text" placeholder="Scan Unit ID..." className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72" />
              </div>
              <div className="flex items-center gap-2 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                Live Sync Active
              </div>
            </div>
        </div>

        <div className="p-10 pt-4 space-y-12 flex-1">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Retrieving Global Yield Sync...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black uppercase">Service Unit</th>
                    <th className="pb-4 px-4 font-black uppercase">Contract Value</th>
                    <th className="pb-4 px-4 font-black uppercase">Collected</th>
                    <th className="pb-4 px-4 font-black uppercase">Active Projects</th>
                    <th className="pb-4 px-6 font-black text-right uppercase">Yield Index</th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.map((row, idx) => (
                    <tr key={idx} className="group transition-all duration-300">
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-emerald-100 transition-all font-black text-xs uppercase tracking-tight text-slate-900">
                        {row.name}
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent font-sans text-sm font-bold text-slate-600">
                         ₹{row.revenue?.toLocaleString()}
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent font-sans text-sm font-bold text-emerald-600">
                         ₹{row.paidRevenue?.toLocaleString()}
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent font-sans text-xs font-bold text-slate-400">
                         {row.projects} Cycle(s)
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-slate-900 tracking-tighter">{row.margin}</span>
                            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full bg-emerald-600 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]`} style={{ width: row.margin }} />
                            </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {purchaseData && (
                    <tr className="group transition-all duration-300">
                      <td className="bg-rose-50/50 mt-4 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-rose-100 transition-all font-black text-xs uppercase tracking-tight text-rose-900">
                        Purchase Orders (Procurement)
                      </td>
                      <td className="bg-rose-50/50 mt-4 py-5 px-4 border-y border-transparent font-sans text-sm font-bold text-slate-600">
                         ₹{purchaseData.totalVolume?.toLocaleString()}
                      </td>
                      <td className="bg-rose-50/50 mt-4 py-5 px-4 border-y border-transparent font-sans text-sm font-bold text-rose-600">
                         ₹{purchaseData.approvedVolume?.toLocaleString()}
                      </td>
                      <td className="bg-rose-50/50 mt-4 py-5 px-4 border-y border-transparent font-sans text-xs font-bold text-rose-400">
                         {purchaseData.count} Cycle(s)
                      </td>
                      <td className="bg-rose-50/50 mt-4 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-rose-900 tracking-tighter">
                                {purchaseData.totalVolume > 0 ? Math.round((purchaseData.approvedVolume / purchaseData.totalVolume) * 100) : 0}%
                            </span>
                            <div className="w-24 h-1.5 bg-rose-200 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full bg-rose-600 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.3)]`} style={{ width: `${purchaseData.totalVolume > 0 ? Math.round((purchaseData.approvedVolume / purchaseData.totalVolume) * 100) : 0}%` }} />
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-emerald-600 transition-all tracking-[0.2em]">
              Access Full Global Yield Meta Audit & Unit Archival Unit
          </button>
        </div>
      </div>
    </div>
  );
}
