'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/adminCompontent/Header';
import SidebarAdmin from '@/app/adminCompontent/sidebarAdmin';
import { FileText, Users, Activity, ExternalLink, Calendar, X, Briefcase, Mail, Clock, Shield } from 'lucide-react';

interface Project {
  _id: string;
  projectNumber: string;
  title: string;
  department: string;
  status: string;
  userId: { name: string; email: string };
  teamLeadId: { name: string };
  createdAt: string;
}

export default function MolecularBiologyProjects() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('http://localhost:5000/api/adminassignments/projects/molecular', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        
        if (data.success && data.data) {
          setProjects(data.data);
        }
      } catch (err) {
        console.error("Error fetching molecular biology projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SidebarAdmin isSidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Molecular Biology Projects</h1>
                <p className="text-gray-500 mt-1">Manage and monitor all molecular biology initiatives</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg">No molecular biology projects found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <div key={project._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={project.title}>
                        {project.title}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 font-mono">{project.projectNumber}</p>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="truncate">Client: {project.userId?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Activity className="w-4 h-4 mr-2" />
                        <span className="truncate">Lead: {project.teamLeadId?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => handleViewDetails(project)}
                        className="flex justify-center items-center w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View Details
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Project Detail Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedProject.title}</h3>
                  <p className="text-sm font-mono text-gray-400 uppercase tracking-wider">{selectedProject.projectNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* Status Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Activity size={14} /> Current Status
                  </div>
                  <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedProject.status)}`}>
                    {selectedProject.status}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Shield size={14} /> Department
                  </div>
                  <div className="text-gray-900 font-bold">{selectedProject.department}</div>
                </div>
              </div>

              {/* Client & Lead Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" /> Client Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {selectedProject.userId?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedProject.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail size={12} /> {selectedProject.userId?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-indigo-600" /> Assigned Lead
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {selectedProject.teamLeadId?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedProject.teamLeadId?.name || 'Unassigned'}</p>
                      <p className="text-xs text-gray-500">Project Supervisor</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" /> Project Timeline
                </h4>
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="text-indigo-400" size={20} />
                    <div>
                      <p className="text-xs font-semibold text-indigo-400 uppercase">Registration Date</p>
                      <p className="text-sm font-bold text-indigo-900">
                        {new Date(selectedProject.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                Close
              </button>
              <button className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                Manage Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
