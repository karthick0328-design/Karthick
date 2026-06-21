'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { validateURL } from '@/lib/validation';
import DOMPurify from 'dompurify';
import {
  User, Mail, Phone, Building, Shield, Key, Hash,
  CheckCircle, Edit, Trash2, Activity, Calendar,
  Eye, ArrowLeft, Users, BadgeCheck, Settings,
  Fingerprint, Sparkles, Award, ShieldCheck, MapPin,
  Loader2, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface UserData {
  _id: string;
  uniqueId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  department: string;
  service?: string;
  seniority?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  isPasswordSet: boolean;
  createdAt: string;
  updatedAt: string;
  attendanceVerificationMethod?: string;
  biometricScanId?: string;
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
      router.push('/login/signin');
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        toast.error('Session expired. Please log in again.');
        router.push('/login/signin');
        return;
      }
      setCurrentUser(decoded);

      if (!['subadmin', 'superadmin'].includes(decoded.role)) {
        toast.error('Access denied. Super Admin/Subadmin permissions required.');
        router.push('/login/signin');
        return;
      }
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login/signin');
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
          setUserData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to load user records');
        }
      } catch (err: any) {
        setError('Failed to load user records');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, router]);

  const getListLink = () => `/super-admin-dashboard/members`;
  const getEditLink = () => `/super-admin-dashboard/member-creation/${userId}/edit`;

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-6">
          <Trash2 className="w-16 h-16 text-rose-500 mx-auto" />
          <p className="text-xl text-slate-600 font-bold">{error || 'Record not found'}</p>
          <Link href={getListLink()} className="inline-flex items-center px-6 py-3 bg-rose-600 text-white rounded-xl font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const roleData = getRoleData(userData.role);

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Link href={getListLink()} className="flex items-center text-slate-500 hover:text-rose-600 transition-colors font-bold text-xs uppercase tracking-widest mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Staff Directory
              </Link>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-3xl bg-white flex items-center justify-center overflow-hidden border-4 border-white shadow-xl shadow-rose-100`}>
                    {userData.profileImage ? (
                      <img 
                        src={DOMPurify.sanitize(validateURL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploads/profile/${userData.profileImage.replace(/[^\w\-./]/g, '')}`))} 
                        alt={userData.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className={`w-12 h-12 ${roleData.color}`} />
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${userData.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">{userData.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-black font-mono text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">{userData.uniqueId}</span>
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${roleData.bg} ${roleData.color}`}>
                      <roleData.icon className="w-3 h-3" /> {roleData.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href={getEditLink()} className="flex-1 md:flex-none inline-flex items-center justify-center px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-200">
                <Edit className="w-4 h-4 mr-2" /> Update Profile
              </Link>
              <button
                onClick={() => {
                  if (confirm('Deactivate this staff member?')) {
                    axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/hr/delete-user/${userId}`, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    }).then(() => {
                      toast.success('Personnel deactivated');
                      router.push(getListLink());
                    });
                  }
                }}
                className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100 shadow-sm"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registry Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {[
                    { label: 'Digital Reach', value: userData.email, icon: Mail },
                    { label: 'Phone Network', value: userData.phone, icon: Phone },
                    { label: 'Workspace Branch', value: userData.branch, icon: MapPin },
                    { label: 'Registration Date', value: new Date(userData.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }), icon: Calendar },
                    { label: 'Department', value: userData.department, icon: Building },
                    { label: 'Service Unit', value: userData.service || 'General', icon: Activity },
                    { label: 'Seniority', value: userData.seniority || 'Standard', icon: Award },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <item.icon className="w-3 h-3" /> {item.label}
                      </p>
                      <p className="text-lg font-bold text-slate-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Logic</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${roleData.bg} ${roleData.color}`}>
                        <roleData.icon className="w-6 h-6" />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${userData.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {userData.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">System Access</h3>
                    <p className="text-xl font-bold capitalize">{userData.role.replace('-', ' ')}</p>
                  </div>

                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${userData.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {userData.isVerified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Onboarding Strategy</h3>
                    <p className="text-xl font-bold capitalize">{userData.attendanceVerificationMethod || 'Standard'}</p>
                    <p className="mt-2 text-[10px] text-slate-400 font-mono font-bold">SCAN_ID: {userData.biometricScanId || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="space-y-8">
              <motion.div variants={itemVariants} className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden sticky top-8">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-600/20 rounded-full blur-3xl" />
                <h3 className="text-lg font-black mb-8 flex items-center gap-2 relative z-10">
                  <Sparkles className="text-rose-400 w-5 h-5" /> Quick Actions
                </h3>
                <div className="space-y-4 relative z-10">
                  <button onClick={() => { navigator.clipboard.writeText(userData.uniqueId); toast.success('ID Copied'); }} className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-400"><Key size={18} /></div>
                      <span className="font-bold text-sm tracking-tight text-white/80">Copy Access ID</span>
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                  <button onClick={() => toast('Administrative protocol required')} className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400"><Settings size={18} /></div>
                      <span className="font-bold text-sm tracking-tight text-white/80">Reset Password</span>
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 space-y-6">
                    <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Registry Update</p>
                            <p className="text-xs font-bold text-white/70">{new Date(userData.updatedAt).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Origination Log</p>
                            <p className="text-xs font-bold text-white/70">{new Date(userData.createdAt).toLocaleString()}</p>
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
};

export default ViewStaffUser;
