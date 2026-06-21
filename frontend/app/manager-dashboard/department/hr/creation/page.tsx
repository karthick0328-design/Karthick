'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Building, Phone, Eye, Edit, Trash2, Search,
  Filter, ChevronDown, ChevronUp, Loader2, BadgeCheck,
  Activity, ArrowRight, ArrowLeft, MoreHorizontal, CheckCircle,
  Beaker, Award, Plus, Sparkles, ShieldCheck, Users,
  Briefcase, Calendar, UserCheck, Key, Menu
} from 'lucide-react';
import Link from 'next/link';
import { validateURL } from '@/lib/validation';




interface User {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  branch: string;
  service?: string;
  seniority?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  profileImage?: string;
}

const allowedRoles = [
  { value: 'subadmin', label: 'Administrator', icon: ShieldCheck, color: 'text-gray-700', bg: 'bg-gray-100' },
  { value: 'head', label: 'Department Head', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: 'tl', label: 'Team Lead', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { value: 'employee', label: 'Employee', icon: User, color: 'text-gray-600', bg: 'bg-gray-100' },
];

const roleOrder = ['subadmin', 'head', 'manager', 'tl', 'employee'];

const departments = [
  { name: 'Sales and Customer Services', icon: Activity, color: 'bg-blue-50 text-blue-700', badgeColor: 'bg-blue-100 text-blue-800' },
  { name: 'Human Resources', icon: Users, color: 'bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-800' },
  { name: 'Financial', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-700', badgeColor: 'bg-emerald-100 text-emerald-800' }
];

const deptToSlug: { [key: string]: string } = {
  'Human Resources': 'hr',
  'Sales and Customer Services': 'sales',
  'Financial': 'financial',
};

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
}

const UsersList = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'dept-only' | 'service-only'>('all');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);

  const normalizeDept = (dept: string) => dept.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const getDeptSlug = (dept: string) => deptToSlug[dept.trim()] || normalizeDept(dept);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login/Signin');
      return;
    }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.');
        router.push('/Login/Signin');
        return;
      }
      const userRole = decoded.role;
      const userDept = (decoded.department || '').trim();

      if (!['subadmin', 'manager', 'head'].includes(userRole)) {
        toast.error('Access denied. Manager-level role required.');
        router.push('/Login/Signin');
        return;
      }
      setCurrentUser({ ...decoded, role: userRole, department: userDept });
      if (userDept && !selectedDepartment) {
        handleSelectDepartment(userDept);
      }
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      router.push('/Login/Signin');
    }
  }, [router]);

  const handleSelectDepartment = (dept: string) => {
    if (!currentUser) return;
    const deptTrim = dept.trim();
    const userDeptTrim = currentUser.department.trim();
    const normalizedSelected = normalizeDept(deptTrim);
    const normalizedUser = normalizeDept(userDeptTrim);
    const isHRPersonnel = (currentUser.role === 'subadmin' || currentUser.role === 'manager' || currentUser.role === 'head') && normalizedUser === 'human-resources';

    if (normalizedSelected === 'human-resources') {
      if (!isHRPersonnel) {
        toast.error('Access denied. HR management requires HR Manager permissions.');
        return;
      }
    } else {
      if (!isHRPersonnel && userDeptTrim !== deptTrim) {
        toast.error(`Access denied. Managing ${deptTrim} staff is restricted.`);
        return;
      }
    }
    setSelectedDepartment(deptTrim);
  };

  const fetchUsers = async () => {
    if (!selectedDepartment || !currentUser) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
        search,
        department: selectedDepartment.trim(),
      });
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/internal-users?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 200) {
        const sanitizedUsers = (response.data.data || []).map((u: any) => ({
          ...u,
          profileImage: u.profileImage ? validateURL(u.profileImage) : undefined
        }));
        setUsers(sanitizedUsers);
      }
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load personnel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDepartment) {
      fetchUsers();
    }
  }, [search, selectedDepartment, currentUser]);

  const filteredUsers = useMemo(() => {
    switch (viewMode) {
      case 'dept-only': return users.filter((u) => !u.service);
      case 'service-only': return users.filter((u) => !!u.service);
      default: return users;
    }
  }, [users, viewMode]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    setDeletingUser(userId);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/delete-user/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 200) {
        toast.success('Staff member deactivated successfully');
        fetchUsers();
      }
    } catch (error: unknown) {
      toast.error('Failed to deactivate staff member');
    } finally {
      setDeletingUser(null);
    }
  };

  const getDashboardPrefix = () => currentUser?.role === 'subadmin' ? 'subadmin' : 'manager';
  const getCreateLink = () => `/${getDashboardPrefix()}-dashboard/department/hr/creation/new-create`;
  const getViewLink = (id: string) => `/${getDashboardPrefix()}-dashboard/department/${getDeptSlug(selectedDepartment)}/creation/${id}/view`;
  const getEditLink = (id: string) => `/${getDashboardPrefix()}-dashboard/department/${getDeptSlug(selectedDepartment)}/creation/${id}/edit`;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">
        {!selectedDepartment ? (
          <motion.div
            key="dept-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Header Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
              >
                <Briefcase className="w-8 h-8" />
              </motion.div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">Department Management</h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Select a department to manage staff directory, roles, and access permissions.
              </p>
            </div>

            {/* Department Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {departments.map((dept, idx) => (
                <motion.div
                  key={dept.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectDepartment(dept.name)}
                  className="group cursor-pointer relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${dept.color.includes('blue') ? 'from-blue-100 to-indigo-100' : dept.color.includes('purple') ? 'from-purple-100 to-fuchsia-100' : 'from-emerald-100 to-teal-100'} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />

                  <div className="relative bg-white border border-slate-200 rounded-3xl p-8 hover:border-transparent hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 h-full flex flex-col justify-between overflow-hidden">
                    {/* Decorative background element */}
                    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 ${dept.color.includes('blue') ? 'bg-blue-600' : dept.color.includes('purple') ? 'bg-purple-600' : 'bg-emerald-600'} group-hover:scale-150 transition-transform duration-500`} />

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl ${dept.color.split(' ')[0]} shadow-sm`}>
                          <dept.icon className={`w-8 h-8 ${dept.color.split(' ')[1]}`} />
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${dept.badgeColor}`}>
                          Active
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-slate-500 font-medium leading-relaxed mb-6">
                        Manage staff profiles, assign roles, and configure departmental settings.
                      </p>
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                      <span className="text-sm font-bold text-slate-400 group-hover:text-slate-600 transition-colors">View Directory</span>
                      <div className={`p-2 rounded-full ${dept.color.includes('blue') ? 'bg-blue-50 text-blue-600' : dept.color.includes('purple') ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'} group-hover:bg-white group-hover:shadow-md transition-all`}>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats Overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3"><Building className="w-6 h-6" /></div>
                  <div className="text-3xl font-black text-slate-800 mb-1">3</div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Active Departments</div>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-3"><CheckCircle className="w-6 h-6" /></div>
                  <div className="text-3xl font-black text-slate-800 mb-1">Active</div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">System Status</div>
                </div>
                <div className="flex flex-col items-center text-center p-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl mb-3"><Activity className="w-6 h-6" /></div>
                  <div className="text-3xl font-black text-slate-800 mb-1">100%</div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Operational Uptime</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="user-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Page Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedDepartment('')}
                  className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shadow-sm">
                    <ArrowLeft size={16} />
                  </div>
                  <span>Back to Departments</span>
                </button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                    {selectedDepartment}
                  </h1>
                  <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                    Manage staff profiles, roles, and access permissions for this department.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={getCreateLink()}
                  className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  <span>Add New Staff</span>
                </Link>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or email..."
                    value={search}
                    onChange={handleSearch}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {['all', 'dept-only', 'service-only'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode as any)}
                      className={`px-5 py-3.5 text-sm font-bold rounded-2xl transition-all border ${viewMode === mode
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      {mode === 'all' ? 'All Staff' : mode === 'dept-only' ? 'Department Only' : 'Service Units'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm font-medium text-slate-500 border-t border-slate-100 pt-4">
                <span>
                  Showing <strong className="text-slate-900">{filteredUsers.length}</strong> active members
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                  <Filter className="w-4 h-4" />
                  <span>Filtered View</span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-bold animate-pulse">Loading staff directory...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">No Staff Found</h3>
                <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
                  We couldn't find any staff members matching your current filters.
                </p>
                <button
                  onClick={() => { setSearch(''); setViewMode('all'); }}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {roleOrder.map((role) => {
                  const roleUsers = filteredUsers.filter((u) => u.role === role);
                  if (roleUsers.length === 0) return null;
                  const roleData = allowedRoles.find((r) => r.value === role)!;
                  const RoleIcon = roleData.icon;

                  return (
                    <div key={role} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${roleData.bg}`}>
                          <RoleIcon className={`w-6 h-6 ${roleData.color}`} />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-800">{roleData.label}s</h2>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                            {roleUsers.length} member{roleUsers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {roleUsers.map((user) => (
                          <div
                            key={user._id}
                            className="group bg-white border border-slate-200 rounded-3xl hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 overflow-hidden flex flex-col"
                          >
                            <div className="p-6 flex flex-col flex-1">
                              {/* User Header */}
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl ${roleData.bg} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                                    {user.profileImage && (user.profileImage.startsWith('http') || user.profileImage.startsWith('/')) ? (
                                      <img
                                        src={user.profileImage.startsWith('http') ? validateURL(user.profileImage) : user.profileImage}
                                        alt={user.name}
                                        className="w-full h-full rounded-2xl object-cover"
                                      />
                                    ) : (
                                      <User className={`w-6 h-6 ${roleData.color}`} />
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1" title={user.name}>
                                      {user.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">ID</span>
                                      <span className="text-xs font-mono text-slate-500">{user.uniqueId}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className={`w-2.5 h-2.5 rounded-full ${user.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-300'} ring-4 ring-white`} title={user.isActive ? 'Active' : 'Inactive'} />
                              </div>

                              {/* Contact Info */}
                              <div className="space-y-3 mb-6 flex-1">
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors -mx-2">
                                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><Mail size={14} /></div>
                                  <span className="text-sm font-medium text-slate-600 truncate" title={user.email}>{user.email}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors -mx-2">
                                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400"><Phone size={14} /></div>
                                  <span className="text-sm font-medium text-slate-600">{user.phone}</span>
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 mb-6">
                                {user.service && (
                                  <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                                    {user.service}
                                  </span>
                                )}
                                {user.seniority && (
                                  <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                                    {user.seniority}
                                  </span>
                                )}
                                {user.isVerified && (
                                  <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center gap-1">
                                    <BadgeCheck size={12} /> Verified
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2">
                              {(() => {
                                const role = currentUser?.role === 'subadmin' ? 'subadmin' : 'manager';
                                const dept = getDeptSlug(selectedDepartment);
                                const vPath = `/${role}-dashboard/department/${dept}/creation/${user._id}/view`;
                                const ePath = `/${role}-dashboard/department/${dept}/creation/${user._id}/edit`;
                                return (
                                  <>
                                    {/^\//.test(vPath) && (
                                      <Link
                                        href={validateURL(vPath)}
                                        data-internal-link="true"
                                        className="flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all text-xs font-bold gap-1.5"
                                      >
                                        <Eye size={14} /> View
                                      </Link>
                                    )}
                                    {/^\//.test(ePath) && (
                                      <Link
                                        href={validateURL(ePath)}
                                        data-internal-link="true"
                                        className="flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all text-xs font-bold gap-1.5"
                                      >
                                        <Edit size={14} /> Edit
                                      </Link>
                                    )}
                                  </>
                                );
                              })()}
                              <button
                                onClick={() => handleDelete(user._id)}
                                disabled={deletingUser === user._id}
                                className="flex items-center justify-center py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-white hover:shadow-sm transition-all text-xs font-bold gap-1.5"
                              >
                                {deletingUser === user._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersList;
