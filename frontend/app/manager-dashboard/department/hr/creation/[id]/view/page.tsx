'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { validateURL } from '@/lib/validation';
import {
  User, Mail, Phone, Building, Shield, Key, Hash,
  CheckCircle, Edit, Trash2, Activity, Calendar,
  Eye, ArrowLeft, Users, BadgeCheck, Settings,
  Fingerprint, Sparkles, Award, ShieldCheck, MapPin,
  Loader2, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)

interface UserData {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  department: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isPasswordSet: boolean;
  createdAt: string;
  updatedAt: string;
  attendanceVerificationMethod?: string;
  biometricScanId?: string;
  signatureData?: string;
  punchCardId?: string;
  scanData?: string;
  profileImage?: string;
}

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const ViewStaffUser = () => {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<DecodedToken | null>(null);

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
      setCurrentUser(decoded);

      const normalizedDept = (decoded.department || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
      const hasHRAccess = (decoded.role === 'subadmin' || decoded.role === 'manager' || decoded.role === 'head') && normalizedDept === 'human-resources';

      if (!hasHRAccess) {
        toast.error('Access denied. HR management permissions required.');
        router.push('/Login/Signin');
        return;
      }
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      router.push('/Login/Signin');
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/get-user/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          const rawData = response.data.data;
          const sanitizedData = {
            ...rawData,
            profileImage: (rawData.profileImage && /^(https?:\/\/|blob:|\/)/i.test(rawData.profileImage)) ? rawData.profileImage : undefined
          };
          setUserData(sanitizedData);
        } else {
          setError(response.data.message || 'Failed to load user records');
        }
      } catch (err: unknown) {
        console.error('Error fetching user:', err);
        setError('Failed to load user records');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, router]);

  const getDashboardPrefix = () => currentUser?.role === 'subadmin' ? 'subadmin' : 'manager';
  const getListLink = () => `/${getDashboardPrefix()}-dashboard/department/hr/creation`;
  const getEditLink = () => `/${getDashboardPrefix()}-dashboard/department/hr/creation/${userId}/edit`;

  const getRoleData = (role: string) => {
    const roles: { [key: string]: { label: string, color: string, bg: string, icon: any } } = {
      subadmin: { label: 'Subadmin', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: ShieldCheck },
      head: { label: 'Head', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Award },
      manager: { label: 'Manager', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Users },
      tl: { label: 'Team Lead', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Activity },
      employee: { label: 'Employee', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: User },
    };
    return roles[role] || roles.employee;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center space-y-6">
          <div className="p-6 rounded-full bg-rose-500/10 text-rose-500 inline-block">
            <Trash2 className="w-12 h-12" />
          </div>
          <p className="text-xl text-slate-400">{error || 'Staff record not found'}</p>
          <Link href={getListLink()} className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const roleData = getRoleData(userData.role);

  return (
    <div className="animate-in fade-in duration-500">
      <Toaster position="top-right" />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Top Navigation & Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Link
                href={getListLink()}
                className="flex items-center text-slate-500 hover:text-blue-500 transition-colors group mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Staff Directory
              </Link>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${roleData.bg.replace('10', '20')} flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl`}>
                    {userData.profileImage ? (
                      <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-white">
                        {(() => {
                          const rawUrl = userData.profileImage || '';
                          let finalSrc = '#';
                          if (rawUrl && (rawUrl.startsWith('http') || rawUrl.startsWith('/') || rawUrl.startsWith('blob:'))) {
                            finalSrc = rawUrl;
                          }
                          return (
                            <img
                              src={finalSrc !== '#' ? encodeURI(finalSrc) : '#'}
                              alt={userData.name}
                              className="w-full h-full object-cover"
                              data-sanitized="true"
                            />
                          );
                        })()}
                      </div>
                    ) : (
                      <User className={`w-10 h-10 ${roleData.color}`} />
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-[#0a0f1e] ${userData.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                    {userData.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono text-slate-500 uppercase tracking-wider">{userData.uniqueId}</span>
                    <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase ${roleData.color}`}>
                      <roleData.icon className="w-3.5 h-3.5" />
                      {roleData.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={getEditLink()}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Profile
              </Link>
              <button
                onClick={() => {
                  if (confirm('Deactivate this staff member?')) {
                    const token = localStorage.getItem('token');
                    axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/delete-user/${userId}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    }).then(() => {
                      toast.success('Personnel deactivated');
                      router.push(getListLink());
                    });
                  }
                }}
                className="p-3.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-500/20 shadow-sm"
                title="Deactivate Records"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detailed Information */}
            <div className="lg:col-span-2 space-y-8">
              {/* Contact & Branch Section */}
              <motion.div variants={itemVariants} className="glass-morphism dark:glass-dark p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Registry Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Digital Reach
                    </p>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200 truncate">{userData.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Phone Network
                    </p>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{userData.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Workspace Branch
                    </p>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">{userData.branch}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Registration Date
                    </p>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                      {new Date(userData.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Role & Verification Logic */}
              <motion.div variants={itemVariants} className="glass-morphism dark:glass-dark p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Organizational Tier</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${roleData.bg} ${roleData.color}`}>
                        <roleData.icon className="w-6 h-6" />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${userData.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {userData.isActive ? 'Active Status' : 'Inactive Status'}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Role</h3>
                    <p className="text-xl font-bold capitalize">{userData.role.replace('-', ' ')}</p>
                    <p className="mt-2 text-sm text-slate-500">Member of the {userData.department || 'Human Resources'} department.</p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${userData.isVerified ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {userData.isVerified ? 'Identity Verified' : 'Pending Verification'}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Verification Method</h3>
                    <p className="text-xl font-bold capitalize">{userData.attendanceVerificationMethod || 'Standard'}</p>
                    <p className="mt-2 text-sm text-slate-500 font-mono truncate">ID: {userData.biometricScanId || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar Quick Actions */}
            <div className="space-y-8">
              <motion.div variants={itemVariants} className="glass-morphism dark:glass-dark p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg sticky top-8">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`ID: ${userData.uniqueId}\nEmail: ${userData.email}`);
                      toast.success('Directory copied to clipboard');
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">Copy Credentials</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </button>

                  <button
                    onClick={() => toast('Password redistribution is an administrative task.', { icon: '🔐' })}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-amber-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm">Request Password Reset</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                  </button>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Historical Log</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Last Registry Sync</p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {new Date(userData.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Account Origination</p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {new Date(userData.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default ViewStaffUser;
