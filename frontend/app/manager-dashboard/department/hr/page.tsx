'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserMinus,
  Download,
  Search,
  Menu,
  BarChart3,
  Activity,
  Shield,
  MoreVertical,
  TrendingUp,
  Briefcase,
  User,
  Building,
  Award,
  GraduationCap,
  Star,
  Target,
  ChevronRight,
  Filter,
  CreditCard,
  Clock
} from 'lucide-react';
import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';


interface HRStats {
  totalEmployees: string;
  newHires: string;
  departures: string;
  openPositions: number;
}

interface HRPayment {
  id: string;
  amount: string;
  status: 'approved' | 'pending' | 'rejected';
  dueDate: string;
  description: string;
}

interface RecentInitiative {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  deadline: string;
  progress: number;
  involvedEmployees: number;
  priority: 'low' | 'medium' | 'high';
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'employee' | 'recruitment' | 'performance' | 'compliance';
  icon: React.ComponentType<{ className?: string }>;
}

interface ToolUsage {
  name: string;
  usage: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

// Recruitment related interfaces
interface Application {
  id: string;
  candidateName: string;
  role: string;
  status: string;
  appliedDate: string;
  score: number;
}

interface Vacancy {
  _id: string;
  title: string;
  department: string;
  status: 'open' | 'closed';
  experienceLevel: string;
}

// Simple employee mock for employees tab (replace with real data)
interface Employee {
  id: string;
  uniqueId?: string;
  name: string;
  department: string;
  status: string;
  startDate: string;
  role: string;
  performance: number;
  service: string;
  seniority: string;
}

const HRManagerDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  // HR Manager dashboard data states
  const [hrStats, setHRStats] = useState<HRStats>({
    totalEmployees: '0',
    newHires: '0',
    departures: '0',
    openPositions: 0
  });

