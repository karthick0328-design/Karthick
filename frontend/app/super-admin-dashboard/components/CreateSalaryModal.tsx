'use client';

import React from 'react';
import { 
  X, 
  DollarSign, 
  Calendar, 
  User, 
  Briefcase, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Globe, 
  Percent,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

interface CreateSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
  viewOnly?: boolean;
}

export default function CreateSalaryModal({ isOpen, onClose, onSuccess, editData, viewOnly }: CreateSalaryModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [attendances, setAttendances] = React.useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = React.useState({ present: 0, absent: 0, late: 0 });
  const [fetchingUsers, setFetchingUsers] = React.useState(false);

  const [filterRole, setFilterRole] = React.useState('');
  const [filterService, setFilterService] = React.useState('');
  const [filterDepartment, setFilterDepartment] = React.useState('');
  
  const [formData, setFormData] = React.useState({
    userIds: [] as string[],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: 0,
    totalAllowances: 0,
    grossSalary: 0,
    attendanceDeductions: 0,
    holidayIncrements: 0,
    tds: 0,
    professionalTax: 0,
    epf: 0,
    esi: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    netSalary: 0,
    workingDays: 22,
    notes: '',
    status: 'pending'
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          userIds: [editData.userId?._id || editData.userId],
          month: editData.month,
          year: editData.year,
          basicSalary: editData.basicSalary,
          totalAllowances: editData.totalAllowances,
          grossSalary: editData.grossSalary,
          attendanceDeductions: editData.attendanceDeductions,
          holidayIncrements: editData.holidayIncrements,
          tds: editData.tds,
          professionalTax: editData.professionalTax,
          epf: editData.epf,
          esi: editData.esi,
          otherDeductions: editData.otherDeductions,
          totalDeductions: editData.totalDeductions,
          netSalary: editData.netSalary,
          workingDays: editData.workingDays || 22,
          notes: editData.notes || '',
          status: editData.status || 'pending'
        });
      } else {
        setFormData({
          userIds: [],
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basicSalary: 0,
          totalAllowances: 0,
          grossSalary: 0,
          attendanceDeductions: 0,
          holidayIncrements: 0,
          tds: 0,
          professionalTax: 0,
          epf: 0,
          esi: 0,
          otherDeductions: 0,
          totalDeductions: 0,
          netSalary: 0,
          workingDays: 22,
          notes: '',
          status: 'pending'
        });
      }
      fetchData();
    }
  }, [isOpen, editData]);

  const fetchData = async () => {
    try {
      setFetchingUsers(true);
      const token = localStorage.getItem('token');
      const [resUsers, resAtt] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/attendance/all`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resUsers.data.success) {
        setUsers(resUsers.data.data);
      }
      if (resAtt.data.success) {
        setAttendances(resAtt.data.data);
      }
    } catch (error) {
      console.error('Error fetching salary prerequisites:', error);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Auto-calculate rates when user changes
  React.useEffect(() => {
    if (!editData && formData.userIds.length === 1) {
      const userId = formData.userIds[0];
      const user = users.find(u => u._id === userId);
      const savedConfigs = localStorage.getItem('salary_rate_matrix');
      
      if (user && savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        let baseSalary = 0;
        
        const uDept = (user.department || '').trim();
        const uServ = (user.service || '').trim();
        const uRole = (user.role || '').trim();

        const tripleKey = `${uDept}_${uServ}_${uRole}`;
        const deptServiceKey = `${uDept}_${uServ}`;
        const roleDeptKey = `${uRole}_${uDept}`;
        const roleServiceKey = `${uRole}_${uServ}`;

        if (configs.deptServiceRoles && configs.deptServiceRoles[tripleKey]) {
          baseSalary = configs.deptServiceRoles[tripleKey];
        } else if (configs.deptServices && configs.deptServices[deptServiceKey]) {
          baseSalary = configs.deptServices[deptServiceKey];
        } else if (configs.roleDepts && configs.roleDepts[roleDeptKey]) {
          baseSalary = configs.roleDepts[roleDeptKey];
        } else if (configs.roleServices && configs.roleServices[roleServiceKey]) {
          baseSalary = configs.roleServices[roleServiceKey];
        } else if (configs.roles && configs.roles[uRole]) {
          baseSalary = configs.roles[uRole];
        } else if (configs.departments && configs.departments[uDept]) {
          baseSalary = configs.departments[uDept];
        } else if (configs.services && configs.services[uServ]) {
          baseSalary = configs.services[uServ];
        }

        const allowances = configs.allowances?.[uRole] || 0;
        const baseIncrement = configs.increments?.[uRole] || 0;
        const taxes = configs.taxDeductions || { tds: 0, epf: 0, esi: 0, pt: 0 };

        setFormData(prev => ({ 
          ...prev, 
          basicSalary: baseSalary,
          totalAllowances: allowances,
          holidayIncrements: baseIncrement,
          tds: taxes.tds || 0,
          epf: taxes.epf || 0,
          esi: taxes.esi || 0,
          professionalTax: taxes.pt || 0
        }));
      }
    }
  }, [formData.userIds, users, editData]);

  // Auto-calculate attendance stats
  React.useEffect(() => {
    const fetchAttendanceAndCalc = async () => {
      if (formData.userIds.length === 1) {
        const userId = formData.userIds[0];
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/attendance/all?month=${formData.month}&year=${formData.year}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data.success) {
            const userAttendances = res.data.data.filter((a: any) => (a.userId?._id === userId || a.userId === userId));
            const stats = {
              present: userAttendances.filter((a: any) => a.status === 'present').length,
              absent: userAttendances.filter((a: any) => a.status === 'absent').length,
              late: userAttendances.filter((a: any) => a.status === 'late').length,
            };
            setAttendanceStats(stats);

            const savedConfigs = localStorage.getItem('salary_rate_matrix');
            if (savedConfigs) {
              const configs = JSON.parse(savedConfigs);
              const rates = configs.attendanceRates || { present: 0, absent: 0, late: 0 };
              const currentRole = (users.find(u => u._id === userId)?.role || '').trim();
              const baseIncrement = configs.increments?.[currentRole] || 0;
              
              const reward = stats.present * (rates.present || 0);
              const totalReward = baseIncrement + reward;
              const deduction = (stats.absent * (rates.absent || 0)) + (stats.late * (rates.late || 0));
              
              setFormData(prev => ({ 
                ...prev, 
                holidayIncrements: totalReward,
                attendanceDeductions: deduction 
              }));
            }
          }
        } catch (error) {
          console.error('Error auto-scanning attendance protocol:', error);
        }
      }
    };

    if (isOpen) {
      fetchAttendanceAndCalc();
    }
  }, [formData.userIds, formData.month, formData.year, isOpen, users]);

  // Sync net salary
  React.useEffect(() => {
    const gross = (Number(formData.basicSalary) || 0) + (Number(formData.totalAllowances) || 0) + (Number(formData.holidayIncrements) || 0);
    const deductions = (Number(formData.attendanceDeductions) || 0) + (Number(formData.tds) || 0) + (Number(formData.professionalTax) || 0) + (Number(formData.epf) || 0) + (Number(formData.esi) || 0) + (Number(formData.otherDeductions) || 0);
    const net = gross - deductions;
    
    setFormData(prev => ({
      ...prev,
      grossSalary: gross,
      totalDeductions: deductions,
      netSalary: net
    }));
  }, [formData.basicSalary, formData.totalAllowances, formData.holidayIncrements, formData.attendanceDeductions, formData.tds, formData.professionalTax, formData.epf, formData.esi, formData.otherDeductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userIds.length === 0) return alert('Please select at least one user');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (editData) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary/${editData._id}`, 
          { ...formData, userId: formData.userIds[0] }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const requests = formData.userIds.map(uid => {
          const { userIds, ...rest } = formData;
          return axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary`, 
            { ...rest, userId: uid }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        });
        await Promise.all(requests);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error handling salary submission:', error);
      alert(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl rounded-[64px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4 font-serif italic italic leading-none">
               {viewOnly ? 'Record Inspection' : editData ? 'Edit Compensation' : 'Payroll Initiation'}
               <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse" />
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">
                System Logic: G-Matrix Protocol V4.2
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-5 hover:bg-white rounded-[24px] transition-all hover:rotate-90 text-slate-300 hover:text-rose-500 shadow-sm border border-transparent hover:border-rose-100"
          >
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-12 overflow-y-auto flex-1">
          {/* Status Protocol Scan Visualizer */}
          {formData.userIds.length === 1 && (
            <div className="grid grid-cols-3 gap-6 p-8 bg-slate-900 rounded-[40px] border border-white/10 shadow-3xl animate-in slide-in-from-top-6 duration-700">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Present Pulse</span>
                    <div className="text-4xl font-black text-white italic leading-none">{attendanceStats.present}</div>
                    <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Active Signals</div>
                </div>
                <div className="flex flex-col items-center border-x border-white/5">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Absent Void</span>
                    <div className="text-4xl font-black text-white italic leading-none">{attendanceStats.absent}</div>
                    <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Loss Nodes</div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Late Protocol</span>
                    <div className="text-4xl font-black text-white italic leading-none">{attendanceStats.late}</div>
                    <div className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Penalties Detected</div>
                </div>
            </div>
          )}

          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 p-8 rounded-[40px] border border-slate-100 relative group">
             <div className="absolute -top-3 left-8 px-4 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Sector Discovery Filters</p>
             </div>
             {[
               { label: 'Role Filter', val: filterRole, set: setFilterRole, options: Array.from(new Set(users.map(u => u.role))) },
               { label: 'Service Node', val: filterService, set: setFilterService, options: Array.from(new Set(users.map(u => u.service))) },
               { label: 'Division Group', val: filterDepartment, set: setFilterDepartment, options: Array.from(new Set(users.map(u => u.department))) }
             ].map((f, idx) => (
                <div key={idx} className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 italic">{f.label}</label>
                    <select value={f.val} disabled={viewOnly || !!editData} onChange={e => f.set(e.target.value)} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[24px] text-xs font-black text-slate-900 outline-none focus:border-indigo-600 transition-all appearance-none cursor-pointer">
                        <option value="">All Scopes</option>
                        {f.options.filter(Boolean).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
             ))}
          </div>

          {/* Section 1: Core Selection */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-12">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">
                   <User size={16} className="text-indigo-600" /> Allocation Target Selection
                 </label>
                 <span className="text-[10px] font-black text-indigo-600 italic uppercase tracking-widest">{formData.userIds.length} targets identified</span>
              </div>
              <div className="flex flex-wrap gap-3 max-h-56 overflow-y-auto p-8 bg-slate-50 border border-slate-100 rounded-[48px] shadow-inner">
                {users
                  .filter(u => (!filterRole || u.role === filterRole) && (!filterService || u.service === filterService) && (!filterDepartment || u.department === filterDepartment))
                  .map(user => {
                    const isSelected = formData.userIds.includes(user._id);
                    return (
                      <button
                        key={user._id}
                        type="button"
                        disabled={viewOnly || (!!editData && !isSelected)}
                        onClick={() => {
                          const newIds = isSelected 
                            ? formData.userIds.filter(id => id !== user._id)
                            : [...formData.userIds, user._id];
                          setFormData({ ...formData, userIds: newIds });
                        }}
                        className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border shadow-sm ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'} disabled:opacity-50`}
                      >
                        {user.name} <span className="opacity-40 ml-2">#{user.uniqueId}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                     <Calendar size={14} className="text-indigo-600" /> Fiscal Period (Month)
                  </label>
                  <input type="number" min="1" max="12" value={formData.month} disabled={viewOnly} onChange={(e) => setFormData({...formData, month: Number(e.target.value)})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:bg-white focus:ring-8 focus:ring-indigo-50 outline-none transition-all disabled:opacity-50" />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                     <Globe size={14} className="text-indigo-600" /> Operational Cycle (Year)
                  </label>
                  <input type="number" min="2020" value={formData.year} disabled={viewOnly} onChange={(e) => setFormData({...formData, year: Number(e.target.value)})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:bg-white focus:ring-8 focus:ring-indigo-50 outline-none transition-all disabled:opacity-50" />
               </div>
          </div>

          {/* Section 2: Compensation Node Calibration */}
          <div className="bg-indigo-50/50 p-10 rounded-[64px] border border-indigo-100 space-y-12 shadow-2xl shadow-indigo-100/30 animate-in slide-in-from-bottom-10 duration-700">
             <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-200">
                    <Zap size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none italic uppercase">Growth Vector Calibration</h3>
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Foundational Matrix & Resource Payouts</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                {[
                  { label: 'Operational Base', key: 'basicSalary', icon: DollarSign, color: 'indigo' },
                  { label: 'Aggregate Allowances', key: 'totalAllowances', icon: Plus, color: 'indigo' },
                  { label: 'Cycle Increments', key: 'holidayIncrements', icon: TrendingUp, color: 'emerald' },
                  { label: 'Duty Cycles', key: 'workingDays', icon: Calendar, color: 'indigo' }
                ].map((field) => (
                  <div key={field.key} className="space-y-3 group/node">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 italic group-hover/node:text-indigo-600 transition-colors">{field.label}</label>
                    <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                        <input 
                            type="number"
                            value={(formData as any)[field.key]}
                            disabled={viewOnly}
                            onChange={(e) => setFormData({...formData, [field.key]: Number(e.target.value)})}
                            className={`w-full pl-12 pr-6 py-5 ${field.color === 'emerald' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900 focus:ring-emerald-100' : 'bg-white border-indigo-100 text-indigo-900 focus:ring-indigo-100'} rounded-[32px] text-sm font-black focus:ring-8 outline-none transition-all disabled:opacity-50`}
                        />
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Section 3: Deduction Protocol Scan */}
          <div className="bg-rose-50/50 p-10 rounded-[64px] border border-rose-100 space-y-12 shadow-2xl shadow-rose-100/30 animate-in slide-in-from-bottom-10 delay-150 duration-700">
             <div className="flex items-center gap-5">
                <div className="p-4 bg-rose-600 text-white rounded-[24px] shadow-xl shadow-rose-200">
                    <ShieldCheck size={24} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none italic uppercase">Deduction Protocol Scan</h3>
                   <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-2">Compliance Nodes & Presence Voids</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[
                  { label: 'Presence Void', key: 'attendanceDeductions' },
                  { label: 'Internal TDS', key: 'tds' },
                  { label: 'Social EPF', key: 'epf' },
                  { label: 'State Tax (PT)', key: 'professionalTax' },
                  { label: 'System ESI', key: 'esi' },
                  { label: 'Misc Voids', key: 'otherDeductions' }
                ].map((field) => (
                   <div key={field.key} className="space-y-3 group/deduct">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 italic truncate group-hover/deduct:text-rose-600 block">{field.label}</label>
                      <div className="relative">
                         <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-black italic">₹</span>
                         <input 
                            type="number"
                            value={(formData as any)[field.key]}
                            disabled={viewOnly}
                            onChange={(e) => setFormData({...formData, [field.key]: Number(e.target.value)})}
                            className="w-full pl-10 pr-4 py-4 bg-white border border-rose-100 rounded-[28px] text-xs font-black text-rose-900 focus:ring-8 focus:ring-rose-50 outline-none transition-all disabled:opacity-50"
                         />
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Section 4: Net Disbursement Matrix Finalization */}
          <div className="bg-slate-900 px-10 py-10 rounded-[64px] shadow-3xl flex flex-col xl:flex-row items-center justify-between gap-8 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/20 transition-all duration-700" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 w-full xl:w-auto relative z-10">
                  <div className="space-y-1.5 border-l-2 border-white/5 pl-6">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] italic leading-none opacity-80">GROSS MATRIX CORE</p>
                      <h4 className="text-3xl font-black text-white italic tracking-tighter leading-none hover:text-indigo-400 transition-colors duration-300">₹{formData.grossSalary.toLocaleString()}</h4>
                  </div>
                  
                  <div className="space-y-1.5 border-l-2 border-white/5 pl-6">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] italic leading-none opacity-80">TOTAL VECTORS LOSS</p>
                      <h4 className="text-3xl font-black text-white italic tracking-tighter leading-none hover:text-rose-400 transition-colors duration-300">₹{formData.totalDeductions.toLocaleString()}</h4>
                  </div>
                  
                  <div className="space-y-1.5 bg-white/5 p-6 rounded-[32px] border border-white/10 shadow-inner group-hover:border-indigo-500/30 transition-all duration-500">
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] italic leading-none opacity-80">NET DISBURSEMENT PULSE</p>
                      <h4 className="text-4xl font-black text-white italic tracking-tighter font-serif leading-none mt-1">₹{formData.netSalary.toLocaleString()}</h4>
                  </div>
              </div>
              
              {!viewOnly && (
                <div className="relative z-10 w-full xl:w-auto">
                   <button 
                     type="submit"
                     disabled={loading}
                     className="w-full px-14 py-7 bg-indigo-600 text-white rounded-[40px] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/40 hover:bg-white hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-5 group/btn italic ring-8 ring-transparent hover:ring-indigo-500/20"
                   >
                     {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} className="group-hover/btn:scale-125 transition-transform duration-500" />}
                     {editData ? 'SYNC G-NODES' : 'DEPLOY DISBURSEMENT'}
                   </button>
                </div>
              )}
          </div>
        </form>
      </div>
    </div>
  );
}
