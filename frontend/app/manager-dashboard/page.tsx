'use client';
import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Eye,
  Download,
  Filter,
  Search,
  Bell,
  Settings,
  Menu,
  Calendar,
  MessageCircle,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Globe,
  Smartphone,
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Users2, // For team size
  FileText, // For projects
  Target, // For goals
  LayoutDashboard
} from 'lucide-react';

// Import the Header and SidebarManager components
import Header from '../Manager-Compontent/sales/salesheader/Header'; // Adjust path as needed
import SidebarManager from '../Manager-Compontent/sales/salesheader/Sidebar'; // Adjust path as needed

import { useParams, usePathname, useRouter } from 'next/navigation';

interface StatsCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  avatar: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

const ManagerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>({ name: 'Manager', role: 'manager' });

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Auto-redirect to department/service/seniority-specific dashboard (matching Signin pattern)
        if (parsedUser.role) {
          const role = (parsedUser.role || '').toLowerCase();
          const department = parsedUser.department || '';
          const service = parsedUser.service || '';
          const seniority = parsedUser.seniority || null;

          console.log('🔍 Manager Dashboard - Auto-redirect check');
          console.log('  Role:', role);
          console.log('  Department:', department);
          console.log('  Service:', service);
          console.log('  Seniority:', seniority);
          console.log('  Current path:', pathname);

          // Only redirect if we're on the root manager dashboard
          if (pathname === '/manager-dashboard') {
            // normalizeToSlug function (matching Signin page)
            const normalizeToSlug = (input: string) => {
              if (!input) return '';
              return input
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9\s&]/g, '')
                .replace(/\s+/g, '-')
                .replace(/&/g, '-and-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            };

            const userDeptSlug = normalizeToSlug(department);
            const userServiceSlug = normalizeToSlug(service);
            const userSenioritySlug = seniority ? normalizeToSlug(seniority) : '';

            // Slug mappings (matching Signin page)
            const slugMappings: Record<string, string> = {
              // Departments
              'sales-and-customer-services': 'sale',
              'human-resources': 'hr',
              'financial': 'finance',
              'finance-department': 'finance',
              // Services
              'ngs': 'ngs',
              'drug-discovery': 'drug-discovery',
              'software-development': 'software-development',
              'microbiology': 'microbiology',
              'biochemistry': 'biochemistry',
              'molecular-biology': 'molecular-biology',
            };

            let path = '';

            // Build path exactly like Signin page
            if (userDeptSlug) {
              const mappedDept = slugMappings[userDeptSlug] || userDeptSlug;
              path = `/department/${mappedDept}`;
              if (userServiceSlug && role !== 'subadmin') { // subadmin forbids service
                const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
                path += `/service/${mappedService}`;
              }
            } else if (userServiceSlug) {
              const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
              path = `/service/${mappedService}`;
            }

            // Append seniority for employee role (following Signin pattern)
            if (role === 'employee' && userSenioritySlug) {
              path += `/seniority/${userSenioritySlug}`;
            }

            const redirectPath = `/manager-dashboard${path}`;

            if (path) {
              console.log('  ✓ Redirecting to:', redirectPath);
              router.push(redirectPath);
            } else {
              console.log('  ✗ No path built, staying on generic dashboard');
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/Login');
  };

  const services = [
    { name: 'Dashboard', path: '/manager-dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/manager-dashboard/projects', icon: FileText },
    { name: 'Team', path: '/manager-dashboard/team', icon: Users2 },
    { name: 'Reports', path: '/manager-dashboard/reports', icon: BarChart3 },
    { name: 'Settings', path: '/manager-dashboard/settings', icon: Settings }
  ];


  // Get department from URL params (e.g., /manager-dashboard/ngs)
  const params = useParams();
  const departmentSlug = params?.department as string || 'overview';
  const departmentName = departmentSlug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()); // e.g., 'ngs' → 'Ngs', 'drug-discovery' → 'Drug Discovery'

  // Mock data - in real app, this would come from API filtered by department
  const statsData: StatsCard[] = [
    {
      title: 'Team Members',
      value: '24',
      change: 4.2,
      icon: <Users2 className="w-6 h-6" />,
      color: 'bg-blue-500',
      description: `Active in ${departmentName}`
    },
    {
      title: 'Projects',
      value: '12',
      change: -2.1,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-green-500',
      description: 'Ongoing initiatives'
    },
    {
      title: 'Department Revenue',
      value: '$18.5K',
      change: 15.8,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-purple-500',
      description: 'This quarter'
    },
    {
      title: 'Goal Completion',
      value: '78.4%',
      change: 9.3,
      icon: <Target className="w-6 h-6" />,
      color: 'bg-orange-500',
      description: 'Quarterly targets'
    }
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      user: 'John Doe (TL)',
      action: `Assigned NGS sequencing task to team`,
      time: '2 min ago',
      type: 'success',
      avatar: 'JD'
    },
    {
      id: '2',
      user: 'Jane Smith (Employee)',
      action: 'Completed Drug Discovery report',
      time: '15 min ago',
      type: 'info',
      avatar: 'JS'
    },
    {
      id: '3',
      user: 'Bob Wilson (Team Member)',
      action: 'Microbiology experiment delayed - equipment issue',
      time: '1 hour ago',
      type: 'warning',
      avatar: 'BW'
    },
    {
      id: '4',
      user: 'Alice Green',
      action: 'Reviewed Software Development sprint',
      time: '2 hours ago',
      type: 'success',
      avatar: 'AG'
    },
    {
      id: '5',
      user: 'Charlie Brown',
      action: `Updated Bio-Chemistry inventory`,
      time: '3 hours ago',
      type: 'info',
      avatar: 'CB'
    }
  ];

  const platformData = [
    { name: 'Lab Work', value: 45, color: 'bg-blue-500' },
    { name: 'Field Research', value: 30, color: 'bg-green-500' },
    { name: 'Data Analysis', value: 25, color: 'bg-purple-500' }
  ];

  useEffect(() => {
    // Simulate loading data (fetch from API with department filter)
    setTimeout(() => setLoading(false), 1000);
  }, [departmentSlug]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAvatarColor = (initials: string) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-pink-500 to-pink-600'
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <SidebarManager
        isSidebarOpen={sidebarOpen}
        pathname={pathname}
        services={services}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="lg:ml-80">
        {/* Header */}
        <Header
          scrolled={scrolled}
          isSidebarOpen={sidebarOpen}
          setIsSidebarOpen={setSidebarOpen}
          user={user}
          pathname={pathname}
          services={services}
        />

        {/* Main Dashboard Content */}
        <main className="pt-16 p-6"> {/* Add pt-16 to account for fixed header */}
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{departmentName} Manager Dashboard</h1>
                <p className="text-gray-600">Welcome back! Here's the latest on your {departmentName.toLowerCase()} team and projects.</p>
              </div>

              <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>

                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-2xl hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.color} bg-opacity-10`}>
                    <div className={stat.color.replace('bg-', 'text-')}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${stat.change >= 0
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                    }`}>
                    <TrendingUp className={`w-3 h-3 ${stat.change >= 0 ? '' : 'rotate-180'}`} />
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-600 font-medium mb-2">{stat.title}</p>
                <p className="text-sm text-gray-500">{stat.description}</p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${stat.color}`}
                      style={{ width: `${Math.min(stat.change * 3, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts and Activities Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Chart Area */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{departmentName} Performance</h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 rounded-xl hover:bg-gray-100">
                      <Filter className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-gray-100">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="h-80 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Interactive chart visualization</p>
                    <p className="text-sm text-gray-400">Team productivity, project timelines, KPI metrics</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Distribution */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Activities</h3>

              <div className="space-y-4">
                {platformData.map((platform, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${platform.color}`}></div>
                      <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${platform.color}`}
                          style={{ width: `${platform.value}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8">{platform.value}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Tasks</span>
                  <span className="font-semibold text-gray-900">156</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Avg. Completion</span>
                  <span className="font-semibold text-gray-900">3d 4h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities and Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activities */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Team Activities</h3>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All
                  </button>
                </div>

                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold ${getAvatarColor(activity.avatar)}`}>
                        {activity.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.user}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {activity.action}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{activity.time}</span>
                        </div>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              {/* Team Status */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Status</h3>

                <div className="space-y-3">
                  {[
                    { label: 'On Track', status: 'operational', value: '18/24' },
                    { label: 'At Risk', status: 'degraded', value: '4/24' },
                    { label: 'On Leave', status: 'operational', value: '2/24' },
                    { label: 'New Hires', status: 'operational', value: '0' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${item.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${item.status === 'operational' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

                <div className="space-y-3">
                  {[
                    { icon: Users2, label: 'Assign Task' },
                    { icon: FileText, label: 'New Project' },
                    { icon: DollarSign, label: 'Budget Review' },
                    { icon: Settings, label: 'Team Settings' },
                  ].map((action, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center space-x-3 p-3 rounded-2xl bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-200"
                    >
                      <action.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ManagerDashboard;