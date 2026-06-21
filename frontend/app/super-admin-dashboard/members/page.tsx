'use client';
import React from 'react';
import Link from 'next/link';
import {
  UsersRound,
  Search,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  ChevronDown,
  MoreVertical,
  Building2,
  Activity,
  UserPlus
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

export default function MembersPage() {
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMember, setSelectedMember] = React.useState<any>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [selectedDepartment, setSelectedDepartment] = React.useState('All Departments');
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = React.useState(false);
  const [filterOptions, setFilterOptions] = React.useState<{ departments: string[], services: string[] }>({ departments: [], services: [] });

  const DEFINED_SERVICES = [
    'NGS',
    'Drug Discovery',
    'Software Development',
    'Microbiology',
    'BioChemistry',
    'Molecular Biology',
  ];

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMembers(response.data.data);
        const uniqueDepts = Array.from(new Set<string>(response.data.data.map((m: any) => m.department).filter(Boolean)));
        const apiServices: string[] = Array.from(new Set<string>(response.data.data.map((m: any) => m.service).filter(Boolean)));
        // Always show all 6 defined services; append any extra ones from DB
        const mergedServices = [...DEFINED_SERVICES, ...apiServices.filter((s: string) => !DEFINED_SERVICES.includes(s))];
        setFilterOptions({ departments: uniqueDepts, services: mergedServices });
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMembers();
  }, []);

  const handleUpdateStatus = async (isActive: boolean) => {
    if (!selectedMember?._id) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users/${selectedMember._id}/status`, {
        isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedMember((prev: any) => ({ ...prev, isActive }));
      fetchMembers();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateRole = async (role: string) => {
    if (!selectedMember?._id) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users/${selectedMember._id}/role`, {
        role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedMember((prev: any) => ({ ...prev, role }));
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setUpdating(false);
    }
  };

  const filteredMembers = members.filter(member =>
    (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (member.role && member.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (member.uniqueId && member.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter(member =>
    selectedDepartment === 'All Departments' ||
    member.department === selectedDepartment ||
    member.service === selectedDepartment
  );

  // Group members by department then service
  const groupedData = React.useMemo(() => {
    const groups: any = {};
    filteredMembers.forEach(member => {
      const dept = String(member.department || 'Unassigned Department');
      const service = String(member.service || 'Default Service');

      // Security: Prevent prototype pollution
      if (dept === '__proto__' || dept === 'constructor' || service === '__proto__' || service === 'constructor') return;

      if (!groups[dept]) groups[dept] = {};
      if (!groups[dept][service]) groups[dept][service] = [];
      groups[dept][service].push(member);
    });
    return groups;
  }, [filteredMembers]);

  const getRoleStyle = (role: string) => {
    const roles: any = {
      'superadmin': 'bg-violet-600 text-white border-violet-700',
      'admin': 'bg-blue-100 text-blue-800 border-blue-200',
      'head': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'manager': 'bg-amber-100 text-amber-800 border-amber-200',
      'tl': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'employee': 'bg-slate-100 text-slate-700 border-slate-200',
      'subadmin': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return roles[role?.toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getDeptColors = (dept: string) => {
    const hash = dept.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colorSchemes = [
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: 'bg-indigo-100 text-indigo-600', line: 'from-indigo-100' },
      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', line: 'from-emerald-100' },
      { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', icon: 'bg-rose-100 text-rose-600', line: 'from-rose-100' },
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', line: 'from-blue-100' },
      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', line: 'from-amber-100' },
      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', icon: 'bg-violet-100 text-violet-600', line: 'from-violet-100' },
      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', icon: 'bg-cyan-100 text-cyan-600', line: 'from-cyan-100' },
    ];
    return colorSchemes[hash % colorSchemes.length];
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50">
            <UsersRound size={12} className="text-indigo-400" />
            <span>Team Directory</span>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
              Member Directory
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
            </h2>
            <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">View and manage all staff members, their roles, and access status.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-600 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Search for a team member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[28px] text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-8 focus:ring-indigo-100/50 focus:border-indigo-200 shadow-sm w-72"
            />
          </div>
          <button className="px-8 py-5 bg-slate-900 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-violet-600 transition-all active:scale-95 flex items-center gap-3 group">
            <Download size={20} className="group-hover:translate-y-1 transition-transform" />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { title: 'Total Members', value: members.length.toString(), icon: UsersRound, variant: 'purple' as 'purple' },
          { title: 'Departments', value: filterOptions.departments.length.toString(), icon: Building2, variant: 'emerald' as 'emerald' },
          { title: 'Total Services', value: filterOptions.services.length.toString(), icon: Globe, variant: 'amber' as 'amber' },
          { title: 'Active Now', value: members.filter(m => m.isActive !== false).length.toString(), icon: Activity, variant: 'red' as 'red' }
        ].map((item, i) => (
          <SummaryCard
            key={i}
            title={item.title}
            value={item.value}
            change="0"
            status="up"
            icon={item.icon}
            variant={item.variant}
            description="Overall Count"
          />
        ))}
      </div>

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden flex flex-col group">
        <div className="bg-violet-600 px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 uppercase tracking-widest">
          <div className="relative">
            <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase tracking-widest">Team Structure</h3>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Browse team members by department and service</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
              className="flex items-center gap-3 bg-white/20 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest outline-none transition-all hover:bg-white/30"
            >
              <Globe size={14} className="text-white" />
              {selectedDepartment}
              <ChevronDown size={14} className={`transition-transform duration-300 ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDepartmentDropdownOpen && (
              <div className="absolute right-0 mt-16 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[60] py-4 max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 scrollbar-hide">
                <button
                  onClick={() => {
                    setSelectedDepartment('All Departments');
                    setIsDepartmentDropdownOpen(false);
                  }}
                  className={`block w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedDepartment === 'All Departments' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  All Departments
                </button>

                {filterOptions.departments.length > 0 && (
                  <>
                    <div className="px-5 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 border-t border-slate-50 pt-4">Departments</div>
                    {filterOptions.departments.map((dept, index) => (
                      <button
                        key={`dept-${index}`}
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setIsDepartmentDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedDepartment === dept ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {dept}
                      </button>
                    ))}
                  </>
                )}

                {filterOptions.services.length > 0 && (
                  <>
                    <div className="px-5 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2 border-t border-slate-50 pt-4">Services</div>
                    {filterOptions.services.map((service, index) => (
                      <button
                        key={`service-${index}`}
                        onClick={() => {
                          setSelectedDepartment(service);
                          setIsDepartmentDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedDepartment === service ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {service}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grouped Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <Loader2 className="animate-spin text-violet-600" size={56} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-violet-600 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading team directory...</p>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="mb-4 opacity-20">
                <UsersRound size={64} />
              </span>
              <p className="font-bold">No members found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedData).map(([deptName, services]: [string, any]) => {
                const colors = getDeptColors(deptName);
                return (
                  <div key={deptName} className="space-y-6">
                    {/* Department Header */}
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 ${colors.icon} rounded-2xl shadow-sm`}>
                        <Building2 size={24} />
                      </div>
                      <h2 className={`text-2xl font-black ${colors.text} tracking-tight flex items-center gap-3`}>
                        {deptName}
                        <span className={`px-3 py-1 ${colors.bg} ${colors.text} ${colors.border} border text-[11px] font-black rounded-full uppercase tracking-widest`}>
                          {Object.values(services).flat().length} Members
                        </span>
                      </h2>
                      <div className={`flex-grow h-[2px] bg-gradient-to-r ${colors.line} to-transparent`} />
                    </div>

                    {/* Services within Department */}
                    <div className="grid grid-cols-1 gap-8">
                      {Object.entries(services).map(([serviceName, memberList]: [string, any]) => (
                        <div key={serviceName} className="space-y-4">
                          <div className="flex items-center gap-2 ml-2">
                            <Activity size={14} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{serviceName}</h3>
                          </div>

                          <div className="max-h-[450px] overflow-auto rounded-3xl border border-slate-100 bg-white shadow-sm custom-table-scroll">
                            <table className="w-full">
                              <thead>
                                <tr className={`text-left text-[11px] font-black uppercase tracking-[0.15em] ${colors.bg} ${colors.text} border-b ${colors.border}`}>
                                  <th className="py-5 px-6">Staff Name</th>
                                  <th className="py-5 px-6">Position</th>
                                  <th className="py-5 px-6">Contact Info</th>
                                  <th className="py-5 px-6 text-center">Status</th>
                                  <th className="py-5 px-6 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {memberList.map((member: any, idx: number) => (
                                  <tr
                                    key={member._id || idx}
                                    className="group hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer border-b border-slate-50/50 last:border-0"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <td className="py-5 px-6">
                                      <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-1.5xl ${getRoleStyle(member.role)} flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                          {member.name ? member.name.charAt(0) : 'U'}
                                          {member.name && member.name.split(' ').length > 1 ? member.name.split(' ')[1].charAt(0) : ''}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-600">{member.name}</span>
                                          <span className="text-[10px] font-medium text-slate-400">ID: {member.uniqueId || `TS-2026-00${idx + 1}`}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-5 px-6">
                                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${getRoleStyle(member.role)} uppercase tracking-widest`}>
                                        {member.role || 'Personnel'}
                                      </span>
                                    </td>
                                    <td className="py-5 px-6">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                          <Mail size={12} className="text-slate-300" /> {member.email}
                                        </span>
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                          <Phone size={12} className="text-slate-300" /> {member.phone || '+91 94120-0000'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${member.isActive !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${member.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {member.isActive !== false ? 'Active' : 'Deactivated'}
                                      </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                      <Link
                                        href={`/super-admin-dashboard/member-creation/${member._id}/view`}
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:shadow-md transition-all active:scale-90 inline-block"
                                      >
                                        <ArrowUpRight size={18} />
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Member Management Modal */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-8 bg-gradient-to-br ${selectedMember.isActive !== false ? 'from-violet-50 to-white' : 'from-rose-50 to-white'} border-b border-slate-50 flex justify-between items-start`}>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2.5xl ${getRoleStyle(selectedMember.role)} flex items-center justify-center text-lg font-black shadow-lg`}>
                  {selectedMember.name?.charAt(0)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedMember.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedMember.role}</span>
                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMember.uniqueId}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2.5 bg-white rounded-xl border border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
              >
                <MoreVertical size={20} className="rotate-90" />
              </button>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Account Access</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      disabled={updating}
                      onClick={() => handleUpdateStatus(true)}
                      className={`group py-5 rounded-3xl text-xs font-bold uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-2 ${selectedMember.isActive !== false ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                    >
                      <CheckCircle size={20} className={selectedMember.isActive !== false ? '' : 'text-emerald-500'} />
                      Active
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleUpdateStatus(false)}
                      className={`group py-5 rounded-3xl text-xs font-bold uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-2 ${selectedMember.isActive === false ? 'bg-rose-600 text-white border-rose-600 shadow-xl shadow-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'}`}
                    >
                      <AlertCircle size={20} className={selectedMember.isActive === false ? '' : 'text-rose-500'} />
                      Deactivate
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Update Role</label>
                  <div className="relative">
                    <select
                      disabled={updating}
                      value={selectedMember.role?.toLowerCase()}
                      onChange={(e) => handleUpdateRole(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-violet-100 transition-all uppercase tracking-widest pr-12"
                    >
                      <option value="superadmin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="head">Head</option>
                      <option value="manager">Manager</option>
                      <option value="tl">Team Lead</option>
                      <option value="employee">Employee</option>
                      <option value="subadmin">Sub Admin</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <ShieldCheck size={20} className="text-violet-400" />
                  Safety logging enabled
                </div>
                {updating && <Loader2 className="animate-spin text-violet-400" size={20} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Global Scrollbar Style */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        ::-webkit-scrollbar-thumb {
          background: #8b5cf6; /* Violet-500 */
          border-radius: 10px;
          border: 2px solid #f8fafc;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #7c3aed; /* Violet-600 */
        }
        
        .custom-table-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-table-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
