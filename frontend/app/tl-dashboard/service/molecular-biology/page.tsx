'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';
import {
  Activity,
  ChevronDown,
  CheckCircle,
  PlayCircle,
  Dna,
  Users,
  Send,
  UserPlus
} from 'lucide-react';
import LeaveRequestWidget from '@/app/Compontent/LeaveRequestWidget';
import TLDashboardView from '@/app/tl-dashboard/service/shared/TLDashboardView';

// --- Types & Interfaces ---

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
  userId: UserType;
  department: string;
  category: string;
  status: string; // 'Under Review', 'In Progress', 'Completed'
  paymentStatus: string;
  formData?: any;
  remarks?: string; // Task notes or general remarks
  reviewerRemarks?: string; // Completion notes
  createdAt: string;
  submittedAt: string;
  reviewedAt?: string;
  paymentDetails?: {
    dueDate: string;
  };
  activities?: {
    description: string;
    timestamp: string;
    updatedBy: { _id: string; name: string; role: string; department?: string; service?: string };
    statusChange?: string;
    remarks?: string;
  }[];
  teamMembers?: UserType[];
}

// --- Constants ---

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// --- Helper Components ---

const ModalWrapper: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-md' }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-[8px] p-4 animate-in fade-in duration-300">
    <div className={`bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] w-full ${maxWidth} overflow-hidden border border-white transform transition-all duration-500 scale-100`}>
      <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-white/40">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900">
          <ChevronDown className="w-6 h-6 rotate-90" />
        </button>
      </div>
      <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// --- Main Page Component ---

