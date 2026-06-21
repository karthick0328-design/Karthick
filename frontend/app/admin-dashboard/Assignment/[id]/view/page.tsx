// pages/admin/view-user.tsx (or app/admin/view-user/[id]/page.tsx in app router)
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { 
  User, Mail, Building, Phone, Shield, Calendar, 
  Activity, Loader2, ArrowLeft, Edit, Trash2, 
  MapPin, Briefcase, Crown, BadgeCheck, Clock,
  Eye, Key, Users, Settings, Sparkles, MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import Header from '../../../../adminCompontent/Header';
import Sidebar from '../../../../adminCompontent/sidebarAdmin';

interface UserData {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  department: string;
  subadminCategory: string[];
  isActive: boolean;
  isVerified: boolean;
  isPasswordSet: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

const ViewInternalUser = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'admin') {
      router.push('/Login/Signin');
      toast.error('Access denied. Admin only.');
      return;
    }

    if (!id || id === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError('Invalid user ID provided. Please check the URL.');
      setLoading(false);
      toast.error('Invalid user ID');
      return;
    }

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/adminassignments/internal-users/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.status === 200 && response.data.success) {
          setUser(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to fetch user');
        }
      } catch (err: unknown) {
        let errorMessage = 'An unexpected error occurred';
        if (err instanceof AxiosError) {
          if (err.response?.status === 404) {
            errorMessage = 'User not found';
          } else if (err.response?.status === 400) {
            errorMessage = 'Invalid user ID';
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          }
        }
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/adminassignments/internal-users/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User deleted successfully');
      router.push('/admin-dashboard');
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response) {
        toast.error(err.response.data.message || 'Failed to delete user');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'subadmin': return Crown;
      case 'head': return User;
      case 'manager': return Users;
      case 'tl': return Users;
      case 'team manager': return Users;
      default: return Briefcase;
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/60">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Loading User Details</h3>
              <p className="text-gray-600">Please wait while we fetch the user information...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <main className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="max-w-md mx-auto text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/60">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">User Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'User not found'}</p>
              <Link 
                href="/admin-dashboard" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(user.role);
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'details', label: 'Details', icon: User },
    { id: 'permissions', label: 'Permissions', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: 'bg-white border border-gray-200 shadow-xl',
          duration: 4000,
        }}
      />
      
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`transition-all duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/admin-dashboard"
                    className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 flex items-center justify-center hover:bg-white transition-all shadow-lg hover:shadow-xl"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
                    <p className="text-gray-600">View and manage user details</p>
                  </div>
                </div>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* User Profile Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 p-8 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      {user.isActive && (
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                          <BadgeCheck className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{user.name || 'Unnamed User'}</h2>
                        <p className="text-gray-600">{user.email}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-xl">
                          <RoleIcon className="w-4 h-4" />
                          <span className="font-medium capitalize">{user.role}</span>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-xl">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">{user.branch}</span>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-xl">
                          <Building className="w-4 h-4" />
                          <span className="font-medium">{user.department || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/admin-dashboard/Assignment/${user._id}/edit`}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                    >
                      {deleteLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200/60">
                    <div className="flex space-x-1 p-6 pb-0">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Personal Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              <User className="w-5 h-5 mr-2 text-blue-500" />
                              Personal Information
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Full Name</span>
                                <span className="font-medium text-gray-900">{user.name || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Email</span>
                                <span className="font-medium text-gray-900">{user.email}</span>
                              </div>
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Phone</span>
                                <span className="font-medium text-gray-900">{user.phone || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Work Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
                              Work Information
                            </h3>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Role</span>
                                <span className="font-medium text-gray-900 capitalize">{user.role}</span>
                              </div>
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Department</span>
                                <span className="font-medium text-gray-900">{user.department || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center p-4 bg-gray-50/50 rounded-xl">
                                <span className="text-sm text-gray-600">Branch</span>
                                <span className="font-medium text-gray-900">{user.branch}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Account Status */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-blue-500" />
                            Account Status
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-50/50 rounded-xl text-center">
                              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${getStatusColor(user.isActive)}`}>
                                {user.isActive ? <BadgeCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                              </div>
                              <p className="text-sm text-gray-600">Status</p>
                              <p className={`font-semibold ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-xl text-center">
                              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${getStatusColor(user.isVerified)}`}>
                                <BadgeCheck className="w-6 h-6" />
                              </div>
                              <p className="text-sm text-gray-600">Verified</p>
                              <p className={`font-semibold ${user.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                                {user.isVerified ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-xl text-center">
                              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${getStatusColor(user.isPasswordSet)}`}>
                                <Key className="w-6 h-6" />
                              </div>
                              <p className="text-sm text-gray-600">Password Set</p>
                              <p className={`font-semibold ${user.isPasswordSet ? 'text-green-600' : 'text-red-600'}`}>
                                {user.isPasswordSet ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-xl text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-2">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <p className="text-sm text-gray-600">Member Since</p>
                              <p className="font-semibold text-gray-900">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details Tab */}
                    {activeTab === 'details' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                            <div className="space-y-3">
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Unique ID</p>
                                <p className="font-mono font-medium text-gray-900">{user.uniqueId}</p>
                              </div>
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Email Address</p>
                                <p className="font-medium text-gray-900">{user.email}</p>
                              </div>
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                                <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
                            <div className="space-y-3">
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Account Created</p>
                                <p className="font-medium text-gray-900">
                                  {new Date(user.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                                <p className="font-medium text-gray-900">
                                  {new Date(user.updatedAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-4 bg-gray-50/50 rounded-xl">
                                <p className="text-sm text-gray-600 mb-1">Last Login</p>
                                <p className="font-medium text-gray-900">
                                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never logged in'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Role & Permissions</h3>
                          <div className="p-6 bg-gray-50/50 rounded-xl">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <RoleIcon className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 capitalize">{user.role}</h4>
                                <p className="text-sm text-gray-600">Assigned role with specific permissions</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {user.subadminCategory && user.subadminCategory.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Subadmin Categories</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {user.subadminCategory.map((cat, index) => (
                                <div key={index} className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl text-center">
                                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                    <Settings className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <p className="font-medium text-purple-900">{cat}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href={`/admin-dashboard/Assignment/${user._id}/edit`}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Edit Profile</span>
                    </Link>
                    <Link
                      href={`/admin-dashboard/Assignment/${user._id}/history`}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                    >
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">View Activity</span>
                    </Link>
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50/50 transition-all text-red-600"
                    >
                      {deleteLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">Delete User</span>
                    </button>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">System Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">User ID</span>
                      <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {user._id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Unique ID</span>
                      <span className="text-sm font-medium text-gray-900">{user.uniqueId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Database ID</span>
                      <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {user._id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ViewInternalUser;