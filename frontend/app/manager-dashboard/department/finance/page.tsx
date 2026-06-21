'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Users,
  Clock,
  ArrowRight,
  PieChart,
  Wallet,
  BarChart3,
  Calendar,
  Filter,
  MoreHorizontal,
  ChevronRight,
  Building2,
  Bell,
  TrendingDown,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

interface UserType {
  _id: string;
  name: string;
  email: string;
  uniqueId: string;
  department: string;
  role: string;
}

interface Project {
  _id: string;
  uniqueId: string;
  userId: {
    name: string;
    email: string;
  };
  quotedAmount: number;
  paymentDetails?: {
    paidAmount: number;
  };
  financialReview?: {
    status: string;
    requestedAmount: number;
    requestedAt: string;
  };
  createdAt: string;
  paidAt?: string;
  status: string;
}

// --- Constants ---
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

export default function FinanceManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login/Signin');
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      setUser({
        _id: decoded._id || decoded.id,
        name: decoded.name || 'Manager',
        email: decoded.email,
        uniqueId: decoded.uniqueId,
        department: decoded.department,
        role: decoded.role
      });
      fetchDashboardData(token);
    } catch (err) {
      router.push('/Login/Signin');
    }
  }, [router]);

  const fetchDashboardData = async (token: string) => {
    setLoading(true);
    try {
      console.log(`[Finance Dashboard] Fetching data from ${API_BASE}...`);

      const fetchOptions = {
        mode: 'cors' as const,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };

      const [reviewsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/financial/reviews`, fetchOptions),
        fetch(`${API_BASE}/financial/all-payments`, fetchOptions)
      ]).catch(err => {
        console.error('[Finance Dashboard] Network/Fetch error:', err);
        throw new Error('Network failure. Please check if the server is running and CORS is allowed.');
      });

      if (!reviewsRes.ok) {
        const errText = await reviewsRes.text();
        console.error(`[Finance Dashboard] Reviews API error (${reviewsRes.status}):`, errText);
        throw new Error(`Reviews API error: ${reviewsRes.status}`);
      }

      if (!paymentsRes.ok) {
        const errText = await paymentsRes.text();
        console.error(`[Finance Dashboard] Payments API error (${paymentsRes.status}):`, errText);
        throw new Error(`Payments API error: ${paymentsRes.status}`);
      }

      const reviewsData = await reviewsRes.json();
      const paymentsData = await paymentsRes.json();

      if (reviewsData.success) {
        setProjects(reviewsData.data || []);
      } else {
        toast.error(reviewsData.message || 'Failed to load reviews');
      }

      if (paymentsData.success) {
        setPayments(paymentsData.data || []);
      } else {
        toast.error(paymentsData.message || 'Failed to load payments');
      }

    } catch (err: any) {
      console.error('[Finance Dashboard] Comprehensive Error:', err);
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paymentDetails?.paidAmount || 0), 0);
    const pendingReviews = projects.filter(p => p.financialReview?.status === 'Pending').length;
    const totalBudgetRequests = projects.reduce((sum, p) => sum + (p.financialReview?.requestedAmount || 0), 0);

    return {
      totalRevenue,
      pendingReviews,
      totalBudgetRequests,
      activeProjects: payments.length
    };
  }, [projects, payments]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result: { m: string, v: number, month: number, year: number }[] = [];

    // Initialize last 7 months
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        m: months[d.getMonth()],
        v: 0,
        month: d.getMonth(),
        year: d.getFullYear()
      });
    }

    payments.forEach(p => {
      // Use paidAt if available, as it represents ACTUAL revenue timing. Fallback to createdAt.
      const dateSource = p.paidAt || p.createdAt;
      const pDate = new Date(dateSource);
      const amount = p.paymentDetails?.paidAmount || 0;

      result.forEach(r => {
        if (pDate.getMonth() === r.month && pDate.getFullYear() === r.year) {
          r.v += amount;
        }
      });
    });

    const maxVal = Math.max(...result.map(r => r.v), 1);
    return result.map(r => ({
      ...r,
      height: (r.v / (maxVal * 1.2)) * 100, // 20% headroom
      displayVal: r.v
    }));
  }, [payments]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full shadow-xl"
          />
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Accessing Financial Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <Toaster position="top-right" />

      {/* Hero Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StatCard
          title="Consolidated Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          trend="+12.5%"
          icon={<TrendingUp />}
          color="text-emerald-500"
          bgColor="bg-emerald-50"
          delay={0}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          trend={`${stats.pendingReviews > 5 ? 'Priority' : 'Stable'}`}
          icon={<Clock />}
          color="text-amber-500"
          bgColor="bg-amber-50"
          delay={0.1}
        />
        <StatCard
          title="Project Liquidity"
          value={`$${stats.totalBudgetRequests.toLocaleString()}`}
          trend="Reserve Cap"
          icon={<Wallet />}
          color="text-indigo-500"
          bgColor="bg-indigo-50"
          delay={0.2}
        />
        <StatCard
          title="Active Contracts"
          value={stats.activeProjects}
          trend="Ongoing"
          icon={<Briefcase />}
          color="text-blue-500"
          bgColor="bg-blue-50"
          delay={0.3}
        />
      </section>

      {/* Main Analytics Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Revenue Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 space-y-10"
        >
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Revenue Performance</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monthly Financial Trajectory • USD</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/manager-dashboard/department/finance/analytics')}
                  className="px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  Full Intelligence Hub
                </button>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Monthly</button>
                  <button className="px-4 py-2 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Quarterly</button>
                </div>
              </div>
            </div>

            <div className="h-80 w-full relative">
              <div className="absolute inset-0 flex flex-col justify-between py-2">
                {[4, 3, 2, 1, 0].map(i => (
                  <div key={i} className="w-full flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-300 w-12">$ {i * 25}k</span>
                    <div className="flex-1 h-px bg-slate-50 group-hover:bg-slate-100 transition-colors"></div>
                  </div>
                ))}
              </div>

              {/* Trend Line & Data Points SVG */}
              <div className="absolute inset-0 left-16 right-4 pointer-events-none">
                <svg className="w-full h-full overflow-visible">
                  {/* The Line */}
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                    d={chartData.map((bar, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - bar.height;
                      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                    }).join(' ')}
                    fill="none"
                    stroke="#ff4d4f"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points (Dots) */}
                  {chartData.map((bar, i) => {
                    const x = (i / (chartData.length - 1)) * 100;
                    const y = 100 - bar.height;
                    return (
                      <motion.circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="5"
                        fill="white"
                        stroke="#ff4d4f"
                        strokeWidth="3"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.5 + (i * 0.1), type: "spring", stiffness: 200 }}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="absolute inset-0 left-16 right-4 flex items-end justify-between px-2">
                {chartData.map((bar, i) => (
                  <div key={i} className="flex flex-col items-center gap-4 group/bar w-12">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${bar.height}%` }}
                      transition={{ duration: 1, delay: 0.3 + (i * 0.1), ease: "easeOut" }}
                      className="w-8 bg-slate-100/50 rounded-xl relative group-hover/bar:bg-indigo-50 transition-all duration-500"
                    >
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-xl">
                        $ {bar.displayVal.toLocaleString()}
                      </div>
                    </motion.div>
                    <span className="text-[10px] font-black text-slate-400 group-hover/bar:text-indigo-600 transition-colors uppercase">{bar.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Ledger Entries */}
          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-10 pb-10 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Ledger Entries</h3>
              <button onClick={() => router.push('/manager-dashboard/department/finance/requested-services')} className="group flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:gap-4 transition-all">
                Full Audit Trail <ArrowRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody>
                  {payments.slice(0, 5).map((item, idx) => (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (idx * 0.1) }}
                      className="group hover:bg-slate-50 rounded-3xl transition-colors"
                    >
                      <td className="py-6 pr-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{item.uniqueId}</p>
                            <p className="text-sm font-black text-slate-900">{item.userId.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Value</p>
                          <p className="text-lg font-black text-emerald-600 tracking-tighter">+${(item.paymentDetails?.paidAmount || 0).toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col gap-1 items-end">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{new Date(item.paidAt || item.createdAt).toLocaleDateString()}</p>
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">SETTLED</span>
                        </div>
                      </td>
                      <td className="py-6 pl-6 text-right">
                        <button className="p-3 bg-slate-50 text-slate-300 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Intelligence Sidebar */}
        <div className="space-y-10">
          {/* Quick Actions Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
              <Building2 size={160} />
            </div>
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-10 relative z-10">Department Core</h4>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <Shortcut label="Salaries" icon={<Users className="w-5 h-5" />} href="/manager-dashboard/department/finance/salary" />
              <Shortcut label="Payments" icon={<DollarSign className="w-5 h-5" />} href="/manager-dashboard/department/finance/service" />
              <Shortcut label="Purchases" icon={<Briefcase className="w-5 h-5" />} href="/manager-dashboard/department/finance/purchase" />
              <Shortcut label="Cash Book" icon={<Wallet className="text-emerald-400 w-5 h-5" />} href="/manager-dashboard/department/finance/cashbook" />
              <Shortcut label="GST Report" icon={<FileText className="text-blue-400 w-5 h-5" />} href="/manager-dashboard/department/finance/gst-report" />
              <Shortcut label="Analytics" icon={<BarChart3 className="w-5 h-5" />} href="/manager-dashboard/department/finance/analytics" />
            </div>
          </motion.div>



          {/* Notifications/Intelligence Pod */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-200"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Bell size={24} />
              </div>
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">3 Alerts</span>
            </div>
            <h4 className="text-xl font-black mb-4">Financial Intelligence</h4>
            <p className="text-sm font-medium text-indigo-100 leading-relaxed opacity-80 mb-8">3 budget requests are awaiting your executive review to release department funds.</p>
            <button onClick={() => router.push('/manager-dashboard/department/finance/requested-services')} className="w-full py-4 bg-white text-indigo-600 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:-translate-y-1 transition-transform font-bold">Executive Review Pool</button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// --- Helper UI Components ---

function StatCard({ title, value, trend, icon, color, bgColor, delay }: any) {
  const isPositive = trend.startsWith('+');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="relative overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-200/50 group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${bgColor} opacity-[0.4] group-hover:scale-125 transition-transform duration-700 pointer-events-none`} />
      <div className="relative flex items-center justify-between">
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <div>
            <h3 className={`text-4xl font-black tracking-tighter ${color} mb-2`}>{value}</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              {isPositive ? <ArrowUpRight size={12} /> : null}
              {trend}
            </span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${color} ${bgColor} group-hover:rotate-12 shadow-inner`}>
          {React.cloneElement(icon, { size: 28 })}
        </div>
      </div>
    </motion.div>
  );
}

function Shortcut({ label, icon, href }: any) {
  const router = useRouter();
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push(href)}
      className="flex flex-col items-center gap-4 p-8 bg-white/5 hover:bg-white text-white hover:text-indigo-900 rounded-[2.5rem] transition-all duration-500 border border-white/10 hover:border-transparent group"
    >
      <div className="transition-transform group-hover:rotate-12">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </motion.button>
  );
}