export default function MolecularBiologyTLDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  const searchParams = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending' || tabParam === 'active' || tabParam === 'completed' || tabParam === 'all') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Modal & Action States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<'start' | 'complete' | 'details' | 'assign-team' | 'message-manager' | 'create-group-chat' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  // Team Assignment
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  // Messaging to Manager
  const [managerMessage, setManagerMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  // Group Chat Creation
  const [groupChatName, setGroupChatName] = useState('');
  const [groupChatMembers, setGroupChatMembers] = useState<string[]>([]);

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
      const userService = (decoded.service || '').toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '');

      if (userRole !== 'tl') {
        toast.error('Access denied. Team Lead (TL) role required for this dashboard.');
        router.push('/dashboard');
        return;
      }

      if (userService !== 'molecularbiology') {
        toast.error('Access denied. This dashboard is only for Molecular Biology Team Leads.');
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
      loadAssignedProjects(token);
      loadEmployees(token);
    } catch (error) {
      console.error('[TL Dashboard] Auth error:', error);
      router.push('/Login/Signin');
    }
  }, [router]);

  const loadAssignedProjects = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tl/assigned-projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      } else {
        toast.error(data.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/tl/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  // --- Actions ---

  const handleStartTask = async () => {
    if (!selectedProject) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/tl/assigned-projects/${selectedProject._id}/start-task`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskNotes: actionNotes })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Project started successfully!');
        closeModal();
        loadAssignedProjects(token!);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Failed to start task');
    }
  };

  const handleCompleteProject = async () => {
    if (!selectedProject) return;
    const token = localStorage.getItem('token');
    if (actionNotes.trim().length < 10) {
      toast.error('Please provide detailed completion notes (min 10 chars)');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/tl/assigned-projects/${selectedProject._id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completionNotes: actionNotes })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Project marked as completed!');
        closeModal();
        loadAssignedProjects(token!);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Failed to complete project');
    }
  };

  const handleAssignTeam = async () => {
    if (!selectedProject) return;
    if (selectedTeamMembers.length < 3) {
      toast.error('You must assign at least 3 team members.');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/tl/assigned-projects/${selectedProject._id}/assign-team`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberIds: selectedTeamMembers })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Team assigned successfully! Opening team chat...');
        closeModal();
        loadAssignedProjects(token!);
        setTimeout(() => {
          router.push(`/chat?projectId=${selectedProject._id}`);
        }, 500);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Failed to assign team');
    }
  };

  const handleSendManagerMessage = async () => {
    if (!messageSubject.trim() || !managerMessage.trim()) {
      toast.error('Please provide both subject and message');
      return;
    }
    if (managerMessage.trim().length < 10) {
      toast.error('Please provide a detailed message (min 10 chars)');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/tl/message-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: messageSubject,
          message: managerMessage,
          projectId: selectedProject?._id || null,
          service: 'Molecular Biology'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Message sent to manager successfully!');
        setMessageSubject('');
        setManagerMessage('');
        closeModal();
      } else {
        toast.error(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      toast.error('No projects to export');
      return;
    }

    const headers = ['Unique ID', 'Client Name', 'Client Email', 'Status', 'Submitted At', 'Due Date', 'Compound Name', 'Assigned Team'];
    const csvContent = [
      headers.join(','),
      ...filteredProjects.map(p => {
        const teamNames = p.teamMembers ? p.teamMembers.map(m => m.name).join('; ') : '';
        return [
          p.uniqueId,
          `"${p.userId.name}"`,
          p.userId.email,
          p.status,
          new Date(p.submittedAt).toLocaleDateString(),
          p.paymentDetails?.dueDate ? new Date(p.paymentDetails.dueDate).toLocaleDateString() : 'N/A',
          `"${p.formData?.titleProject || ''}"`,
          `"${teamNames}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', validateURL(url));
      link.setAttribute('download', `molecular_biology_projects_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupChatName.trim()) {
      toast.error('Please provide a group name');
      return;
    }
    if (groupChatMembers.length < 2) {
      toast.error('Please select at least 2 members for the group');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'group',
          name: groupChatName,
          description: `Molecular Biology team group created by ${user?.name}`,
          members: groupChatMembers,
          contextStringType: 'Service',
          contextStringValue: 'Molecular Biology'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Group chat created successfully!');
        setGroupChatName('');
        setGroupChatMembers([]);
        closeModal();
        router.push(`/chat`);
      } else {
        toast.error(data.message || 'Failed to create group');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Failed to create group chat');
    }
  };

  // --- Helper Functions ---

  const openModal = (mode: typeof modalMode, project: Project) => {
    setSelectedProject(project);
    setModalMode(mode);
    setActionNotes('');
    if (mode === 'assign-team') {
      setSelectedTeamMembers([]);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProject(null);
    setActionNotes('');
    setSelectedTeamMembers([]);
    setManagerMessage('');
    setMessageSubject('');
    setGroupChatName('');
    setGroupChatMembers([]);
  };

  // --- Derived Data ---

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch =
        p.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.formData?.titleProject && p.formData.titleProject.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (activeTab === 'pending') return p.status === 'Under Review';
      if (activeTab === 'active') return p.status === 'In Progress';
      if (activeTab === 'completed') return p.status === 'Completed';

      return true;
    });
  }, [projects, searchTerm, activeTab]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      underReview: projects.filter(p => p.status === 'Under Review').length,
      inProgress: projects.filter(p => p.status === 'In Progress').length,
      completed: projects.filter(p => p.status === 'Completed').length
    };
  }, [projects]);


  return (
    <div className="p-8 min-h-screen">
      <Toaster position="top-right" />

      <TLDashboardView
        department="Molecular Biology"
        projects={filteredProjects}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenModal={openModal}
        onExportCSV={handleExportCSV}
        serviceIcon={<Dna className="w-7 h-7" />}
        projectRoute="molecular-biology"
      />

      {/* Modals */}
      {modalMode === 'start' && selectedProject && (
        <ModalWrapper title="Initialize Analysis" onClose={closeModal}>
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
              <PlayCircle className="w-6 h-6 text-indigo-600 mt-1" />
              <div>
                <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Sequence Authorization</p>
                <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider mt-1">Starting analysis for {selectedProject.uniqueId}</p>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Protocol Remarks</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium h-32"
                placeholder="Enter initial analysis notes..."
              />
            </div>
            <button
              onClick={handleStartTask}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Confirm Execution
            </button>
          </div>
        </ModalWrapper>
      )}

      {modalMode === 'complete' && selectedProject && (
        <ModalWrapper title="Finalize Analysis" onClose={closeModal}>
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-600 mt-1" />
              <div>
                <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Vessel Integration Complete</p>
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Closing sequence for {selectedProject.uniqueId}</p>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Technical Disposition</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-100 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium h-32"
                placeholder="Detailed completion summary (min 10 chars)..."
              />
            </div>
            <button
              onClick={handleCompleteProject}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
            >
              Ship Integration
            </button>
          </div>
        </ModalWrapper>
      )}

      {modalMode === 'assign-team' && selectedProject && (
        <ModalWrapper title="Assign Personnel Team" onClose={closeModal} maxWidth="max-w-lg">
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
              <Users className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Team Synchronization</p>
                <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider mt-1">Minimum 3 analysts required for {selectedProject.uniqueId}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {employees.map(emp => (
                <label
                  key={emp._id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedTeamMembers.includes(emp._id)
                    ? 'bg-blue-50 border-blue-600 shadow-md'
                    : 'bg-white border-slate-50 hover:border-slate-200'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTeamMembers.includes(emp._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTeamMembers([...selectedTeamMembers, emp._id]);
                      else setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== emp._id));
                    }}
                    className="hidden"
                  />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${selectedTeamMembers.includes(emp._id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">{emp.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.role}</p>
                  </div>
                  {selectedTeamMembers.includes(emp._id) && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Personnel</p>
              <p className={`text-xs font-black ${selectedTeamMembers.length < 3 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {selectedTeamMembers.length} / 3 Minimum
              </p>
            </div>

            <button
              onClick={handleAssignTeam}
              disabled={selectedTeamMembers.length < 3}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl disabled:opacity-30"
            >
              Initialize Team Deployment
            </button>
          </div>
        </ModalWrapper>
      )}

      {modalMode === 'message-manager' && (
        <ModalWrapper title="Dispatch Manager Communication" onClose={closeModal} maxWidth="max-w-lg">
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
              <Send className="w-6 h-6 text-amber-600 mt-1" />
              <div>
                <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Direct Link</p>
                <p className="text-[11px] text-amber-600 font-bold uppercase tracking-wider mt-1">Resource or escalation request to Service Manager</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Type</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                  placeholder="Subject of communication..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transmission Data</label>
                <textarea
                  value={managerMessage}
                  onChange={(e) => setManagerMessage(e.target.value)}
                  rows={6}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-amber-100 outline-none transition-all placeholder:text-slate-300"
                  placeholder="Detailed requirements or concerns..."
                />
              </div>
            </div>

            <button
              onClick={handleSendManagerMessage}
              className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-3"
            >
              <Send className="w-4 h-4" />
              Transmit Securely
            </button>
          </div>
        </ModalWrapper>
      )}

      {modalMode === 'create-group-chat' && (
        <ModalWrapper title="Synchronize Personnel Group" onClose={closeModal} maxWidth="max-w-lg">
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-4">
              <UserPlus className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <p className="text-sm font-black text-purple-900 uppercase tracking-tight">Consolidated Matrix</p>
                <p className="text-[11px] text-purple-600 font-bold uppercase tracking-wider mt-1">Establish internal team collaboration link</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Identifier</label>
                <input
                  type="text"
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-purple-100 outline-none"
                  placeholder="E.g., Tech Ops Alpha"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selected Personnel</label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {employees.map(emp => (
                    <label
                      key={emp._id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${groupChatMembers.includes(emp._id) ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-100'}`}
                    >
                      <input
                        type="checkbox"
                        checked={groupChatMembers.includes(emp._id)}
                        onChange={(e) => {
                          if (e.target.checked) setGroupChatMembers([...groupChatMembers, emp._id]);
                          else setGroupChatMembers(groupChatMembers.filter(id => id !== emp._id));
                        }}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-900">{emp.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{emp.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateGroupChat}
              disabled={!groupChatName.trim() || groupChatMembers.length < 2}
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center gap-3 disabled:opacity-30"
            >
              Establish Group Link
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* <LeaveRequestWidget /> */}
    </div>
  );
}