  const [hrPayments, setHRPayments] = useState<HRPayment[]>([]);
  const [recentInitiatives, setRecentInitiatives] = useState<RecentInitiative[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [toolUsages, setToolUsages] = useState<ToolUsage[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);

  const [user, setUser] = useState<{ name: string, role: string, department: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          name: decoded.name || 'Manager',
          role: decoded.role || 'Manager',
          department: decoded.department || 'Human Resource'
        });
      } catch (err) {
        console.error('Failed to decode token');
      }
    }
  }, []);

  // Mock data for HR Manager dashboard (typed explicitly to match interfaces)
  const mockHRStats: HRStats = {
    totalEmployees: '150',
    newHires: '12',
    departures: '3',
    openPositions: 5
  };

  const mockHRPayments: HRPayment[] = [
    {
      id: '1',
      amount: '$15,000.00',
      status: 'approved',
      dueDate: '2024-11-15',
      description: 'Q4 Training Program Budget'
    },
    {
      id: '2',
      amount: '$8,500.00',
      status: 'pending',
      dueDate: '2024-12-01',
      description: 'Recruitment Agency Fees'
    },
    {
      id: '3',
      amount: '$21,000.00',
      status: 'rejected',
      dueDate: '2024-10-30',
      description: 'Employee Wellness Initiative'
    },
    {
      id: '4',
      amount: '$4,500.00',
      status: 'approved',
      dueDate: '2024-11-20',
      description: 'Performance Bonus Allocation'
    }
  ];

  const mockRecentInitiatives: RecentInitiative[] = [
    {
      id: '1',
      name: 'Diversity Training Rollout',
      status: 'active',
      deadline: '2024-12-15',
      progress: 75,
      involvedEmployees: 120,
      priority: 'high'
    },
    {
      id: '2',
      name: 'Annual Performance Reviews',
      status: 'completed',
      deadline: '2024-11-10',
      progress: 100,
      involvedEmployees: 150,
      priority: 'medium'
    },
    {
      id: '3',
      name: 'New Hire Onboarding Program',
      status: 'pending',
      deadline: '2024-12-05',
      progress: 20,
      involvedEmployees: 12,
      priority: 'high'
    },
    {
      id: '4',
      name: 'Employee Engagement Survey',
      status: 'active',
      deadline: '2024-11-28',
      progress: 45,
      involvedEmployees: 140,
      priority: 'low'
    }
  ];

  const mockActivityItems: ActivityItem[] = [
    {
      id: '1',
      title: 'Employee Onboarding',
      description: 'New hires for Marketing team completed orientation',
      time: '2 hours ago',
      type: 'employee',
      icon: UserPlus
    },
    {
      id: '2',
      title: 'Performance Review Approved',
      description: 'Q3 reviews for Engineering department finalized',
      time: '1 day ago',
      type: 'performance',
      icon: Award
    },
    {
      id: '3',
      title: 'Recruitment Update',
      description: '5 new applications received for Software Engineer role',
      time: '3 days ago',
      type: 'recruitment',
      icon: GraduationCap
    },
    {
      id: '4',
      title: 'Compliance Check',
      description: 'HR policy updates reviewed and approved',
      time: '1 week ago',
      type: 'compliance',
      icon: Shield
    }
  ];

  const mockToolUsages: ToolUsage[] = [
    { name: 'HRIS System', usage: 88, target: 85, trend: 'up' },
    { name: 'Recruitment Tracker', usage: 95, target: 90, trend: 'up' },
    { name: 'Performance Module', usage: 72, target: 75, trend: 'down' },
    { name: 'Analytics Suite', usage: 82, target: 80, trend: 'stable' }
  ];

  // Mock employees for employees tab (simple placeholder)
  const mockEmployees: Employee[] = [
    {
      id: '1',
      name: 'John Doe',
      department: 'Engineering',
      status: 'active',
      startDate: '2024-01-15',
      role: 'Senior Developer',
      performance: 92,
      service: 'Software Development',
      seniority: 'senior'
    },
    {
      id: '2',
      name: 'Jane Roe',
      department: 'Marketing',
      status: 'active',
      startDate: '2024-03-20',
      role: 'Content Manager',
      performance: 85,
      service: 'NGS',
      seniority: 'senior'
    },
    {
      id: '3',
      name: 'Bob Smith',
      department: 'HR',
      status: 'new',
      startDate: '2024-11-01',
      role: 'Recruiter',
      performance: 0,
      service: 'General',
      seniority: 'junior'
    },
    {
      id: '4',
      name: 'Alice Johnson',
      department: 'Sales',
      status: 'departed',
      startDate: '2023-06-10',
      role: 'Account Executive',
      performance: 78,
      service: 'Software Development',
      seniority: 'junior'
    }
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Handle redirect or error
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        const [statsRes, employeesRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/stats?timeRange=${timeRange}`, config),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/employees?filter=${selectedFilter.toLowerCase()}`, config)
        ]);

        if (statsRes.data.success) {
          const { stats, initiatives, expenses, totalBudgetUsed, activity } = statsRes.data.data;
          setHRStats({
            totalEmployees: stats.totalEmployees.toString(),
            newHires: stats.newHires.toString(),
            departures: stats.departures.toString(),
            openPositions: stats.openPositions
          });
          setTotalBudget(totalBudgetUsed);
          setRecentInitiatives(initiatives.map((i: any) => ({
            id: i._id,
            name: i.name,
            status: i.status,
            deadline: new Date(i.deadline).toLocaleDateString(),
            progress: i.progress,
            involvedEmployees: i.involvedEmployeesCount || i.involvedEmployees?.length || 0,
            priority: i.priority
          })));
          setToolUsages(mockToolUsages);

          // Map expenses to hrPayments interface format
          setHRPayments(expenses.map((e: any) => ({
            id: e._id,
            amount: `₹${e.totalAmount.toLocaleString()}`,
            status: 'approved', // Expenses are usually approved/paid
            dueDate: new Date(e.receiptDate).toLocaleDateString(),
            description: e.description || e.category
          })));

          // Map string icon names to components
          const iconMap: { [key: string]: any } = {
            'UserPlus': UserPlus,
            'UserMinus': UserMinus,
            'Award': Award,
            'Shield': Shield,
            'Activity': Activity,
            'GraduationCap': GraduationCap
          };

          setActivityItems(activity.map((a: any) => ({
            ...a,
            time: new Date(a.time).toLocaleString(), // Better time format
            icon: iconMap[a.icon] || Activity
          })));
        }

        if (employeesRes.data.success) {
          setEmployees(employeesRes.data.data.map((emp: any) => ({
            ...emp,
            startDate: new Date(emp.startDate).toLocaleDateString()
          })));
        }

        // Fetch Recruitment data
        const recruitmentRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/recruitment`, config);
        if (recruitmentRes.data.success) {
          setVacancies(recruitmentRes.data.data.vacancies);
          const mappedApps = recruitmentRes.data.data.applications.map((app: any) => ({
            id: app.id,
            candidateName: app.candidateName,
            role: app.role,
            status: app.status,
            appliedDate: new Date(app.appliedDate).toLocaleDateString(),
            score: app.score
          }));
          setApplications(mappedApps);
        }

      } catch (error) {
        console.warn('API unavailable – falling back to mock data:', error);
        // Populate all state with mock data so the page is still usable
        setHRStats(mockHRStats);
        setHRPayments(mockHRPayments);
        setRecentInitiatives(mockRecentInitiatives);
        setActivityItems(mockActivityItems);
        setToolUsages(mockToolUsages);
        setEmployees(mockEmployees);
        setVacancies([
          { _id: '1', title: 'Senior Software Engineer', department: 'Engineering', status: 'open', experienceLevel: 'Senior' },
          { _id: '2', title: 'HR Business Partner', department: 'Human Resource', status: 'open', experienceLevel: 'Mid-level' },
          { _id: '3', title: 'Data Analyst', department: 'Analytics', status: 'open', experienceLevel: 'Junior' },
        ]);
        setApplications([
          { id: 'a1', candidateName: 'Arjun Mehta', role: 'Senior Software Engineer', status: 'reviewed', appliedDate: '2024-11-10', score: 88 },
          { id: 'a2', candidateName: 'Priya Sharma', role: 'HR Business Partner', status: 'pending', appliedDate: '2024-11-12', score: 74 },
          { id: 'a3', candidateName: 'Rahul Verma', role: 'Data Analyst', status: 'hired', appliedDate: '2024-11-08', score: 92 },
        ]);
        setTotalBudget(48500);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeRange, selectedFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredInitiatives = recentInitiatives.filter(initiative =>
    initiative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    initiative.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-slate-500 font-bold animate-pulse">Loading HR Overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">HR Dashboard</h1>
          <p className="text-slate-500 font-medium mt-2">Manage employees, recruitment, performance, and compliance in one place.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* <LeaveRequestWidget onSuccess={() => { }} /> */}

          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-95">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 flex flex-wrap gap-1">
        {[
          { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { key: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
          { key: 'recruitment', label: 'Recruitment', icon: <UserPlus className="w-4 h-4" /> },
          { key: 'performance', label: 'Performance', icon: <Award className="w-4 h-4" /> },
          { key: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Total Employees',
                value: hrStats.totalEmployees,
                change: 2.3,
                icon: <Users className="w-6 h-6" />,
                color: 'bg-emerald-500',
                textColor: 'text-emerald-500',
                bgColor: 'bg-emerald-50',
                description: 'Current workforce size'
              },
              {
                title: 'New Hires',
                value: hrStats.newHires,
                change: 15.7,
                icon: <UserPlus className="w-6 h-6" />,
                color: 'bg-blue-500',
                textColor: 'text-blue-500',
                bgColor: 'bg-blue-50',
                description: 'Recent onboarding'
              },
              {
                title: 'Departures',
                value: hrStats.departures,
                change: -1.2,
                icon: <UserMinus className="w-6 h-6" />,
                color: 'bg-amber-500',
                textColor: 'text-amber-500',
                bgColor: 'bg-amber-50',
                description: 'Voluntary/involuntary exits'
              },
              {
                title: 'Open Positions',
                value: `${hrStats.openPositions}`,
                change: 8.4,
                icon: <Briefcase className="w-6 h-6" />,
                color: 'bg-rose-500',
                textColor: 'text-rose-500',
                bgColor: 'bg-rose-50',
                description: 'Active job requisitions'
              }
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.textColor}`}>
                    {stat.icon}
                  </div>
                  <div className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 ${stat.change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {stat.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                    {Math.abs(stat.change)}%
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.title}</h3>
                  <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-400">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Initiatives */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Recent Initiatives</h3>
                  <p className="text-slate-500 text-sm font-medium">Track ongoing HR projects and goals</p>
                </div>
                <div className="relative group">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all w-48 focus:w-64"
                  />
                </div>
              </div>
              <div className="space-y-4">
                {filteredInitiatives.length > 0 ? filteredInitiatives.map((initiative) => (
                  <div
                    key={initiative.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:border-emerald-100 hover:bg-emerald-50/10 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-5 mb-3 sm:mb-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 text-white transform group-hover:scale-105 transition-transform">
                        <Building className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{initiative.name}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusColor(initiative.status)}`}>
                            {initiative.status}
                          </span>
                          <span className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            <Users className="w-3 h-3 mr-1.5" />
                            {initiative.involvedEmployees} Involved
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getPriorityColor(initiative.priority)}`}>
                        {initiative.priority} Priority
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Due {initiative.deadline}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-slate-400">
                    <p>No initiatives found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Budget</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Financial Overview</p>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {hrPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${payment.status === 'approved' ? 'bg-emerald-500' :
                        payment.status === 'pending' ? 'bg-amber-400' : 'bg-rose-500'
                        } group-hover:scale-y-125 transition-transform`}></div>
                      <div>
                        <span className="block font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{payment.description}</span>
                        <span className="text-xs font-medium text-slate-400">{payment.dueDate}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{payment.amount}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(payment.status).split(' ')[1]}`}>
                        {payment.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm font-medium">Total Spent</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black tracking-tight">₹{totalBudget.toLocaleString()}</div>
                  <div className="mt-2 text-xs font-medium text-slate-400">
                    Across all HR departments
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in transition-all">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Employee Directory</h3>
              <p className="text-slate-500 font-medium text-sm">Manage access, status, and roles</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none cursor-pointer text-sm"
                >
                  <option value="All">All Employees</option>
                  <option value="active">Active</option>
                  <option value="new">New Hires</option>
                  <option value="departed">Departed</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <Link href="/manager-dashboard/department/hr/creation/new-create" className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5 text-sm">
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[520px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Seniority</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Performance</th>
                  <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md text-white font-bold">
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{employee.name}</p>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 rounded">{employee.uniqueId || 'N/A'}</span>
                            <span>•</span>
                            <span>{employee.department}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 uppercase tracking-wide">
                        {employee.service}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border capitalize ${employee.seniority === 'senior' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {employee.seniority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium capitalize">{employee.role}</td>
                    <td className="py-4 px-6">
                      <div className="w-full max-w-[100px]">
                        <div className="flex justify-between text-xs mb-1 font-bold text-slate-600">
                          <span>{employee.performance}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${employee.performance > 80 ? 'bg-emerald-500' : employee.performance > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${employee.performance}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/hr/dashboard/employee/${employee.id}/toggle-status`, {}, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              // Refresh data
                              window.location.reload();
                            } catch (error) {
                              console.error('Error toggling status:', error);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${employee.status === 'active'
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-transparent hover:border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-transparent hover:border-emerald-200'
                            }`}
                        >
                          {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recruitment' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in fade-in transition-all">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900">Recruitment Pipeline</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Manage active vacancies and applications</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{applications.length} Active Applicants</span>
              <Link
                href="/manager-dashboard/department/hr/recruitment"
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
              >
                <Briefcase className="w-4 h-4" />
                View Full Portal
              </Link>
            </div>
          </div>
          <div className="space-y-8">
            {/* Vacancies Summary */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Top Vacancies</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vacancies.slice(0, 3).map((vacancy) => (
                  <div key={vacancy._id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:bg-white hover:shadow-xl hover:border-emerald-100 hover:-translate-y-1 transition-all group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">{vacancy.title}</h4>
                        <p className="text-sm font-medium text-slate-500">{vacancy.department}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${vacancy.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {vacancy.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{vacancy.experienceLevel}</span>
                      </div>
                      <Link href={`/manager-dashboard/department/hr/recruitment/${vacancy._id}`} className="text-sm text-emerald-600 hover:text-emerald-700 font-bold flex items-center group/link">
                        Details <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications Table */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Applications</h4>
              {applications.length > 0 ? (
                applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:shadow-md transition-all group mb-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ring-4 ring-offset-2 ${app.status === 'hired' ? 'bg-emerald-500 ring-emerald-100' :
                        app.status === 'pending' ? 'bg-amber-400 ring-amber-100' : 'bg-rose-500 ring-rose-100'
                        } group-hover:scale-110 transition-transform`}></div>
                      <div>
                        <h5 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{app.candidateName}</h5>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">{app.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${app.status === 'hired' ? 'bg-emerald-100 text-emerald-700' : app.status === 'reviewed' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {app.status}
                      </span>
                      <div className="text-right min-w-[80px]">
                        <p className="font-black text-slate-900 text-lg">{app.score}%</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Score</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-200">
                    <GraduationCap className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">No active applications found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in transition-all">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><BarChart3 className="w-5 h-5" /></div>
              Performance Metrics
            </h3>
            <div className="space-y-8">
              {toolUsages.map((tool, index) => (
                <div key={index} className="space-y-3 group">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{tool.name}</span>
                    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                      <span className="font-black text-slate-900">{tool.usage}%</span>
                      {getTrendIcon(tool.trend)}
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${tool.usage >= tool.target ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                        }`}
                      style={{ width: `${tool.usage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-400">
                    <span>Current Usage</span>
                    <span>Target: {tool.target}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><Target className="w-5 h-5" /></div>
              Upcoming Reviews
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Engineering Team Q4 Review', icon: BarChart3, rating: 4.2, date: 'Nov 15' },
                { name: 'Sales Performance Check-in', icon: Target, rating: 4.7, date: 'Nov 18' },
                { name: 'HR Policy Alignment', icon: Shield, rating: 4.5, date: 'Nov 22' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all group shadow-sm hover:shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 text-white transform group-hover:rotate-3 transition-transform">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(item.rating) ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                        ))}
                        <span className="text-xs font-bold text-slate-400 ml-1">{item.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-400 mb-2">Due {item.date}</span>
                    <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in fade-in transition-all">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Activity className="w-5 h-5" /></div>
            Recent HR Activity
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pr-2">
            {activityItems.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start md:items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-emerald-100 hover:shadow-md transition-all group cursor-default"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{activity.title}</p>
                    <p className="text-sm font-medium text-slate-500 mt-1">{activity.description}</p>
                  </div>
                </div>
                <div className="text-right pl-4 border-l border-slate-100 ml-4 hidden md:block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activity.time}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{activity.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HRManagerDashboard;
