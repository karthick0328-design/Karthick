'use client';

import React from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Search,
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  TrendingUp,
  Monitor,
  Database,
  Server,
  Wallet,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

interface PaymentDetailModalProps {
  payment: any | null;
  onClose: () => void;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ payment, onClose }) => {
  if (!payment) return null;

  const quoted = payment.projectId?.quotedAmount || 0;
  const paid = payment.projectId?.paymentDetails?.paidAmount || 0;
  const remaining = Math.max(0, quoted - paid);

  return (
    <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[40px] p-10 shadow-2xl max-w-2xl w-full space-y-6 relative border border-slate-100 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-rose-600" />
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
        >
          <Plus size={16} className="rotate-45" />
        </button>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-widest">
          Settlement Details
        </h3>

        <div className="grid grid-cols-2 gap-8 py-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</p>
            <p className="font-black text-slate-800">{payment.transactionId || 'INTERNAL-SYNC'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project ID</p>
            <p className="font-black text-slate-800">{payment.projectId?.uniqueId || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Cluster</p>
            <p className="font-black text-slate-800">{payment.projectId?.title || 'System Core'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Identity</p>
            <p className="font-black text-slate-800">{payment.userId?.name || 'Walk-in'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Address</p>
            <p className="font-black text-slate-800">{payment.userId?.email || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settled Amount</p>
            <p className="text-xl font-black text-emerald-600 tracking-tighter">₹{payment.amount?.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Protocol</p>
            <p className="font-black text-slate-800 uppercase">{payment.method || 'Blockchain'}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 flex justify-end gap-4">
          <button className="px-8 py-4 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-rose-600 transition-all">
            Audit Archive
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [usersList, setUsersList] = React.useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<string>('');
  const [selectedPayment, setSelectedPayment] = React.useState<any | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const [resClients, resInternal] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/clients?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=1000`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const clients = resClients.data?.data || [];
      const internal = resInternal.data?.data || [];
      const allUsers = [...clients, ...internal];
      setUsersList(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let queryParams = '';
      if (selectedUserId) queryParams = `?userId=${selectedUserId}`;
      else if (selectedRole) queryParams = `?role=${selectedRole}`;
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/payments/all${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  React.useEffect(() => {
    fetchPayments();
  }, [selectedUserId, selectedRole]);

  const totalInflow = payments
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const pendingSettlement = payments
    .filter(p => p.status?.toLowerCase() === 'pending')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const paymentMetrics = [
    { title: 'Inflow Total', value: `₹${totalInflow.toLocaleString()}`, change: '+12.4%', status: 'up', icon: Wallet, color: 'emerald' },
    { title: 'Pending Settlement', value: `₹${pendingSettlement.toLocaleString()}`, change: '+1.4%', status: 'up', icon: Clock, color: 'amber' },
    { title: 'Payments Count', value: payments.length.toString(), change: '+0', status: 'up', icon: CreditCard, color: 'indigo' },
    { title: 'Yield Efficiency', value: '94.2%', change: '+0.1%', status: 'up', icon: Activity, color: 'rose' },
  ];

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 ring-2 ring-rose-50">
            <CreditCard size={10} className="text-rose-400" />
            <span>Master Settlement Hub</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Capital Flow Status
              <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping" />
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Global payment surveillance and institutional revenue settlement monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setSelectedUserId('');
            }}
            className="px-6 py-4 bg-white border border-slate-100 rounded-[28px] text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none shadow-sm hover:shadow-lg transition-all focus:ring-4 focus:ring-rose-100"
          >
            <option value="">Global Core</option>
            <option value="user">User Role</option>
          </select>

          {selectedRole && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-6 py-4 bg-white border border-slate-100 rounded-[28px] text-[10px] font-black text-slate-900 uppercase tracking-widest outline-none shadow-sm hover:shadow-lg transition-all focus:ring-4 focus:ring-rose-100 animate-in fade-in slide-in-from-left-4"
            >
              <option value="">All {selectedRole}s</option>
              {usersList.filter(u => u.role === selectedRole).map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          )}
          <button className="px-5 py-4 bg-rose-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-slate-900 transition-all flex items-center gap-2 group">
            <Download size={18} className="group-hover:translate-y-1 transition-transform" /> Transaction XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {paymentMetrics.map((item, idx) => {
          const variants: ('purple' | 'red' | 'emerald' | 'amber')[] = ['emerald', 'amber', 'purple', 'red'];
          return (
            <SummaryCard
              key={idx}
              title={item.title}
              value={item.value}
              change={item.change}
              status={item.status as 'up' | 'down'}
              icon={item.icon || CreditCard}
              variant={variants[idx % 4]}
              description="Analytics Update"
            />
          );
        })}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
        <div className="bg-rose-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative">
                <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Settlement Surveillance</h3>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Live Transaction Ledger Monitoring</p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={14} />
                <input 
                  type="text" 
                  placeholder="Scan ID or Project..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-6 py-3 bg-white/10 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-2 focus:ring-white text-white placeholder:text-white/40 w-72" 
                />
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
                <Loader2 className="animate-spin text-rose-600" size={48} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Retrieving Global Settlement Sync...</p>
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-4 px-6 font-black uppercase">Segment / Project</th>
                    <th className="pb-4 px-4 font-black uppercase">User Context</th>
                    <th className="pb-4 px-4 font-black uppercase text-center">Contract Value</th>
                    <th className="pb-4 px-4 font-black uppercase text-center">Settled Capital</th>
                    <th className="pb-4 px-4 font-black uppercase text-center text-rose-500">Remaining Debt</th>
                    <th className="pb-4 px-6 font-black text-right uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .filter(row => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (row.transactionId || '').toLowerCase().includes(q) ||
                        (row.projectId?.uniqueId || '').toLowerCase().includes(q) ||
                        (row.projectId?.title || '').toLowerCase().includes(q) ||
                        (row.userId?.name || '').toLowerCase().includes(q)
                      );
                    })
                    .map((row, idx) => {
                    const quotedAmount = row.projectId?.quotedAmount || 0;
                    const totalPaid = row.projectId?.paymentDetails?.paidAmount || 0;
                    const remainingAmount = Math.max(0, quotedAmount - totalPaid);

                    return (
                      <tr key={row._id || idx} className="group transition-all duration-300">
                        <td className="bg-slate-50/50 py-5 px-6 rounded-l-[32px] border-y border-l border-transparent hover:border-rose-100 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-950 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform border border-white/10">
                              <Database size={20} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{row.projectId?.title || row.projectId?.category || 'General Inflow'}</span>
                              <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{row.projectId?.uniqueId ? `${row.projectId.uniqueId} • ` : ''}{row.transactionId || 'INTERNAL-TX-SYNC'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{row.userId?.name || 'Retail Client'}</span>
                            <span className="text-[9px] font-bold text-slate-400">{row.userId?.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center">
                          <span className="text-xs font-black text-slate-900">₹{quotedAmount.toLocaleString()}</span>
                        </td>
                        <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center">
                          <div className="flex flex-col">
                            <span className="text-base font-black text-emerald-600 tracking-tighter">₹{row.amount?.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{row.method || 'Standard'}</span>
                          </div>
                        </td>
                        <td className="bg-slate-50/50 py-5 px-4 border-y border-transparent text-center">
                          <span className="text-base font-black text-rose-600 tracking-tighter">₹{remainingAmount.toLocaleString()}</span>
                        </td>
                        <td className="bg-slate-50/50 py-5 px-6 rounded-r-[32px] text-right border-y border-r border-transparent">
                          <div className="flex items-center justify-end gap-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full border shadow-sm ${row.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50' : 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100'}`}>
                              {row.status?.toUpperCase() || 'VERIFIED'}
                            </span>
                            <button
                              onClick={() => setSelectedPayment(row)}
                              className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all shadow-sm group-hover:rotate-12"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <button className="w-full py-5 text-center text-[10px] font-bold text-slate-200 uppercase tracking-widest border border-dashed border-slate-100 rounded-[32px] hover:bg-slate-50 hover:text-rose-600 transition-all tracking-[0.2em]">
            Access Full Forensic Capital Archive & Sync Registry
          </button>
        </div>
      </div>
      <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </div>
  );
}
