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
  CheckCircle,
  ArrowLeft,
  Settings,
  Database,
  Search,
  Filter,
  Users,
  Target,
  ChevronRight,
  Info,
  Layers,
  Building2,
  Stethoscope
} from 'lucide-react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SalaryInitiationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const viewOnly = searchParams.get('viewOnly') === 'true';

  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [attendances, setAttendances] = React.useState<any[]>([]);
  const [fetchingData, setFetchingData] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterRole, setFilterRole] = React.useState('');
  const [filterService, setFilterService] = React.useState('');
  const [filterDepartment, setFilterDepartment] = React.useState('');
  
  // Base inputs (Matrix Template)
  const [formData, setFormData] = React.useState({
    userIds: [] as string[],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: 0,
    totalAllowances: 0,
    attendanceDeductions: 0,
    holidayIncrements: 0,
    tds: 0,
    professionalTax: 0,
    epf: 0,
    esi: 0,
    otherDeductions: 0,
    workingDays: 22,
    notes: '',
    status: 'pending'
  });

  // NEW: Individual Member Calculation Data Store
  const [memberCalculations, setMemberCalculations] = React.useState<Record<string, any>>({});

  const fetchData = async () => {
    try {
      setFetchingData(true);
      const token = localStorage.getItem('token');
      const [resUsers, resAtt] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/attendance/all`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resUsers.data.success) setUsers(resUsers.data.data);
      if (resAtt.data.success) setAttendances(resAtt.data.data);

      if (editId) {
        const resEdit = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary/${editId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resEdit.data.success) {
          const d = resEdit.data.data;
          setFormData({
            userIds: [d.userId?._id || d.userId],
            month: d.month,
            year: d.year,
            basicSalary: d.basicSalary,
            totalAllowances: d.totalAllowances,
            attendanceDeductions: d.attendanceDeductions,
            holidayIncrements: d.holidayIncrements,
            tds: d.tds,
            professionalTax: d.professionalTax,
            epf: d.epf,
            esi: d.esi,
            otherDeductions: d.otherDeductions,
            workingDays: d.workingDays || 22,
            notes: d.notes || '',
            status: d.status || 'pending'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching initiation prerequisites:', error);
    } finally {
      setFetchingData(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [editId]);

  // Unified Multi-Member Calculation Logic
  const recalculateBatch = React.useCallback(async () => {
    if (formData.userIds.length === 0) {
      setMemberCalculations({});
      return;
    }

    const savedConfigs = localStorage.getItem('salary_rate_matrix');
    if (!savedConfigs) return;

    const configs = JSON.parse(savedConfigs);
    const newCalcs: Record<string, any> = {};

    for (const userId of formData.userIds) {
      const user = users.find(u => u._id === userId);
      if (!user) continue;

      // 1. Base Rates from Matrix
      let baseSalary = 0;
      const uDept = (user.department || '').trim();
      const uServ = (user.service || '').trim();
      const uRole = (user.role || '').trim();

      const tripleKey = `${uDept}_${uServ}_${uRole}`;
      if (configs.deptServiceRoles?.[tripleKey]) {
        baseSalary = configs.deptServiceRoles[tripleKey];
      } else if (configs.roles?.[uRole]) {
        baseSalary = configs.roles[uRole];
      } else if (configs.departments?.[uDept]) {
        baseSalary = configs.departments[uDept];
      }

      const allowances = configs.allowances?.[uRole] || 0;
      const baseIncrement = configs.increments?.[uRole] || 0;
      const taxes = configs.taxDeductions || { tds: 0, epf: 0, esi: 0, pt: 0 };

      // 2. Attendance Stats
      const userAtts = attendances.filter(a => 
        (a.userId?._id === userId || a.userId === userId) && 
        (new Date(a.date).getMonth() + 1 === formData.month) && 
        (new Date(a.date).getFullYear() === formData.year)
      );
      
      const stats = {
        present: userAtts.filter(a => a.status === 'present').length,
        absent: userAtts.filter(a => a.status === 'absent').length,
        late: userAtts.filter(a => a.status === 'late').length,
      };

      const attRates = configs.attendanceRates || { present: 0, absent: 0, late: 0 };
      const reward = stats.present * (attRates.present || 0);
      const totalHolidayInc = baseIncrement + reward;
      const attDeduction = (stats.absent * (attRates.absent || 0)) + (stats.late * (attRates.late || 0));

      // 3. Manual Overrides (Form takes precedence if non-zero)
      const finalBase = Number(formData.basicSalary) || baseSalary;
      const finalAllowances = Number(formData.totalAllowances) || allowances;
      const finalHolidayInc = Number(formData.holidayIncrements) || totalHolidayInc;
      const finalAttDeduction = Number(formData.attendanceDeductions) || attDeduction;
      const finalTds = Number(formData.tds) || (taxes.tds || 0);
      const finalPT = Number(formData.professionalTax) || (taxes.pt || 0);
      const otherDed = Number(formData.otherDeductions) || 0;

      const gross = finalBase + finalAllowances + finalHolidayInc;
      const totalDed = finalAttDeduction + finalTds + finalPT + (taxes.epf || 0) + (taxes.esi || 0) + otherDed;

      newCalcs[userId] = {
        user,
        stats,
        basicSalary: finalBase,
        totalAllowances: finalAllowances,
        holidayIncrements: finalHolidayInc,
        attendanceDeductions: finalAttDeduction,
        tds: finalTds,
        epf: taxes.epf || 0,
        esi: taxes.esi || 0,
        professionalTax: finalPT,
        otherDeductions: otherDed,
        grossSalary: gross,
        totalDeductions: totalDed,
        netSalary: gross - totalDed
      };
    }

    setMemberCalculations(newCalcs);
  }, [formData.userIds, formData.month, formData.year, formData.basicSalary, formData.totalAllowances, formData.holidayIncrements, formData.attendanceDeductions, formData.tds, formData.professionalTax, formData.otherDeductions, users, attendances]);

  // Sync Form with Matrix when single user is selected
  React.useEffect(() => {
    if (formData.userIds.length === 1) {
       const userId = formData.userIds[0];
       const user = users.find(u => u._id === userId);
       const savedConfigs = localStorage.getItem('salary_rate_matrix');
       if (user && savedConfigs) {
          const configs = JSON.parse(savedConfigs);
          const uRole = (user.role || '').trim();
          const uDept = (user.department || '').trim();
          const uServ = (user.service || '').trim();
          
          let matrixBase = configs.roles?.[uRole] || 0;
          const tripleKey = `${uDept}_${uServ}_${uRole}`;
          if (configs.deptServiceRoles?.[tripleKey]) matrixBase = configs.deptServiceRoles[tripleKey];
          
          setFormData(prev => ({
             ...prev,
             basicSalary: matrixBase,
             totalAllowances: configs.allowances?.[uRole] || 0,
             tds: configs.taxDeductions?.tds || 0,
             professionalTax: configs.taxDeductions?.pt || 0,
             epf: configs.taxDeductions?.epf || 0,
             esi: configs.taxDeductions?.esi || 0
          }));
       }
    } else if (formData.userIds.length > 1) {
       // Reset overrides for batch mode (0 means follow matrix)
       // setFormData(prev => ({ ...prev, basicSalary: 0, totalAllowances: 0, tds: 0, professionalTax: 0 }));
    }
  }, [formData.userIds, users]);

  React.useEffect(() => {
    recalculateBatch();
  }, [recalculateBatch]);

  // Template-based Calculations for Display
  const grossSalary = React.useMemo(() => {
    return (Number(formData.basicSalary) || 0) + (Number(formData.totalAllowances) || 0) + (Number(formData.holidayIncrements) || 0);
  }, [formData.basicSalary, formData.totalAllowances, formData.holidayIncrements]);

  const totalDeductions = React.useMemo(() => {
    return (Number(formData.attendanceDeductions) || 0) + (Number(formData.tds) || 0) + (Number(formData.professionalTax) || 0) + (Number(formData.epf) || 0) + (Number(formData.esi) || 0) + (Number(formData.otherDeductions) || 0);
  }, [formData.attendanceDeductions, formData.tds, formData.professionalTax, formData.epf, formData.esi, formData.otherDeductions]);

  const netSalary = React.useMemo(() => {
    return grossSalary - totalDeductions;
  }, [grossSalary, totalDeductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userIds.length === 0) return alert('Please select at least one allocation target');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const requests = formData.userIds.map(uid => {
        const calcData = memberCalculations[uid];
        // Merge individual calculated data with common notes/status
        const submission = {
          ...calcData,
          month: formData.month,
          year: formData.year,
          workingDays: formData.workingDays,
          notes: formData.notes,
          status: formData.status,
          userId: uid
        };
        
        if (editId) {
          return axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary/${editId}`, 
            submission, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          return axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/finance/salary`, 
            submission, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      });

      await Promise.all(requests);
      alert('Disbursement Logic Deployed Successfully');
      router.push('/super-admin-dashboard/finance/salary');
    } catch (error: any) {
      console.error('Error handling initiation submission:', error);
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.uniqueId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || u.role === filterRole;
    const matchesDept = !filterDepartment || u.department === filterDepartment;
    const matchesService = !filterService || u.service === filterService;
    return matchesSearch && matchesRole && matchesDept && matchesService;
  });

  if (fetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-indigo-100 animate-bounce">
                  <Database className="text-white" size={32} />
              </div>
              <div className="text-center">
                  <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Initializing Matrix Core</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 animate-pulse">Syncing Personnel Metadata...</p>
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-700">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-[100] px-12 py-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="p-3.5 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-[20px] border border-slate-200 transition-all border-dashed group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="h-10 w-[1px] bg-slate-200" />
          <div className="space-y-0.5">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Node: Finance.Salary.Initiate</span>
             </div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight italic uppercase">
                {viewOnly ? 'Record Inspection' : editId ? 'Logic Adjustment' : 'Disbursement Initiation'}
             </h1>
          </div>
        </div>

         <div className="flex items-center gap-8">
            <div className="hidden lg:flex flex-col items-end">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Sync Pool</span>
               <span className="text-lg font-black text-indigo-600 uppercase tracking-tighter mt-1 italic leading-none">{formData.userIds.length} <span className="text-[10px] text-slate-400">Selected</span></span>
            </div>
            {viewOnly ? (
               <div className="flex items-center gap-3 px-8 py-4 bg-rose-50 text-rose-600 rounded-[24px] border border-rose-100 animate-pulse shadow-sm shadow-rose-50">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Inspection Mode Activated</span>
               </div>
            ) : (
               <button 
                 onClick={handleSubmit}
                 disabled={loading || formData.userIds.length === 0}
                 className="px-8 py-4 bg-slate-900 text-white rounded-[32px] text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 italic ring-8 ring-transparent hover:ring-indigo-50"
               >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />} Deploy Logic
               </button>
            )}
         </div>
      </header>

      <main className="p-8 space-y-8 w-full">
         
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            
            {/* Left: Configuration Area */}
            <div className="xl:col-span-8 space-y-10">
               
               {/* Selection & Filtering */}
               <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  
                  <div className="relative z-10 flex flex-col gap-10">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-50 ring-4 ring-indigo-50">
                                <Users size={22} />
                            </div>
                            <div>
                               <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Allocation Targets</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{filteredUsers.length} Nodes in Pool</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                           <div className="relative group/search">
                              <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-indigo-500 transition-colors" />
                              <input 
                                 type="text" 
                                 placeholder="ID / NAME SCAN..."
                                 value={searchQuery}
                                 onChange={e => setSearchQuery(e.target.value)}
                                 className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-100 w-full md:w-64 transition-all"
                              />
                           </div>
                           <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 outline-none">
                                 <option value="">Role</option>
                                 {Array.from(new Set(users.map(u => u.role))).filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 outline-none">
                                 <option value="">Dept</option>
                                 {Array.from(new Set(users.map(u => u.department))).filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select value={filterService} onChange={e => setFilterService(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 outline-none">
                                 <option value="">Service</option>
                                 {Array.from(new Set(users.map(u => u.service))).filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {filteredUsers.map(user => {
                           const isSelected = formData.userIds.includes(user._id);
                           return (
                             <button
                               key={user._id}
                               type="button"
                               disabled={viewOnly || (!!editId && !isSelected)}
                               onClick={() => {
                                 const newIds = isSelected 
                                   ? formData.userIds.filter(id => id !== user._id)
                                   : [...formData.userIds, user._id];
                                 setFormData({ ...formData, userIds: newIds });
                               }}
                               className={`p-6 rounded-[32px] text-left transition-all border group/card shadow-sm hover:shadow-xl relative overflow-hidden ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-500'}`}
                             >
                               {isSelected && <div className="absolute top-4 right-4 text-white animate-pulse"><CheckCircle size={14} /></div>}
                               <div className="space-y-5 relative z-10">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black ring-4 ${isSelected ? 'bg-white/10 text-white ring-white/10' : 'bg-indigo-50 text-indigo-600 ring-indigo-50'}`}>
                                        {user.name?.charAt(0) || 'U'}
                                     </div>
                                     <div>
                                        <h4 className={`text-sm font-black uppercase tracking-tight italic leading-none ${isSelected ? 'text-white' : 'text-slate-900 group-hover/card:text-indigo-600'}`}>{user.name}</h4>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>ID: {user.uniqueId}</p>
                                     </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2">
                                     <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                        <Layers size={10} /> {user.role || 'Personnel'}
                                     </div>
                                     <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                        <Building2 size={10} /> {user.department || 'N/A'}
                                     </div>
                                     {user.service && (
                                       <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                          <Stethoscope size={10} /> {user.service}
                                       </div>
                                     )}
                                  </div>
                               </div>
                             </button>
                           );
                        })}
                        {filteredUsers.length === 0 && (
                           <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-[0.4em] italic text-xs">No Nodes Located in specified scan</div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Calculation Preview Matrix */}
               {formData.userIds.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-2xl shadow-slate-200/40 space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-indigo-950 text-white rounded-[24px] shadow-xl shadow-slate-100">
                                <Target size={22} />
                            </div>
                            <div>
                               <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Sync Intelligence Preview</h3>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{formData.userIds.length} Node(s) Analysis</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                           <Calendar size={14} className="text-indigo-600" />
                           <span className="text-[10px] font-black text-indigo-900 uppercase italic">Period: {formData.month}/{formData.year}</span>
                        </div>
                     </div>

                     <div className="overflow-x-auto rounded-[32px] border border-slate-100 shadow-inner bg-slate-50/50">
                        <table className="w-full border-separate border-spacing-0">
                           <thead>
                              <tr className="bg-slate-100/50">
                                 <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Node</th>
                                 <th className="px-6 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Duty Cycles (P/A/L)</th>
                                 <th className="px-6 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Target</th>
                                 <th className="px-6 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Compliance Loss</th>
                                 <th className="px-8 py-5 text-right text-[9px] font-black text-indigo-600 uppercase tracking-widest">Net Settlement</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {Object.values(memberCalculations).map((calc, idx) => (
                                <tr key={calc.user?._id || idx} className="group hover:bg-white transition-colors">
                                  <td className="px-8 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-950 text-white rounded-lg flex items-center justify-center text-[10px] font-black uppercase">
                                           {calc.user?.name?.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="text-[11px] font-black text-slate-900 uppercase italic">{calc.user?.name}</span>
                                           <span className="text-[9px] font-bold text-slate-400">{calc.user?.uniqueId}</span>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center justify-center gap-3">
                                        <div className="flex flex-col items-center">
                                           <span className="text-[10px] font-black text-emerald-600">{calc.stats?.present}</span>
                                           <span className="text-[7px] font-black text-slate-300 uppercase">P</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                           <span className="text-[10px] font-black text-rose-600">{calc.stats?.absent}</span>
                                           <span className="text-[7px] font-black text-slate-300 uppercase">A</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                           <span className="text-[10px] font-black text-amber-600">{calc.stats?.late}</span>
                                           <span className="text-[7px] font-black text-slate-300 uppercase">L</span>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <span className="text-[11px] font-black text-slate-900 italic">₹{calc.grossSalary?.toLocaleString()}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-[11px] text-rose-600 italic">
                                     -₹{calc.totalDeductions?.toLocaleString()}
                                  </td>
                                  <td className="px-8 py-4 text-right">
                                     <span className="text-sm font-black text-indigo-600 italic">₹{calc.netSalary?.toLocaleString()}</span>
                                  </td>
                                </tr>
                              ))}
                           </tbody>
                           <tfoot className="bg-indigo-50/50">
                              <tr>
                                 <td colSpan={2} className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase italic">Consolidated Prediction</td>
                                 <td className="px-6 py-5 text-right font-black text-xs text-slate-950 italic">
                                    ₹{Object.values(memberCalculations).reduce((acc, curr) => acc + (curr.grossSalary || 0), 0).toLocaleString()}
                                 </td>
                                 <td className="px-6 py-5 text-right font-black text-xs text-rose-600 italic">
                                    -₹{Object.values(memberCalculations).reduce((acc, curr) => acc + (curr.totalDeductions || 0), 0).toLocaleString()}
                                 </td>
                                 <td className="px-8 py-5 text-right font-black text-lg text-indigo-600 italic">
                                    ₹{Object.values(memberCalculations).reduce((acc, curr) => acc + (curr.netSalary || 0), 0).toLocaleString()}
                                 </td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>
                  </div>
               )}

               {/* Manual Adjustments Layer */}
               <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-2xl shadow-slate-200/40 space-y-10 group">
                  <div className="flex items-center gap-5">
                      <div className="p-4 bg-emerald-600 text-white rounded-[24px] shadow-xl shadow-emerald-50 ring-4 ring-emerald-50">
                          <Settings size={22} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Adjustment Layer</h3>
                         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">
                           {formData.userIds.length > 1 ? 'Global Batch Overrides' : 'Manual Calibration Protocol'}
                         </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                     {[
                        { label: 'Manual Base', key: 'basicSalary', icon: DollarSign },
                        { label: 'Manual Bonus', key: 'totalAllowances', icon: Plus },
                        { label: 'Override Incr', key: 'holidayIncrements', icon: Zap },
                        { label: 'Month', key: 'month', icon: Calendar, type: 'select', options: [1,2,3,4,5,6,7,8,9,10,11,12] },
                        { label: 'Year', key: 'year', icon: Globe, type: 'select', options: [2024, 2025, 2026] }
                     ].map(field => (
                        <div key={field.label} className="space-y-3">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic truncate block">{field.label}</label>
                           {field.type === 'select' ? (
                             <select 
                               value={(formData as any)[field.key]}
                               onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                               className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                             >
                               {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                           ) : (
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black italic">₹</span>
                               <input 
                                  type="number" 
                                  value={(formData as any)[field.key]}
                                  disabled={viewOnly}
                                  onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                               />
                             </div>
                           )}
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        { label: 'Deduction Override', key: 'attendanceDeductions' },
                        { label: 'Manual TDS', key: 'tds' },
                        { label: 'Manual P-Tax', key: 'professionalTax' },
                        { label: 'Misc Voids', key: 'otherDeductions' }
                      ].map(field => (
                        <div key={field.key} className="space-y-3 group/sub">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic group-hover/sub:text-slate-900 transition-colors">{field.label}</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black italic">₹</span>
                              <input 
                                type="number"
                                value={(formData as any)[field.key]}
                                disabled={viewOnly}
                                onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-rose-900 outline-none focus:ring-4 focus:ring-rose-100 transition-all font-mono"
                              />
                           </div>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Observation Logic (Internal Notes)</label>
                    <textarea 
                       value={formData.notes}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                       disabled={viewOnly}
                       placeholder="Enter operational notes for this disbursement sequence..."
                       className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[32px] text-[11px] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 h-32 transition-all resize-none italic"
                    />
                  </div>
               </div>
            </div>

            {/* Right: Operational Insights / Summary */}
            <div className="xl:col-span-4 space-y-10">
               
               {/* Global Matrix Insight Card */}
               <div className="bg-slate-900 rounded-[56px] p-10 shadow-3xl space-y-10 border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/10 to-emerald-600/10 opacity-50" />
                   
                   <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                      <div className="w-20 h-20 bg-white/5 text-white rounded-[32px] flex items-center justify-center ring-8 ring-white/5 border border-white/10 group-hover:rotate-[360deg] transition-transform duration-1000 shadow-2xl">
                         <Zap size={32} className="text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                         <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Settlement Hub</h4>
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">{formData.month}/{formData.year} Deployment Sequence</p>
                      </div>
                   </div>

                   <div className="relative z-10 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 flex flex-col items-center">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 italic text-center">Batch Vol</span>
                            <span className="text-2xl font-black text-white italic">{formData.userIds.length}</span>
                         </div>
                         <div className="p-6 bg-white/5 rounded-[32px] border border-white/10 flex flex-col items-center">
                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 italic text-center">Batch Avg</span>
                            <span className="text-2xl font-black text-white italic">₹{Object.values(memberCalculations).length > 0 ? Math.round(Object.values(memberCalculations).reduce((acc, curr) => acc + (curr.netSalary || 0), 0) / Object.values(memberCalculations).length).toLocaleString() : '0'}</span>
                         </div>
                      </div>

                      <div className="p-8 bg-indigo-600 rounded-[40px] shadow-2xl border-t-8 border-indigo-400">
                         <p className="text-[8px] font-black text-white/60 uppercase tracking-[0.4em] italic mb-3 text-center">Consolidated Deployment Budget</p>
                         <h3 className="text-4xl font-black text-white text-center leading-none italic tracking-tighter">₹{Object.values(memberCalculations).reduce((acc, curr) => acc + (curr.netSalary || 0), 0).toLocaleString()}</h3>
                      </div>
                   </div>

                   {/* Logic Deployment Button */}
                   {!viewOnly && (
                     <button 
                       onClick={handleSubmit}
                       disabled={loading || formData.userIds.length === 0}
                       className="w-full py-7 bg-white text-slate-900 rounded-[32px] text-[10px] font-black uppercase tracking-[0.6em] shadow-2xl hover:bg-indigo-400 hover:text-white transition-all flex items-center justify-center gap-5 relative z-10 active:scale-95 disabled:opacity-20 group/deploy"
                     >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} className="group-hover/deploy:scale-125 transition-transform" />}
                        DEPLOY NODES
                     </button>
                   )}

                   <div className="flex items-center justify-center gap-2 pt-4 relative z-10">
                      <ShieldCheck size={12} className="text-emerald-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Encrypted Payload Authorized</span>
                   </div>
               </div>

               {/* Auxiliary Protocol Info */}
               <div className="bg-white border border-slate-200 rounded-[48px] p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <AlertCircle size={18} />
                     </div>
                     <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic leading-tight">Deployment Protocols</h5>
                  </div>
                  <ul className="space-y-4">
                     {[
                       'Calculations sync with matrix rates',
                       'Attendance voids applied per node',
                       'Compliance taxes deducted at source',
                       'Disbursement recorded in audit logs'
                     ].map(item => (
                        <li key={item} className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full mt-1.5 shrink-0" />
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed italic">{item}</span>
                        </li>
                     ))}
                  </ul>
               </div>

            </div>
         </div>
      </main>

      <footer className="px-12 py-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-200 bg-white/50 relative z-10">
         <div className="flex items-center gap-4 mb-6 md:mb-0">
            <div className="p-3 bg-slate-100 rounded-xl">
               <Database className="text-slate-400" size={16} />
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] italic leading-tight">G-Matrix Deployment Arch V4.2 <br/> <span className="opacity-50">Local Auth Code: ADMIN_SEC_92</span></p>
         </div>
         <div className="flex gap-10">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Privacy Guard</span>
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Logic Integrity</span>
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Terms of Sync</span>
         </div>
      </footer>
    </div>
  );
}
