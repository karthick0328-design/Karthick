'use client';

import React from 'react';
import { 
  X, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Megaphone,
  Briefcase,
  Monitor,
  Calendar,
  Type,
  AlignLeft,
  Send,
  Zap,
  Plus,
  Paperclip,
  ArrowUpRight,
  Link,
  GripHorizontal,
  DollarSign,
  Globe,
  Languages,
  Activity
} from 'lucide-react';
import axios from 'axios';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'Announcement' | 'Advertisement' | 'Job Opening';
  onSuccess: () => void;
  initialData?: any;
}

export default function CreateAnnouncementModal({ isOpen, onClose, category, onSuccess, initialData }: CreateAnnouncementModalProps) {
  const [formData, setFormData] = React.useState({
    title: '',
    content: '',
    category: category,
    expiresAt: '',
    status: 'Active',
    department: '',
    service: '',
    experienceLevel: '',
    salaryRange: '',
    requiredSkills: '',
    location: '',
    platforms: [] as string[],
    budget: '',
    duration: '',
    employmentType: 'Full-time',
    priority: 'Medium',
    links: '',
    requirements: '',
    qualification: '',
    openingsCount: '1',
    minSalary: '',
    maxSalary: '',
    currency: 'INR',
    expectedJoiningDate: '',
    endingDate: '',
    autoClose: false,
    itemType: category,
    announcementType: 'General company notifications',
    scheduleType: 'Immediate',
    scheduledDate: '',
    visibilityRole: [] as string[],
    visibilityDepartment: [] as string[],
    visibilityService: [] as string[],
    visibilityUser: [] as string[]
  });
  
  const [imageFiles, setImageFiles] = React.useState<FileList | null>(null);
  const [attachmentFiles, setAttachmentFiles] = React.useState<FileList | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Effect 1: Populate form when initialData is provided (Full Context / Edit)
  React.useEffect(() => {
    if (!initialData) return;
    setFormData({
      title: initialData.title || initialData.jobTitle || '',
      content: initialData.content || initialData.description || '',
      category: initialData.category || category,
      expiresAt: initialData.expiresAt ? new Date(initialData.expiresAt).toISOString().split('T')[0] : '',
      status: initialData.status || 'Active',
      department: initialData.department || '',
      service: initialData.service || '',
      experienceLevel: initialData.experienceLevel || '',
      salaryRange: initialData.salaryRange || '',
      requiredSkills: Array.isArray(initialData.requiredSkills) ? initialData.requiredSkills.join(', ') : (initialData.requiredSkills || ''),
      location: initialData.location || '',
      platforms: initialData.platforms || [],
      budget: initialData.budget || '',
      duration: initialData.duration || '',
      employmentType: initialData.employmentType || 'Full-time',
      priority: initialData.priority || 'Medium',
      links: Array.isArray(initialData.links) ? initialData.links.join(', ') : (initialData.links || ''),
      requirements: Array.isArray(initialData.requirements) ? initialData.requirements.join(', ') : (initialData.requirements || ''),
      qualification: initialData.qualification || '',
      openingsCount: initialData.openingsCount || '1',
      minSalary: initialData.minSalary || '',
      maxSalary: initialData.maxSalary || '',
      currency: initialData.currency || 'INR',
      expectedJoiningDate: initialData.expectedJoiningDate ? new Date(initialData.expectedJoiningDate).toISOString().split('T')[0] : '',
      endingDate: initialData.endingDate ? new Date(initialData.endingDate).toISOString().split('T')[0] : '',
      autoClose: initialData.autoClose || false,
      itemType: initialData.category || category,
      announcementType: initialData.announcementType || 'General company notifications',
      scheduleType: initialData.scheduleType || 'Immediate',
      scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate).toISOString().split('T')[0] : '',
      visibilityRole: Array.isArray(initialData.visibilityRole) ? initialData.visibilityRole : (typeof initialData.visibilityRole === 'string' && initialData.visibilityRole ? initialData.visibilityRole.split(',').map((s: string) => s.trim()) : []),
      visibilityDepartment: Array.isArray(initialData.visibilityDepartment) ? initialData.visibilityDepartment : (typeof initialData.visibilityDepartment === 'string' && initialData.visibilityDepartment ? initialData.visibilityDepartment.split(',').map((s: string) => s.trim()) : []),
      visibilityService: Array.isArray(initialData.visibilityService) ? initialData.visibilityService : (typeof initialData.visibilityService === 'string' && initialData.visibilityService ? initialData.visibilityService.split(',').map((s: string) => s.trim()) : []),
      visibilityUser: Array.isArray(initialData.visibilityUser) ? initialData.visibilityUser : (typeof initialData.visibilityUser === 'string' && initialData.visibilityUser ? initialData.visibilityUser.split(',').map((s: string) => s.trim()) : [])
    });
  }, [initialData]);

  // Effect 2: Reset form only when opening fresh (no initialData)
  React.useEffect(() => {
    if (isOpen && !initialData) {
      setFormData(prev => ({
        ...prev,
        title: '',
        content: '',
        category: category,
        itemType: category,
        expiresAt: '',
        status: 'Active',
        announcementType: 'General company notifications',
        scheduleType: 'Immediate',
        scheduledDate: '',
        visibilityRole: [],
        visibilityDepartment: [],
        visibilityService: [],
        visibilityUser: []
      }));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const submitData = new FormData();
      
      // Append all text fields
      Object.keys(formData).forEach(key => {
          if (['platforms', 'requiredSkills', 'links', 'requirements', 'visibilityRole', 'visibilityDepartment', 'visibilityService', 'visibilityUser'].includes(key)) {
              // Ensure arrays are serialized or sent as strings for backend mapping
              const value = formData[key as keyof typeof formData];
              submitData.append(key, Array.isArray(value) ? value.join(',') : value as string);
          } else {
              submitData.append(key, String(formData[key as keyof typeof formData]));
          }
      });

      // Map content to description for the backend
      submitData.append('description', formData.content);
      submitData.append('jobTitle', formData.title);

      // Append files
      if (imageFiles) {
          for (let i = 0; i < imageFiles.length; i++) {
              submitData.append('images', imageFiles[i]);
          }
      }
      if (attachmentFiles) {
          for (let i = 0; i < attachmentFiles.length; i++) {
              submitData.append('attachments', attachmentFiles[i]);
          }
      }

      const endpoint = initialData 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements/${initialData._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/announcements`;

      const response = await axios({
        method: initialData ? 'PUT' : 'POST',
        url: endpoint,
        data: submitData,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        onSuccess();
        onClose();
        setFormData({
            title: '',
            content: '',
            category: category,
            expiresAt: '',
            status: 'Active',
            department: '',
            service: '',
            experienceLevel: '',
            salaryRange: '',
            requiredSkills: '',
            location: '',
            platforms: [],
            budget: '',
            duration: '',
            employmentType: 'Full-time',
            priority: 'Medium',
            links: '',
            requirements: '',
            qualification: '',
            openingsCount: '1',
            minSalary: '',
            maxSalary: '',
            currency: 'INR',
            expectedJoiningDate: '',
            endingDate: '',
            autoClose: false,
            itemType: category,
            announcementType: 'General company notifications',
            scheduleType: 'Immediate',
            scheduledDate: '',
            visibilityRole: [],
            visibilityDepartment: [],
            visibilityService: [],
            visibilityUser: []
        });
        setImageFiles(null);
        setAttachmentFiles(null);
      }
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || 'Error creating announcement';
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getIcon = () => {
    switch (category) {
      case 'Advertisement': return <Monitor size={20} />;
      case 'Job Opening': return <Briefcase size={20} />;
      default: return <Megaphone size={20} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-10 pb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-lg shadow-indigo-100">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                {category === 'Advertisement' ? 'Market Advertisement' : category === 'Job Opening' ? 'Enterprise Vacancy' : 'Global Announcement'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strategic Multi-Channel Distribution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 pt-0 space-y-10 custom-scrollbar">
          {formData.category === 'Announcement' ? (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                    Announcement Type
                  </label>
                  <select 
                      required 
                      value={formData.announcementType} 
                      onChange={(e) => setFormData({...formData, announcementType: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  >
                    <option value="General company notifications">General company notifications</option>
                    <option value="Job opening alerts">Job opening alerts</option>
                    <option value="Interview schedules">Interview schedules</option>
                    <option value="Policy updates">Policy updates</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                    Status
                  </label>
                  <select 
                      required 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  >
                    <option value="Published">Published</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                    Schedule Type
                  </label>
                  <select 
                      required 
                      value={formData.scheduleType} 
                      onChange={(e) => setFormData({...formData, scheduleType: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                {formData.scheduleType === 'scheduled' ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                      Scheduled Date
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            required
                            type="date"
                            value={formData.scheduledDate}
                            onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic"
                        />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3"></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                      Auto Expire After Date
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="date"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic"
                        />
                    </div>
                  </div>
              </div>

              <div className="space-y-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                 <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                    Visibility (Shown based on)
                 </label>
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center pr-2">
                            <span>Role</span>
                        </label>
                        <select value={formData.visibilityRole[0] || ''} onChange={(e) => setFormData({...formData, visibilityRole: [e.target.value]})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none uppercase italic appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px] bg-[right:16px_center] bg-no-repeat transition-all">
                            <option value="">ALL ROLES</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="head">Head</option>
                            <option value="tl">Team Lead (TL)</option>
                            <option value="employee">Employee</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center pr-2">
                            <span>Department</span>
                        </label>
                        <select value={formData.visibilityDepartment[0] || ''} onChange={(e) => setFormData({...formData, visibilityDepartment: [e.target.value]})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none uppercase italic appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px] bg-[right:16px_center] bg-no-repeat transition-all">
                            <option value="">ALL DEPARTMENTS</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Financial">Financial</option>
                            <option value="Sales & Customer Services">Sales & Customer Services</option>
                            <option value="Software Development">Software Development</option>
                            <option value="Molecular Biology">Molecular Biology</option>
                            <option value="NGS">NGS</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center pr-2">
                            <span>Services</span>
                        </label>
                        <select value={formData.visibilityService[0] || ''} onChange={(e) => setFormData({...formData, visibilityService: [e.target.value]})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none uppercase italic appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px] bg-[right:16px_center] bg-no-repeat transition-all">
                            <option value="">ALL SERVICES</option>
                            <option value="NGS Analysis">NGS Analysis</option>
                            <option value="Drug Discovery">Drug Discovery</option>
                            <option value="Microbiology">Microbiology</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">User ID (comma separated)</label>
                        <input type="text" placeholder="e.g. user ids" value={formData.visibilityUser.join(', ')} onChange={(e) => setFormData({...formData, visibilityUser: e.target.value.split(',').map(s=>s.trim())})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none" />
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                  Announcement Message / Notification Header
                </label>
                <div className="relative">
                    <AlignLeft className="absolute left-4 top-6 text-slate-400" size={18} />
                    <textarea 
                        required
                        rows={4}
                        placeholder="Type announcement message here..."
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value, title: e.target.value.substring(0, 50) + (e.target.value.length > 50 ? '...' : '')})}
                        className="w-full pl-12 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic placeholder:text-slate-200 resize-none"
                    />
                </div>
              </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                Strategic Category
              </label>
              <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-indigo-600 italic uppercase">
                {formData.category}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
                Expiry Date
              </label>
              <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic"
                  />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
              {(formData.category === 'Job Opening' || formData.category === 'Advertisement') ? 'Job Title' : 'Communication Title'}
            </label>
            <div className="relative">
                <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    required
                    type="text"
                    placeholder="ENTER TITLE..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic placeholder:text-slate-200"
                />
            </div>
          </div>

          {(formData.category === 'Job Opening') && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Department</label>
                  <select required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="">SELECT DEPARTMENT</option>
                    <option value="Without Department">WITHOUT DEPARTMENT</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Financial">Financial</option>
                    <option value="Sales & Customer Services">Sales & Customer Services</option>
                    <option value="Software Development">Software Development</option>
                    <option value="Molecular Biology">Molecular Biology</option>
                    <option value="NGS">NGS</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Service</label>
                  <select required value={formData.service} onChange={(e) => setFormData({...formData, service: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="">SELECT SERVICE</option>
                    <option value="Without Service">WITHOUT SERVICE</option>
                    <option value="NGS Analysis">NGS Analysis</option>
                    <option value="Drug Discovery">Drug Discovery</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Employment Type</label>
                  <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic font-red-500">Priority Level</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent 🔥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Location (Physical/Remote)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="e.g. REMOTE, MUMBAI..." value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Links (e.g. LinkedIn, Portfolio)</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="URL1, URL2..." value={formData.links} onChange={(e) => setFormData({...formData, links: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Requirements (Comma separated tags)</label>
                <div className="relative">
                    <GripHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="BACHELORS, MASTERS, 5+ YEARS..." value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Qualification</label>
                  <div className="relative">
                    <Languages className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="e.g. B.TECH, PHD..." value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Experience Level</label>
                  <input type="text" placeholder="e.g. 3-5 YEARS..." value={formData.experienceLevel} onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Min Salary</label>
                  <input type="number" placeholder="50000" value={formData.minSalary} onChange={(e) => setFormData({...formData, minSalary: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Max Salary</label>
                  <input type="number" placeholder="100000" value={formData.maxSalary} onChange={(e) => setFormData({...formData, maxSalary: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Currency</label>
                  <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic appearance-none focus:ring-4 focus:ring-indigo-100">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">No. of Openings</label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="number" value={formData.openingsCount} onChange={(e) => setFormData({...formData, openingsCount: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Joining Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" value={formData.expectedJoiningDate} onChange={(e) => setFormData({...formData, expectedJoiningDate: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic italic italic">Ending Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="date" value={formData.endingDate} onChange={(e) => setFormData({...formData, endingDate: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Auto-Close Vacancy</h5>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1">Archive opening automatically once positions are filled</p>
                </div>
                <div 
                  onClick={() => setFormData({...formData, autoClose: !formData.autoClose})}
                  className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.autoClose ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.autoClose ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Required Skills (Comma separated)</label>
                <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="e.g. REACT, NODEJS..." value={formData.requiredSkills} onChange={(e) => setFormData({...formData, requiredSkills: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Upload Header/Job Images</label>
                <div className="relative">
                  <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(e.target.files)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-black text-slate-900 file:hidden" />
                </div>
              </div>
            </>
          )}

          {formData.category === 'Advertisement' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Location</label>
                  <input type="text" placeholder="e.g. REMOTE, HYBRID..." value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic whitespace-nowrap">Upload Ad Images</label>
                  <div className="relative">
                    <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(e.target.files)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic file:hidden" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Ad Budget</label>
                  <input type="text" placeholder="e.g. $500..." value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Duration (Days)</label>
                  <input type="number" placeholder="30" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Target Department</label>
                  <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="">SELECT DEPARTMENT</option>
                    <option value="Without Department">WITHOUT DEPARTMENT</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Financial">Financial</option>
                    <option value="Sales & Customer Services">Sales & Customer Services</option>
                    <option value="Software Development">Software Development</option>
                    <option value="Molecular Biology">Molecular Biology</option>
                    <option value="NGS">NGS</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Target Service</label>
                  <select value={formData.service} onChange={(e) => setFormData({...formData, service: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none italic uppercase appearance-none focus:ring-4 focus:ring-indigo-100 transition-all">
                    <option value="">SELECT SERVICE</option>
                    <option value="Without Service">WITHOUT SERVICE</option>
                    <option value="NGS Analysis">NGS Analysis</option>
                    <option value="Drug Discovery">Drug Discovery</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Experience Needed</label>
                  <input type="text" placeholder="e.g. 2+ YRS..." value={formData.experienceLevel} onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Salary Range</label>
                  <input type="text" placeholder="e.g. $5k - $10k..." value={formData.salaryRange} onChange={(e) => setFormData({...formData, salaryRange: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Target Audience Skills (Comma separated)</label>
                <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="e.g. MARKETING, DESIGN..." value={formData.requiredSkills} onChange={(e) => setFormData({...formData, requiredSkills: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none italic" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">Platforms Selection</label>
                <div className="flex flex-wrap gap-4 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                  {['Meta', 'Google Ads', 'LinkedIn', 'YouTube', 'Twitter'].map(platform => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" checked={formData.platforms.includes(platform)} onChange={() => {
                            const newPlatforms = formData.platforms.includes(platform) ? formData.platforms.filter(p => p !== platform) : [...formData.platforms, platform];
                            setFormData({...formData, platforms: newPlatforms});
                          }} className="peer sr-only" />
                        <div className="w-5 h-5 bg-white border-2 border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all" />
                        <CheckCircle className="absolute inset-0 m-auto text-white scale-0 peer-checked:scale-75 transition-transform" size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-indigo-600">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
              Attachments (Reports/Docs)
            </label>
            <div className="relative">
                <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="file"
                    multiple
                    onChange={(e) => setAttachmentFiles(e.target.files)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic file:hidden"
                />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1 italic">
              {(formData.category === 'Job Opening' || formData.category === 'Advertisement') ? 'Description Intel' : 'Core Content Payload'}
            </label>
            <div className="relative">
                <AlignLeft className="absolute left-4 top-6 text-slate-400" size={18} />
                <textarea 
                    required
                    rows={4}
                    placeholder="DESCRIBE THE CORE INTEL..."
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full pl-12 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic placeholder:text-slate-200 resize-none"
                />
            </div>
          </div>
          </>
          )}

          {/* Fixed Footer for Button */}
          <div className="pt-6 shrink-0 sticky bottom-0 bg-white pb-0">
            <button 
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-slate-900 text-white rounded-[32px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    Deploy Strategic {category === 'Advertisement' ? 'Campaign' : category === 'Job Opening' ? 'Vacancy' : 'Asset'} 
                    <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
