'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  FileText,
  User,
  MessageSquare,
  ShieldAlert,
  Briefcase,
  Menu,
  Loader2
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';


// --- Types & Interfaces ---

interface UserType {
  _id: string;
  name: string;
  email: string;
  uniqueId: string;
  department: string;
  role: string;
}

interface Report {
  _id: string;
  submittedBy: {
    name: string;
    email: string;
    role: string;
  };
  content: string;
  status: string;
  managerRemarks?: string;
  hrResponse?: string;
  createdAt: string;
  escalatedAt?: string;
}

interface Message {
  _id: string;
  senderId: {
    name: string;
    email: string;
    role: string;
    department?: string;
    service?: string;
    uniqueId?: string; // Added implicit property
  };
  content: string;
  createdAt: string;
  timestamp?: string;
}

interface Project {
  _id: string;
  uniqueId: string;
  userId: {
    name: string;
    email: string;
    uniqueId: string;
    department: string;
  };
  department: string; // Project department (e.g., Drug Discovery)
  category: string;
  status: string;
  reports?: Report[];
  assignedTo?: Array<{ name: string; email: string; uniqueId: string }>;
  createdAt: string;
  messages?: Message[];
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// --- Constants ---

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// --- Helper Components ---

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, bgColor }) => (
  <div className={`${bgColor} p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-sm`}>
        {icon}
      </div>
    </div>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${color} flex items-center gap-1.5 shadow-sm border border-transparent`}>
    {children}
  </span>
);

const ModalWrapper: React.FC<{
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  maxWidth?: string
}> = ({ children, title, onClose, maxWidth = 'max-w-2xl' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
    <div className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden border border-slate-100 transform transition-all`}>
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
        >
          <span className="text-2xl leading-none">&times;</span>
        </button>
      </div>
      <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// --- Main Page Component ---

