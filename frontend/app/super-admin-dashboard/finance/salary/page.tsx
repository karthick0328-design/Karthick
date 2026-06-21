'use client';

import React from 'react';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Download,
  PieChart,
  Briefcase,
  LayoutGrid,
  Plus,
  Search,
  Loader2,
  Cpu,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SummaryCard from '../../components/SummaryCard';

export default function SalaryPage() {
  const router = useRouter();
  const [salaries, setSalaries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState<string>('');
  const [filterYear, setFilterYear] = React.useState<string>('');

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = Array.from(new Set(salaries.map(s => s.year?.toString()))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  if (years.length === 0) years.push(new Date().getFullYear().toString());

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salaries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSalaries(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this salary record?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSalaries();
    } catch (error) {
      console.error('Error deleting salary:', error);
      alert('Failed to delete record');
    }
  };

  const handleEdit = (record: any) => {
    router.push(`/super-admin-dashboard/finance/salary/initiation?editId=${record._id}`);
  };

  const handleView = (record: any) => {
    router.push(`/super-admin-dashboard/finance/salary/initiation?editId=${record._id}&viewOnly=true`);
  };

  const handleCreate = () => {
    router.push('/super-admin-dashboard/finance/salary/initiation');
  };

  React.useEffect(() => {
    fetchSalaries();
  }, []);

  const filteredSalaries = salaries.filter((s: any) => {
    const matchesSearch = s.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.userId?.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMonth = !filterMonth || s.month.toString() === filterMonth;
    const matchesYear = !filterYear || s.year?.toString() === filterYear;
    return matchesSearch && matchesMonth && matchesYear;
  });

  const uniqueSalaries = [...filteredSalaries].sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  const totalSalariesAmount = uniqueSalaries.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0);
  const paidCount = uniqueSalaries.filter(s => s.status === 'credited').length;
  const pendingCount = uniqueSalaries.filter(s => s.status === 'pending' || s.status === 'processed').length;

  const salaryMetrics = [
    { title: 'Total Salaries', value: `₹${totalSalariesAmount.toLocaleString()}`, change: '+0', status: 'up', icon: Users, color: 'violet' },
    { title: 'Tax Savings', value: `₹${(totalSalariesAmount * 0.1).toLocaleString()}`, change: '+0', status: 'up', icon: DollarSign, color: 'emerald' },
    { title: 'Pending Payments', value: pendingCount.toString(), change: '+0', status: 'up', icon: PieChart, color: 'amber' },
    { title: 'Paid Employees', value: paidCount.toString(), change: '+0', status: 'up', icon: Briefcase, color: 'rose' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-violet-100 ring-2 ring-violet-50">
            <Cpu size={10} className="text-violet-400" />
            <span>Payroll Dashboard</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
               Salary Management
               <div className="w-1.5 h-1.5 bg-violet-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Track employee salaries, tax deductions, and payment status</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/super-admin-dashboard/finance/salary/calibration')}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-xl hover:border-indigo-600 transition-all flex items-center gap-2 hover:-translate-y-1 active:scale-95 group"
          >
            <LayoutGrid size={18} className="text-indigo-600 group-hover:rotate-90 transition-transform duration-500" /> 
            Settings
          </button>
          <button 
            onClick={handleCreate}
            className="px-8 py-4 bg-violet-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-slate-900 transition-all flex items-center gap-2 hover:-translate-y-1 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 
            Add Record
          </button>
          <button className="px-6 py-4 bg-white border border-slate-100 rounded-[24px] text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-sm hover:shadow-lg transition-all flex items-center gap-2">
            <Download size={14} /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {salaryMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['purple', 'emerald', 'amber', 'red'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || Users}
              variant={variants[idx % 4]}
              description="Monthly Change"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-violet-600 px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
                 <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Salary Records</h3>
                 <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">View and manage salary payments for all staff</p>
             </div>
             <div className="flex gap-4">
                 <div className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl border border-white/20 shadow-sm">
                     <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                     <span className="text-[10px] font-black uppercase tracking-widest">{paidCount} Credited</span>
                 </div>
                 <div className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl border border-white/20 shadow-sm">
                     <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-sm shadow-amber-200" />
                     <span className="text-[10px] font-black uppercase tracking-widest">{pendingCount} In Process</span>
                 </div>
             </div>
        </div>
        
        <div className="p-10 pt-4 space-y-12 flex-1">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-violet-100 shadow-sm w-full md:w-96" 
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="pl-14 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-violet-100 shadow-sm w-full md:w-56 appearance-none cursor-pointer"
              >
                <option value="">All Months</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="pl-14 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-violet-100 shadow-sm w-full md:w-48 appearance-none cursor-pointer"
              >
                <option value="">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto px-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-6">
                 <Loader2 className="animate-spin text-violet-600" size={48} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Loading salary records...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black">Employee Name</th>
                    <th className="pb-4 px-4 font-black">Designation</th>
                    <th className="pb-4 px-4 font-black">Month/Year</th>
                    <th className="pb-4 px-4 font-black">Net Salary</th>
                    <th className="pb-4 px-4 font-black text-center">Payment Status</th>
                    <th className="pb-4 px-6 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueSalaries.map((row: any, idx: number) => (
                    <tr key={row._id || idx} className="group">
                      <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-violet-100 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-950 text-white rounded-2xl flex items-center justify-center text-xs font-black ring-4 ring-indigo-50 shadow-xl group-hover:rotate-12 transition-transform uppercase border border-white/10">
                               {row.userId?.name?.charAt(0) || 'U'}{row.userId?.name?.split(' ')[1]?.charAt(0) || ''}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 group-hover:text-violet-600 transition-colors uppercase tracking-tight">{row.userId?.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.userId?.uniqueId}</span>
                            </div>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.userId?.role || 'PERSONNEL'}</span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                        <span className="text-[10px] font-black text-violet-600 uppercase">Month {row.month} / {row.year}</span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">₹{(row.netSalary || 0).toLocaleString()}</span>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Gross: ₹{row.grossSalary?.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 border-y border-transparent text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border shadow-sm ${row.status === 'credited' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50'}`}>
                            {row.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                         <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleView(row)} className="p-2.5 bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 transition-all shadow-sm">
                                <Eye size={14} />
                             </button>
                             <button onClick={() => handleEdit(row)} className="p-2.5 bg-white text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl border border-slate-100 transition-all shadow-sm">
                                <Edit2 size={14} />
                             </button>
                             <button onClick={() => handleDelete(row._id)} className="p-2.5 bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl border border-slate-100 transition-all shadow-sm">
                                <Trash2 size={14} />
                             </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSalaries.length === 0 && (
                    <tr>
                        <td colSpan={6} className="py-20 text-center text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">No salary records found for the specified parameters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm ring-8 ring-transparent hover:ring-violet-100/30">
              Process Bulk Salary Payments
          </button>
        </div>
      </div>

    </div>
  );
}
