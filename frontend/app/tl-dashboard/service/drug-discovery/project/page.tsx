'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import { Beaker } from 'lucide-react';
import TLDashboardView from '@/app/tl-dashboard/service/shared/TLDashboardView';


// تعريف ModalWrapper محلياً لتجنب مشاكل الاستيراد إذا لم يكن مصدراً
const LocalModalWrapper: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; maxWidth?: string }> = ({ children, title, onClose, maxWidth = 'max-w-md' }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 backdrop-blur-[8px] p-4 animate-in fade-in duration-300">
    <div className={`bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] w-full ${maxWidth} overflow-hidden border border-white transform transition-all duration-500 scale-100`}>
      <div className="px-8 py-6 border-b border-gray-100/50 flex justify-between items-center bg-white/40">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900">
          <svg className="w-6 h-6 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

export default function DrugDiscoveryProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  
  // Modal states
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login/Signin');
      return;
    }
    loadAssignedProjects(token);
  }, []);

  const loadAssignedProjects = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tl/assigned-projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch =
        p.uniqueId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userId.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (activeTab === 'pending') return p.status === 'Under Review';
      if (activeTab === 'active') return p.status === 'In Progress';
      if (activeTab === 'completed') return p.status === 'Completed';
      return true;
    });
  }, [projects, searchTerm, activeTab]);

  const stats = useMemo(() => ({
    total: projects.length,
    underReview: projects.filter(p => p.status === 'Under Review').length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length
  }), [projects]);

  return (
    <div className="p-8 min-h-screen">
      <Toaster position="top-right" />
      <TLDashboardView
        department="Drug Discovery"
        projects={filteredProjects}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenModal={() => {}} // Modals can be added if needed
        onExportCSV={() => {}}
        serviceIcon={<Beaker className="w-7 h-7" />}
        projectRoute="drug-discovery"
      />
    </div>
  );
}
