'use client';

import React from 'react';
import {
   Briefcase,
   Layers,
   Cpu,
   PieChart,
   Users,
   Globe,
   CheckCircle,
   ArrowLeft,
   Save,
   Info,
   ChevronRight,
   Database,
   Search,
   Plus,
   Zap,
   ShieldCheck,
   TrendingUp,
   Percent,
   Network
} from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function CalibrationPage() {
   const router = useRouter();
   const [loading, setLoading] = React.useState(true);
   const [filtering, setFiltering] = React.useState('');
   const [rateConfigs, setRateConfigs] = React.useState({
      roles: {} as Record<string, number>,
      departments: {} as Record<string, number>,
      services: {} as Record<string, number>,
      deptServiceRoles: {} as Record<string, number>,
      roleDepts: {} as Record<string, number>,
      roleServices: {} as Record<string, number>,
      attendanceRates: { present: 0, absent: 0, late: 0 } as Record<string, number>,
      allowances: {} as Record<string, number>,
      increments: {} as Record<string, number>,
      taxDeductions: { tds: 0, epf: 0, esi: 0, pt: 0 } as Record<string, number>,
   });

   const [availableOptions, setAvailableOptions] = React.useState({
      roles: [] as string[],
      departments: [] as string[],
      services: [] as string[],
   });

   const fetchConfigs = async () => {
      try {
         setLoading(true);
         const token = localStorage.getItem('token');
         const standardServices = ['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'BioChemistry', 'Molecular Biology'];

         const resUsers = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/adminassignments/internal-users?limit=1000`, {
            headers: { Authorization: `Bearer ${token}` }
         });
         if (resUsers.data.success) {
            const users = resUsers.data.data;
            setAvailableOptions({
               roles: Array.from(new Set(users.map((u: any) => u.role))).filter(Boolean) as string[],
               departments: Array.from(new Set(users.map((u: any) => u.department))).filter(Boolean) as string[],
               services: Array.from(new Set([...standardServices, ...Array.from(new Set(users.map((u: any) => u.service))).filter(Boolean) as string[]])),
            });
         }

         const savedConfigs = localStorage.getItem('salary_rate_matrix');
         if (savedConfigs) {
            const parsed = JSON.parse(savedConfigs);
            setRateConfigs({
               roles: parsed.roles || {},
               departments: parsed.departments || {},
               services: parsed.services || {},
               deptServiceRoles: parsed.deptServiceRoles || {},
               roleDepts: parsed.roleDepts || {},
               roleServices: parsed.roleServices || {},
               attendanceRates: parsed.attendanceRates || { present: 0, absent: 0, late: 0 },
               allowances: parsed.allowances || {},
               increments: parsed.increments || {},
               taxDeductions: parsed.taxDeductions || { tds: 0, epf: 0, esi: 0, pt: 0 },
            });
         }
      } catch (error) {
         console.error('Error fetching calibration prerequisites:', error);
      } finally {
         setLoading(false);
      }
   };

   React.useEffect(() => {
      fetchConfigs();
   }, []);

   const handleSaveConfig = () => {
      const sanitized: any = {
         roles: {},
         departments: {},
         services: {},
         deptServiceRoles: {},
         roleDepts: {},
         roleServices: {},
         attendanceRates: rateConfigs.attendanceRates,
         allowances: {},
         increments: {},
         taxDeductions: rateConfigs.taxDeductions
      };

      Object.keys(rateConfigs.roles).forEach(k => sanitized.roles[k.trim()] = rateConfigs.roles[k]);
      Object.keys(rateConfigs.departments).forEach(k => sanitized.departments[k.trim()] = rateConfigs.departments[k]);
      Object.keys(rateConfigs.services).forEach(k => sanitized.services[k.trim()] = rateConfigs.services[k]);
      Object.keys(rateConfigs.deptServiceRoles).forEach(k => sanitized.deptServiceRoles[k.trim()] = rateConfigs.deptServiceRoles[k]);
      Object.keys(rateConfigs.roleDepts).forEach(k => sanitized.roleDepts[k.trim()] = rateConfigs.roleDepts[k]);
      Object.keys(rateConfigs.roleServices).forEach(k => sanitized.roleServices[k.trim()] = rateConfigs.roleServices[k]);
      Object.keys(rateConfigs.allowances).forEach(k => sanitized.allowances[k.trim()] = rateConfigs.allowances[k]);
      Object.keys(rateConfigs.increments).forEach(k => sanitized.increments[k.trim()] = rateConfigs.increments[k]);

      localStorage.setItem('salary_rate_matrix', JSON.stringify(sanitized));
      setRateConfigs(sanitized);
      alert('Global Revenue Matrix Synced Successfully');
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Matrix Core...</p>
            </div>
         </div>
      );
   }

   const baseSections = [
      { id: 'departments', title: 'Department Baseline', items: availableOptions.departments, icon: Layers, color: 'bg-indigo-600', accent: 'text-indigo-400' },
      { id: 'services', title: 'Service Node Allocation', items: availableOptions.services, icon: Cpu, color: 'bg-amber-500', accent: 'text-amber-200' }
   ];

   const hybridSections = [
      { id: 'deptServiceRoles', title: 'Triple-Sector Protocol', primary: availableOptions.departments, secondary: availableOptions.services, tertiary: availableOptions.roles, icon: PieChart, color: 'bg-rose-600', accent: 'text-rose-200' },
      { id: 'roleDepts', title: 'Role + Dept Synergy', primary: availableOptions.roles, secondary: availableOptions.departments, tertiary: null, icon: Users, color: 'bg-blue-600', accent: 'text-blue-200' },
      { id: 'roleServices', title: 'Role + Service Network', primary: availableOptions.roles, secondary: availableOptions.services, tertiary: null, icon: Globe, color: 'bg-slate-900', accent: 'text-slate-400' }
   ];

   return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-700">
         <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] px-8 py-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
               <button
                  onClick={() => router.back()}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-all border-dashed"
               >
                  <ArrowLeft size={18} />
               </button>
               <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuration Console</span>
                     <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase italic">G-Matrix Calibration Hub</h1>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="relative mr-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                     type="text"
                     placeholder="Scan vector sector..."
                     value={filtering}
                     onChange={(e) => setFiltering(e.target.value)}
                     className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none italic"
                  />
               </div>
               <button
                  onClick={handleSaveConfig}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 italic"
               >
                  <Save size={16} /> Sync All Nodes
               </button>
            </div>
         </header>

         <main className="p-8 lg:p-12 space-y-12 w-full">


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">

               {/* COMBINED: Role Based Calibration (Salary + Allowances) - Violet */}
               <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl hover:shadow-violet-50 transition-all group col-span-1 md:col-span-2 lg:col-span-1">
                  <div className="bg-violet-600 px-10 py-6 border-b border-violet-700 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg border border-white/10 ring-4 ring-white/5">
                           <Briefcase size={20} />
                        </div>
                        <div>
                           <h3 className="text-xs font-black text-white italic uppercase tracking-widest leading-none">Role Matrix Calibration</h3>
                           <p className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-1">Salary & Allowance Sync</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-10 space-y-8 max-h-[600px] overflow-y-auto scrollbar-none">
                     {availableOptions.roles.filter(i => i.toLowerCase().includes(filtering.toLowerCase())).map(role => (
                        <div key={role} className="space-y-4 p-8 bg-slate-50 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group/role">
                           <div className="absolute top-0 right-0 p-4">
                              <span className="text-[10px] font-black text-slate-200 uppercase group-hover/role:text-violet-200 transition-colors">{role}</span>
                           </div>
                           <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-violet-400 uppercase tracking-widest px-2 italic">Baseline Salary</label>
                                 <div className="relative group/field">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                                    <input
                                       type="number"
                                       value={rateConfigs.roles[role] || 0}
                                       onChange={(e) => setRateConfigs({ ...rateConfigs, roles: { ...rateConfigs.roles, [role]: Number(e.target.value) } })}
                                       className="w-full pl-12 pr-6 py-5 bg-white border border-slate-200 rounded-[30px] text-sm font-black text-slate-900 focus:border-violet-600 outline-none transition-all font-mono shadow-sm"
                                    />
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-2 italic">Role Allowance Node</label>
                                 <div className="relative group/field">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                                    <input
                                       type="number"
                                       value={rateConfigs.allowances[role] || 0}
                                       onChange={(e) => setRateConfigs({ ...rateConfigs, allowances: { ...rateConfigs.allowances, [role]: Number(e.target.value) } })}
                                       className="w-full pl-12 pr-6 py-5 bg-white border border-slate-200 rounded-[30px] text-sm font-black text-slate-900 focus:border-indigo-600 outline-none transition-all font-mono shadow-sm"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Cycle Increments - Emerald */}
               <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl hover:shadow-emerald-50 transition-all group">
                  <div className="bg-emerald-600 px-10 py-6 border-b border-emerald-700 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg border border-white/10 ring-4 ring-white/5">
                           <TrendingUp size={20} />
                        </div>
                        <div>
                           <h3 className="text-xs font-black text-white italic uppercase tracking-widest leading-none">Cycle Increments</h3>
                           <p className="text-[8px] font-black text-emerald-200 uppercase tracking-widest mt-1">Reward Pulse Config</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-10 space-y-8 max-h-[600px] overflow-y-auto scrollbar-none">
                     <div className="p-10 bg-slate-900 rounded-[40px] space-y-6 shadow-xl">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] border-b border-white/5 pb-4 leading-none">Attendance Matrix Nodes</p>
                        {['present', 'absent', 'late'].map(id => (
                           <div key={id} className="space-y-2">
                              <label className="text-[8px] font-black text-white/40 uppercase tracking-widest px-2 italic">Vector {id} weight</label>
                              <div className="relative">
                                 <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs font-bold">₹</span>
                                 <input
                                    type="number"
                                    value={rateConfigs.attendanceRates[id] || 0}
                                    onChange={(e) => setRateConfigs({ ...rateConfigs, attendanceRates: { ...rateConfigs.attendanceRates, [id]: Number(e.target.value) } })}
                                    className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-[28px] text-sm font-black text-white focus:bg-white/10 outline-none transition-all font-mono italic"
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                     {availableOptions.roles.filter(i => i.toLowerCase().includes(filtering.toLowerCase())).map(role => (
                        <div key={`inc-${role}`} className="space-y-2 group/field">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 italic transition-colors group-hover/field:text-emerald-600">{role} Reward</label>
                           <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                              <input
                                 type="number"
                                 value={rateConfigs.increments[role] || 0}
                                 onChange={(e) => setRateConfigs({ ...rateConfigs, increments: { ...rateConfigs.increments, [role]: Number(e.target.value) } })}
                                 className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-8 focus:ring-emerald-50 outline-none transition-all font-mono italic"
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Deduction Protocol Scan - Rose */}
               <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl hover:shadow-rose-50 transition-all group">
                  <div className="bg-rose-600 px-10 py-6 border-b border-rose-700 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg border border-white/10 ring-4 ring-white/5">
                           <ShieldCheck size={20} />
                        </div>
                        <div>
                           <h3 className="text-xs font-black text-white italic uppercase tracking-widest leading-none">Deduction Protocol Scan</h3>
                           <p className="text-[8px] font-black text-rose-200 uppercase tracking-widest mt-1">Compliance & Tax Nodes</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-10 space-y-10 max-h-[600px] overflow-y-auto scrollbar-none">
                     <div className="p-8 bg-slate-50 rounded-[48px] border border-slate-100 space-y-8 shadow-sm">
                        {[
                           { id: 'tds', label: 'TDS (System Tax)', icon: Percent },
                           { id: 'epf', label: 'Provident Fund (EPF)', icon: ShieldCheck },
                           { id: 'esi', label: 'Healthcare Logic (ESI)', icon: Globe },
                           { id: 'pt', label: 'Professional Tax', icon: Briefcase }
                        ].map(item => (
                           <div key={item.id} className="space-y-3 group/field">
                              <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-2 italic transition-colors group-hover/field:text-rose-600 block">{item.label}</label>
                              <div className="relative">
                                 <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                                 <input
                                    type="number"
                                    value={(rateConfigs.taxDeductions as any)[item.id] || 0}
                                    onChange={(e) => setRateConfigs({ ...rateConfigs, taxDeductions: { ...rateConfigs.taxDeductions, [item.id]: Number(e.target.value) } })}
                                    className="w-full pl-14 pr-8 py-5 bg-white border border-slate-200 rounded-[32px] text-sm font-black text-slate-900 focus:border-rose-600 focus:ring-8 focus:ring-rose-50 outline-none transition-all font-mono italic shadow-sm"
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Base Salary Calibration Nodes (Depts / Services) */}
               {baseSections.map((section) => (
                  <div key={section.id} className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl transition-all group">
                     <div className={`${section.color} px-10 py-6 border-b border-black/10 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg border border-white/10 ring-4 ring-white/5">
                              <section.icon size={20} />
                           </div>
                           <div>
                              <h3 className="text-xs font-black text-white italic uppercase tracking-widest leading-none">{section.title}</h3>
                              <p className={`text-[8px] font-black ${section.accent} uppercase tracking-widest mt-1`}>Base Node Vector</p>
                           </div>
                        </div>
                     </div>

                     <div className="p-10 space-y-6 max-h-[480px] overflow-y-auto scrollbar-none">
                        {section.items.filter(i => i.toLowerCase().includes(filtering.toLowerCase())).map(item => (
                           <div key={item} className="space-y-2 group/field">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 italic transition-colors group-hover/field:text-slate-900">{item}</label>
                              <div className="relative">
                                 <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-black italic">₹</span>
                                 <input
                                    type="number"
                                    value={(rateConfigs as any)[section.id][item] || 0}
                                    onChange={(e) => setRateConfigs({ ...rateConfigs, [section.id]: { ...(rateConfigs as any)[section.id], [item]: Number(e.target.value) } })}
                                    className="w-full pl-14 pr-8 py-4 bg-slate-50 border border-slate-100 rounded-[32px] text-sm font-black text-slate-900 focus:bg-white focus:border-slate-900 focus:ring-8 focus:ring-slate-100/50 outline-none transition-all font-mono italic"
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}

               {/* Hybrid Matrix Nodes */}
               {hybridSections.map((section) => (
                  <div key={section.id} className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl transition-all group">
                     <div className={`${section.color} px-10 py-6 border-b border-black/10 flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg border border-white/10 ring-4 ring-white/5">
                              <section.icon size={20} />
                           </div>
                           <div>
                              <h3 className="text-xs font-black text-white italic uppercase tracking-widest leading-none">{section.title}</h3>
                              <p className={`text-[8px] font-black ${section.accent} uppercase tracking-widest mt-1`}>Multi-Node Logic</p>
                           </div>
                        </div>
                     </div>

                     <div className="p-10 space-y-5 max-h-[480px] overflow-y-auto scrollbar-none bg-slate-50/30">
                        {section.primary.map(p => (
                           section.secondary.map(s => {
                              if (section.tertiary) {
                                 return section.tertiary.map(t => {
                                    const key = `${p}_${s}_${t}`;
                                    if (filtering && !key.toLowerCase().includes(filtering.toLowerCase())) return null;
                                    return (
                                       <div key={key} className="flex items-center gap-4 group/row bg-white p-6 rounded-[32px] border border-transparent hover:border-slate-200 hover:shadow-md transition-all">
                                          <div className="flex-1 overflow-hidden">
                                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate italic leading-none">{p}</p>
                                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate mt-2 leading-none">{s} / {t}</p>
                                          </div>
                                          <div className="relative w-36">
                                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black italic">₹</span>
                                             <input
                                                type="number"
                                                value={((rateConfigs as any)[section.id] || {})[key] || 0}
                                                onChange={(e) => setRateConfigs({ ...rateConfigs, [section.id]: { ...((rateConfigs as any)[section.id] || {}), [key]: Number(e.target.value) } })}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[24px] text-[13px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono tracking-tighter"
                                             />
                                          </div>
                                       </div>
                                    );
                                 });
                              }

                              const key = `${p}_${s}`;
                              if (filtering && !key.toLowerCase().includes(filtering.toLowerCase())) return null;
                              return (
                                 <div key={key} className="flex items-center gap-4 group/row bg-white p-6 rounded-[32px] border border-transparent hover:border-slate-200 hover:shadow-md transition-all">
                                    <div className="flex-1 overflow-hidden">
                                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-tight truncate italic transition-colors group-hover/row:text-slate-900 leading-none">{p}</p>
                                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-tight truncate mt-1 leading-none">{s}</p>
                                    </div>
                                    <div className="relative w-36">
                                       <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-[12px] font-black italic">₹</span>
                                       <input
                                          type="number"
                                          value={((rateConfigs as any)[section.id] || {})[key] || 0}
                                          onChange={(e) => setRateConfigs({ ...rateConfigs, [section.id]: { ...((rateConfigs as any)[section.id] || {}), [key]: Number(e.target.value) } })}
                                          className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[28px] text-[14px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono"
                                       />
                                    </div>
                                 </div>
                              );
                           })
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </main>

         {/* <footer className="mt-20 border-t border-slate-200 bg-white px-12 py-10 flex items-center justify-between shadow-[0_-10px_50px_-20px_rgba(0,0,0,0.1)] sticky bottom-0 z-[100]">
            <div className="flex flex-col">
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] italic mb-1">Global Configuration Matrix Sync Enabled</p>
            </div>
            <div className="flex items-center gap-6">
               <button
                  onClick={() => router.back()}
                  className="px-10 py-4 text-xs font-black text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 rounded-2xl italic uppercase tracking-widest"
               >
                  Discard
               </button>
               <button
                  onClick={handleSaveConfig}
                  className="px-14 py-6 bg-slate-900 text-white rounded-[32px] text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-100 hover:bg-violet-600 transition-all active:scale-95 flex items-center gap-4 group"
               >
                  <CheckCircle size={20} /> Sync Matrix Protocol
               </button>
            </div>
         </footer> */}
      </div>
   );
}