export default function HREscalationsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previousReportFilter, setPreviousReportFilter] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');

  // Modal & Action States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [hrResponse, setHrResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // --- Authentication & Data Fetching ---

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login/Signin');
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        toast.error('Session expired');
        localStorage.removeItem('token');
        router.push('/Login/Signin');
        return;
      }

      const userRole = (decoded.role || '').toLowerCase().trim();
      const userDept = (decoded.department || '').toLowerCase().trim();

      console.log('[HR Escalation Dashboard] Auth check:', { userRole, userDept });

      // STRICT: Check role is ONLY 'manager' and department includes 'human resources' or 'hr'
      const isHRManager = userRole === 'manager' &&
        (userDept.includes('human resource') || userDept.includes('hr'));

      if (!isHRManager) {
        toast.error('Access denied. HR Manager role required.');
        router.push('/dashboard');
        return;
      }

      setUser({
        _id: decoded._id || decoded.id || decoded.userId,
        name: decoded.name || 'Unknown',
        email: decoded.email,
        uniqueId: decoded.uniqueId,
        department: decoded.department,
        role: decoded.role
      });

      loadEscalations(token);
    } catch (error) {
      console.error('[HR Dashboard] Auth error:', error);
      toast.error('Authentication failed');
      router.push('/Login/Signin');
    }
  }, [router]);

  // --- Socket.io Integration ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      console.log('[HR Dashboard] Socket connected');
      // Join project rooms for all current projects to get message updates
      projects.forEach(p => {
        socketInstance.emit('joinProjectRoom', p._id);
      });
    });

    // Listen for global HR escalation updates
    socketInstance.on('hrEscalationUpdate', (data) => {
      console.log('[HR Dashboard] Escalation update received:', data);
      toast('Update received', { icon: '🔄' });
      loadEscalations(token, true);
    });

    // Listen for new messages in joined project rooms
    socketInstance.on('newMessage', (msg) => {
      console.log('[HR Dashboard] New message received:', msg);
      // Optional: Update state locally instead of full refresh for performance
      loadEscalations(token, true);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, projects.length]); // Re-run if user changes or project list size changes

  // --- Real-time Polling (Fallback) ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    // Refresh every 30 seconds for real-time updates as fallback
    const pollInterval = setInterval(() => {
      console.log('[HR Dashboard] Polling Refresh...');
      loadEscalations(token, true); // silent refresh
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [user]);

  const loadEscalations = async (token: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/hr/escalations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sort messages in frontend
        const projectsWithSortedMessages = (data.data || []).map((p: Project) => ({
          ...p,
          messages: p.messages ? p.messages.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
            const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
            return dateB - dateA; // Descending order (newest first)
          }) : []
        }));
        setProjects(projectsWithSortedMessages);
      } else {
        toast.error(data.message || 'Failed to load escalations');
      }
    } catch (err) {
      console.error('[HR Dashboard] Load error:', err);
      toast.error('Network error loading escalations');
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleAcceptEscalation = async (project: Project, report: Report) => {
    const token = localStorage.getItem('token');
    console.log(`[HR Action] Accepting: ProjectID=${project._id}, ReportID=${report._id}`); // DEBUG

    try {
      const res = await fetch(`${API_BASE}/${project._id}/report/${report._id}/hr-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'accept' })
      });
      const data = await res.json();
      console.log('[HR Action] Accept Response:', data); // DEBUG

      if (data.success) {
        toast.success('Escalation accepted and logged');
        loadEscalations(token!);
      } else {
        console.error('[HR Action] Accept Failed:', data.message);
        toast.error(data.message || 'Failed to accept escalation');
      }
    } catch (err) {
      console.error('[HR Dashboard] Accept error:', err);
      toast.error('Network error while accepting');
    }
  };

  const handleResolveReport = async () => {
    if (!selectedProject || !selectedReport || !hrResponse.trim()) {
      toast.error('Please provide a response');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/${selectedProject._id}/report/${selectedReport._id}/hr-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: hrResponse,
          action: 'resolve'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Resolved! Notification sent to Service Manager');
        closeModal();
        loadEscalations(token!);
      } else {
        toast.error(data.message || 'Failed to resolve report');
      }
    } catch (err) {
      console.error('[HR Dashboard] Resolve error:', err);
      toast.error('Failed to submit resolution');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Helper Functions ---

  const openResolveModal = (project: Project, report: Report) => {
    setSelectedProject(project);
    setSelectedReport(report);
    setHrResponse('');
    setShowResolveModal(true);
  };

  const closeModal = () => {
    setShowResolveModal(false);
    setSelectedProject(null);
    setSelectedReport(null);
    setHrResponse('');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Escalated to HR': return 'bg-red-100 text-red-800 border border-red-200 animate-pulse';
      case 'Accepted by HR': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // --- Helpers ---

  const isServiceManagerMessage = (msg: Message) => {
    if (!msg.senderId) return false;

    const role = (msg.senderId.role || '').toLowerCase().trim();
    const serviceRaw = (msg.senderId.service || '').toLowerCase().trim();

    // Support both Manager and Subadmin roles if they are in technical depts
    if (role !== 'manager' && role !== 'subadmin') return false;

    // Normalization: remove all non-alphanumeric characters
    const normalize = (s: string) => s.replace(/[^a-z0-9]/g, '');
    const service = normalize(serviceRaw);

    const validServicesNorm = [
      'ngs',
      'drugdiscovery',
      'softwaredevelope',
      'softwaredevelopment',
      'microbiology',
      'biochemistry',
      'molecularbiology',
      'modecularbiology',
      'sales',
      'customer'
    ];

    // Check if the normalized service matches any of our valid services
    return validServicesNorm.some(vs => service.includes(vs) || vs.includes(service));
  };

  // --- Derived Data ---

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.uniqueId.toLowerCase().includes(query) ||
        p.userId?.name?.toLowerCase().includes(query) ||
        p.department.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [projects, searchTerm]);

  const stats = useMemo(() => {
    const totalEscalations = projects.reduce((acc, p) =>
      acc + (p.reports?.filter(r => r.status === 'Escalated to HR').length || 0), 0
    );
    const totalResolved = projects.reduce((acc, p) =>
      acc + (p.reports?.filter(r => r.status === 'Resolved').length || 0), 0
    );
    const affectedDepts = new Set(projects.map(p => p.department)).size;

    return { totalEscalations, totalResolved, affectedDepts };
  }, [projects]);

  const getPreviousReportsByFilter = (project: Project) => {
    if (!project.reports) return [];

    // Get all non-escalated reports (previous reports that have been handled)
    const previousReports = project.reports.filter(r => r.status !== 'Escalated to HR');

    if (previousReportFilter === 'all') {
      return previousReports;
    } else if (previousReportFilter === 'resolved') {
      return previousReports.filter(r => r.status === 'Resolved');
    } else if (previousReportFilter === 'rejected') {
      return previousReports.filter(r => r.status === 'Rejected');
    } else if (previousReportFilter === 'pending') {
      return previousReports.filter(r =>
        r.status !== 'Resolved' && r.status !== 'Rejected' && r.status !== 'Escalated to HR'
      );
    }

    return previousReports;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg text-slate-500 font-bold animate-pulse">Loading Escalations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <Toaster position="top-right" />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <MetricCard
          title="Active Escalations"
          value={stats.totalEscalations}
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
          color="text-red-600"
          bgColor="bg-white"
        />
        <MetricCard
          title="Resolved Reports"
          value={stats.totalResolved}
          icon={<CheckCircle className="w-8 h-8 text-emerald-500" />}
          color="text-emerald-600"
          bgColor="bg-white"
        />
        <MetricCard
          title="Affected Depts"
          value={stats.affectedDepts}
          icon={<Briefcase className="w-8 h-8 text-amber-500" />}
          color="text-amber-600"
          bgColor="bg-white"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Simplified Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-500">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                Project Escalations List
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Live</span>
                </div>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {filteredProjects.length} Active cases matched
              </p>
            </div>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search unique ID, client or dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="p-6 md:p-8 space-y-8 bg-slate-50/30">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">All Clear!</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">
                No active escalations found matching your criteria. Great job keeping up!
              </p>
            </div>
          ) : (
            filteredProjects.map(project => (
              <div key={project._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                {/* Project Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {project.uniqueId.startsWith('CHAT-') ? project.category : `${project.uniqueId} - ${project.category}`}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge color="bg-slate-100 text-slate-600 border-slate-200">
                          {project.department}
                        </Badge>
                        <span className="text-slate-300">•</span>
                        <span className="text-sm font-medium text-slate-500">
                          Owner: <span className="text-slate-900 font-bold">{project.userId?.name || 'Unknown'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  {project.assignedTo && project.assignedTo[0] && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                        {project.assignedTo[0]?.name?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Managed By</span>
                        <span className="text-sm font-bold text-slate-700">{project.assignedTo[0]?.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages Section - ALL MESSAGES */}
                {project.messages && (
                  <div className="border-b border-slate-100">
                    <div className="px-6 py-3 bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Discussion Log ({project.messages?.filter(isServiceManagerMessage).length || 0})
                    </div>
                    <div className="bg-slate-50/30 max-h-72 overflow-y-auto custom-scrollbar p-2">
                      {project.messages?.filter(isServiceManagerMessage).length === 0 ? (
                        <div className="py-8 text-center text-slate-400 italic text-sm">
                          No specific discussion messages found.
                        </div>
                      ) : (
                        <div className="space-y-1 p-2">
                          {project.messages
                            .filter(isServiceManagerMessage)
                            .sort((a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime())
                            .map((msg, idx, arr) => {
                              const msgDate = new Date(msg.timestamp || msg.createdAt || Date.now());
                              const prevMsgDate = idx > 0 ? new Date(arr[idx - 1].timestamp || arr[idx - 1].createdAt || Date.now()) : null;
                              const isNewDay = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

                              // Identify sender type
                              const isManager = msg.senderId?.role === 'manager';
                              const isTL = msg.senderId?.role === 'tl';

                              return (
                                <React.Fragment key={msg._id}>
                                  {isNewDay && (
                                    <div className="flex items-center justify-center my-4">
                                      <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                        {msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  )}
                                  <div className={`p-3 rounded-2xl border ${isManager ? 'bg-red-50/50 border-red-100 ml-8' : isTL ? 'bg-purple-50/50 border-purple-100 ml-4 mr-4' : 'bg-white border-slate-100 mr-8'} transition-colors hover:shadow-sm`}>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black ${isManager ? 'text-red-700' : isTL ? 'text-purple-700' : 'text-slate-700'}`}>
                                          {msg.senderId?.name || 'Unknown'}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-100 text-slate-400 uppercase">
                                          {msg.senderId?.role}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                                        {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                </React.Fragment>
                              );
                            })
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reports List */}
                <div className="divide-y divide-slate-100">
                  {project.reports?.filter(r => r.status === 'Escalated to HR' || r.status === 'Accepted by HR')
                    .sort((a, b) => new Date(b.escalatedAt || b.createdAt || 0).getTime() - new Date(a.escalatedAt || a.createdAt || 0).getTime())
                    .map((report) => (
                      <div key={report._id} className={`p-6 md:p-8 ${report.status === 'Accepted by HR' ? 'bg-blue-50/30' : 'bg-red-50/30'}`}>
                        <div className="flex flex-col lg:flex-row gap-8">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge color={getStatusBadgeColor(report.status)}>{report.status}</Badge>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                {report.escalatedAt ? new Date(report.escalatedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Escalation Detail</h4>
                              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-800 font-medium leading-relaxed">
                                {report.content}
                              </div>
                            </div>

                            {report.managerRemarks && (
                              <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Manager Remarks</h4>
                                <div className="p-4 bg-slate-100/50 rounded-2xl border border-slate-200 text-slate-600 italic text-sm">
                                  "{report.managerRemarks}"
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 font-medium">
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>From: <strong className="text-slate-700">{report.submittedBy?.name}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 justify-center lg:w-64">
                            {report.status === 'Escalated to HR' && (
                              <button
                                onClick={() => handleAcceptEscalation(project, report)}
                                className="w-full px-6 py-4 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2 group/btn"
                              >
                                <CheckCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                Accept Request
                              </button>
                            )}
                            {report.status === 'Accepted by HR' && (
                              <button
                                onClick={() => openResolveModal(project, report)}
                                className="w-full px-6 py-4 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2 group/btn"
                              >
                                <MessageSquare className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                Resolve & Notify
                              </button>
                            )}
                            {/* Status Indicator for processed items */}
                            {report.status !== 'Escalated to HR' && report.status !== 'Accepted by HR' && (
                              <div className="w-full px-6 py-4 bg-slate-100 text-slate-400 text-sm font-bold rounded-2xl border border-slate-200 text-center cursor-not-allowed flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Processed
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Previous Reports Section with Filter Tabs */}
                  {project.reports && project.reports.some(r => r.status !== 'Escalated to HR') && (
                    <div className="bg-slate-50 border-t border-slate-200">
                      {/* Section Header with Tabs */}
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-100/50 flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Previous History
                        </h3>

                        <div className="flex gap-2">
                          {['all', 'pending', 'resolved', 'rejected'].map(filter => (
                            <button
                              key={filter}
                              onClick={() => setPreviousReportFilter(filter as any)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${previousReportFilter === filter
                                ? filter === 'resolved' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                  : filter === 'rejected' ? 'bg-red-600 border-red-600 text-white shadow-sm'
                                    : filter === 'pending' ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                      : 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filtered Previous Reports Display */}
                      <div className="divide-y divide-slate-200/50">
                        {getPreviousReportsByFilter(project).length === 0 ? (
                          <div className="px-6 py-8 text-center text-slate-400">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-wide">No messages found for this filter</p>
                          </div>
                        ) : (
                          getPreviousReportsByFilter(project).map((report) => (
                            <div
                              key={report._id}
                              className={`p-6 transition-colors ${report.status === 'Resolved' ? 'bg-emerald-50/20 hover:bg-emerald-50/40' :
                                report.status === 'Rejected' ? 'bg-red-50/20 hover:bg-red-50/40' :
                                  'bg-amber-50/20 hover:bg-amber-50/40'
                                }`}
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge color={getStatusBadgeColor(report.status)}>{report.status}</Badge>
                                    <span className="text-xs font-medium text-slate-400">
                                      {new Date(report.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="text-sm text-slate-700 leading-relaxed">{report.content}</div>
                                </div>

                                {report.hrResponse && (
                                  <div className="flex items-start gap-3 pl-4 border-l-2 border-blue-200">
                                    <div className="mt-1">
                                      <ShieldAlert className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-black text-blue-600 uppercase mb-1">HR Response</h5>
                                      <p className="text-sm text-slate-700">{report.hrResponse}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedReport && (
        <ModalWrapper title="Resolve Escalation" onClose={closeModal}>
          <div className="space-y-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Escalation Summary</h4>
              <p className="text-sm text-slate-800 font-medium leading-relaxed mb-4">{selectedReport.content}</p>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200 text-xs text-slate-500 font-medium">
                <span>From: {selectedReport.submittedBy?.name || 'Unknown'}</span>
                {selectedReport.managerRemarks && (
                  <>
                    <span>•</span>
                    <span className="italic">"{selectedReport.managerRemarks}"</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Resolution details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={hrResponse}
                onChange={(e) => setHrResponse(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
                placeholder="Enter your decision, action taken, or response to settle this escalation..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveReport}
                disabled={!hrResponse.trim() || isSubmitting}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span>Confirm Resolution</span>
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  );
}
