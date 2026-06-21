'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { Microscope } from 'lucide-react';
import TLDashboardView from '@/app/tl-dashboard/service/shared/TLDashboardView';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

export default function MicrobiologyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

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
        department="Microbiology"
        projects={filteredProjects}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenModal={() => {}}
        onExportCSV={() => {}}
        serviceIcon={<Microscope className="w-7 h-7" />}
        projectRoute="microbiology"
      />
    </div>
  );
}
