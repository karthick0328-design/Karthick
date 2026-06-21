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
  MoreVertical
} from 'lucide-react';

// Import the Header and SidebarAdmin components
import Header from '../adminCompontent/Header'; // Adjust path as needed
import SidebarAdmin from '../adminCompontent/sidebarAdmin'; // Adjust path as needed
import { jwtDecode } from 'jwt-decode';

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

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [statsData, setStatsData] = useState<StatsCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        try {
          const decoded: any = jwtDecode(token);
          setUserRole(decoded.role?.toLowerCase() || '');
        } catch (error) {
          console.error('Error decoding token:', error);
        }

        const res = await fetch(`http://localhost:5000/api/adminassignments/dashboard?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('API error');
        
        const result = await res.json();
        if (result.success && result.data) {
          const { statsData: beStats, recentActivities: beActivities, platformData: bePlatform } = result.data;
          
          const mapIcon = (iconStr: string) => {
            switch(iconStr) {
               case 'Users': return <Users className="w-6 h-6" />;
               case 'BookOpen': return <BookOpen className="w-6 h-6" />;
               case 'DollarSign': return <DollarSign className="w-6 h-6" />;
               case 'TrendingUp': return <TrendingUp className="w-6 h-6" />;
               default: return <Activity className="w-6 h-6" />;
            }
          };

          const mappedStats = beStats.map((s: any) => ({
             ...s,
             icon: mapIcon(s.icon)
          }));

          setStatsData(mappedStats);
          setRecentActivities(beActivities || []);
          setPlatformData(bePlatform || []);
        }
      } catch (err) {
        console.error("Failed to fetch admin dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [timeRange]);

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
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
        {/* Header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Dashboard Content */}
        <main className="p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {userRole === 'superadmin' ? 'Super Admin Overview' : 'Dashboard Overview'}
                </h1>
                <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your platform today.</p>
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
                  <span>Export</span>
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
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    stat.change >= 0 
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
                  <h3 className="text-lg font-semibold text-gray-900">Platform Performance</h3>
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
                    <p className="text-sm text-gray-400">User growth, revenue trends, engagement metrics</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Distribution */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Usage</h3>
              
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
                  <span className="text-gray-600">Total Sessions</span>
                  <span className="font-semibold text-gray-900">84,292</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Avg. Duration</span>
                  <span className="font-semibold text-gray-900">4m 12s</span>
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
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
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
              {/* System Status */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                
                <div className="space-y-3">
                  {[
                    { label: 'Web Server', status: 'operational', value: '100%' },
                    { label: 'Database', status: 'operational', value: '99.9%' },
                    { label: 'API Services', status: 'degraded', value: '95.2%' },
                    { label: 'CDN', status: 'operational', value: '100%' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${
                        item.status === 'operational' ? 'text-green-600' : 'text-yellow-600'
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
                    { icon: Users, label: 'Add New User' },
                    { icon: BookOpen, label: 'Create Course' },
                    { icon: DollarSign, label: 'View Reports' },
                    { icon: Settings, label: 'System Settings' },
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

export default AdminDashboard;