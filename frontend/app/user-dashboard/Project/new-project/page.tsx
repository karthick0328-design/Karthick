// app/user-dashboard/Project/new-project/page.tsx
'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import {
  ArrowLeft,
  Send,
  FileText,
  Building2,
  ClipboardList,
  MessageSquare,
  ChevronDown,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Beaker,
  Code2,
  Microscope,
  FlaskConical,
  Dna,
  Zap,
  ChevronRight,
  Paperclip,
  XCircle,
  FilePlus,
  HardDrive,
} from 'lucide-react';
import Link from 'next/link';

interface FormConfig {
  department: string;
  requiredFields: string[];
  fieldTypes: Record<string, string | string[] | { type: string; options: string[] }>;
  servicesOptions?: string[];
  conditionalFields?: Record<string, { type: string; options?: string[]; condition: string[] }>;
}
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: (string | { field: string; message: string })[];
}
interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
}
interface Department {
  value: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bg: string;
  border: string;
  tag: string;
}

// ─── Colour palette per department ───────────────────────────────────────────
const DEPT_STYLES: Record<string, Pick<Department, 'color' | 'bg' | 'border' | 'tag'>> = {
  'Drug Discovery': { color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', tag: 'bg-violet-600' },
  'NGS': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tag: 'bg-emerald-600' },
  'Software Development': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', tag: 'bg-blue-600' },
  'Microbiology': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tag: 'bg-orange-600' },
  'Biochemistry and Molecular Biology': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', tag: 'bg-rose-600' },
};

export default function NewProjectView() {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [allFormData, setAllFormData] = useState<Record<string, unknown>>({});
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [formProgress, setFormProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [storageStats, setStorageStats] = useState<{ used: number; limit: number; percent: string } | null>(null);

  // ── Auth & Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/Login/Signin'); return; }
      try {
        const decoded: DecodedToken = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          toast.error('Session expired. Please log in again.');
          router.push('/Login/Signin'); return;
        }
        if (decoded.role === 'manager') { router.push('/manager/dashboard'); return; }
        setIsAuthorized(true);
        fetchStorageStats();
      } catch {
        localStorage.removeItem('token');
        router.push('/Login/Signin');
      }
    };
    init();
  }, [router]);

  const fetchStorageStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/drive/storage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.data.success) setStorageStats(r.data.data);
    } catch (e) {
      console.error('Failed to fetch storage stats');
    }
  };

  // ── Fetch config ──────────────────────────────────────────────────────────
  const fetchFormConfig = async (dept: string) => {
    if (!dept) return;
    setLoading(true); setValidationErrors({});
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get<ApiResponse<FormConfig>>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/projects/form-config?department=${encodeURIComponent(dept)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (r.status === 200 && r.data.data) { setFormConfig(r.data.data); setActiveStep(2); }
    } catch (e: unknown) {
      const ae = e as AxiosError<ApiResponse>;
      toast.error(ae.response?.data?.message || 'Failed to load form configuration');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedDepartment) { fetchFormConfig(selectedDepartment); setAllFormData({}); setFormProgress(50); setValidationErrors({}); }
  }, [selectedDepartment]);

  useEffect(() => {
    if (formConfig) {
      setAllFormData(prev => {
        const nd = { ...prev };
        formConfig.requiredFields.forEach(f => { if (!Object.prototype.hasOwnProperty.call(nd, f)) nd[f] = ''; });
        return nd;
      });
    }
  }, [formConfig]);

  // ── Progress ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!formConfig) return;
    let total = formConfig.requiredFields.length, filled = 0;
    formConfig.requiredFields.forEach(f => {
      const v = allFormData[f];
      if (v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0) && (typeof v !== 'string' || v.trim() !== '')) filled++;
    });
    if (formConfig.conditionalFields) {
      const ss = Array.isArray(allFormData.services) ? (allFormData.services as string[]) : [];
      Object.entries(formConfig.conditionalFields).forEach(([fn, fc]) => {
        if (fc.condition.some(s => ss.includes(s))) {
          total++;
          const v = allFormData[fn];
          if (v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0) && (typeof v !== 'string' || v.trim() !== '')) filled++;
        }
      });
    }
    setFormProgress(Math.min(100, 50 + (filled / total) * 50));
  }, [allFormData, formConfig, remarks]);

  // ── Complete check ────────────────────────────────────────────────────────
  const isFormComplete = formConfig ? (() => {
    if (!formConfig.requiredFields.every(f => {
      const v = allFormData[f];
      return v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0) && (typeof v !== 'string' || v.trim() !== '');
    })) return false;
    if (formConfig.conditionalFields) {
      const ss = Array.isArray(allFormData.services) ? (allFormData.services as string[]) : [];
      for (const [f, fc] of Object.entries(formConfig.conditionalFields)) {
        if (fc.condition.some(s => ss.includes(s))) {
          const v = allFormData[f];
          if (v === undefined || v === '' || v === null || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '')) return false;
        }
      }
    }
    return true;
  })() : false;

  const handleInputChange = (field: string, value: unknown) => {
    setAllFormData(p => ({ ...p, [field]: value }));
    if (validationErrors[field]) setValidationErrors(p => ({ ...p, [field]: [] }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreateAndSubmit = async () => {
    if (!selectedDepartment || !formConfig || !isFormComplete) { toast.error('Please complete all required fields'); return; }
    setSubmitting(true); setValidationErrors({});
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('department', selectedDepartment);
      formData.append('category', 'New Project');
      formData.append('formData', JSON.stringify(allFormData));
      formData.append('remarks', remarks);

      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const r = await axios.post<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/projects`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      if (r.status === 201 && r.data.success) {
        toast.success(r.data.message || 'Project submitted!');
        router.push('/user-dashboard/Project');
      }
    } catch (e: unknown) {
      const ae = e as AxiosError<ApiResponse>;
      const errMsg = ae.response?.data?.message || 'Failed to create project';
      if (ae.response?.data?.errors) {
        const fe: Record<string, string[]> = {};
        ae.response.data.errors.forEach(err => {
          let msg: string, field: string;
          if (typeof err === 'string') {
            msg = err; const m = err.match(/^([a-zA-Z0-9_]+)\s+(is required|Invalid type)/i);
            field = m ? m[1].toLowerCase() : 'general';
          } else { field = (err as any).field; msg = (err as any).message; }
          if (field && field !== 'general') { if (!fe[field]) fe[field] = []; fe[field].push(msg); }
          else toast.error(msg);
        });
        if (Object.keys(fe).length > 0) { setValidationErrors(fe); toast.error(`${errMsg}. Review highlighted fields.`); }
      } else toast.error(errMsg);
    } finally { setSubmitting(false); }
  };

  // ── Department list ───────────────────────────────────────────────────────
  const departments: Department[] = [
    { value: 'Drug Discovery', icon: <Beaker className="w-5 h-5" />, description: 'Compound screening, ADMET, docking & QSAR', ...DEPT_STYLES['Drug Discovery'] },
    { value: 'NGS', icon: <Dna className="w-5 h-5" />, description: 'Whole-genome, RNA-seq, metagenomics & pharmacogenomics', ...DEPT_STYLES['NGS'] },
    { value: 'Software Development', icon: <Code2 className="w-5 h-5" />, description: 'Web, mobile, API & enterprise software projects', ...DEPT_STYLES['Software Development'] },
    { value: 'Microbiology', icon: <Microscope className="w-5 h-5" />, description: 'Microbial research and clinical diagnostics', ...DEPT_STYLES['Microbiology'] },
    { value: 'Biochemistry and Molecular Biology', icon: <FlaskConical className="w-5 h-5" />, description: 'Biochemical assays and molecular biology workflows', ...DEPT_STYLES['Biochemistry and Molecular Biology'] },
  ];

  const selectedDept = departments.find(d => d.value === selectedDepartment);
  const formatFieldName = (f: string) => f.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, l => l.toUpperCase()).trim();

  // ── Field renderer ────────────────────────────────────────────────────────
  const renderField = (
    field: string,
    fieldType: string | string[] | { type: string; options?: string[] } | { type: string; options?: string[]; condition: string[] },
    currentValue: unknown,
    fieldErrors: string[],
    key?: string | number
  ) => {
    const defArr: string[] = Array.isArray(currentValue) ? (currentValue as string[]) : [];
    let options: string[] = [];
    if (typeof fieldType === 'object' && !Array.isArray(fieldType) && 'type' in fieldType) {
      const t = fieldType as { type: string; options?: string[] };
      options = t.options || (t.type === 'multi-enum' ? formConfig?.servicesOptions || [] : []);
    }
    const hasErr = fieldErrors.length > 0;
    const inputCls = `w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 outline-none bg-white
      ${hasErr
        ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
        : 'border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50'
      }`;
    const isWide = field === 'services' || fieldType === 'textarea';

    return (
      <div key={key} className={isWide ? 'col-span-full' : ''}>
        <label className="block mb-2 text-xs font-semibold text-slate-600">
          {formatFieldName(field)} <span className="text-rose-500">*</span>
        </label>

        {typeof fieldType === 'string' ? (
          fieldType === 'number' ? <input type="number" value={(currentValue as number) ?? ''} onChange={e => handleInputChange(field, parseFloat(e.target.value) || 0)} className={inputCls} placeholder={`Enter ${formatFieldName(field)}`} /> :
            fieldType === 'date' ? <input type="date" value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={inputCls} /> :
              fieldType === 'textarea' ? <textarea value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={`${inputCls} h-28 resize-none leading-relaxed`} placeholder={`Enter ${formatFieldName(field)}…`} /> :
                <input type="text" value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={inputCls} placeholder={`Enter ${formatFieldName(field)}`} />
        ) : Array.isArray(fieldType) ? (
          <textarea value={defArr.join(', ')} onChange={e => handleInputChange(field, e.target.value.split(', ').filter(Boolean))} className={`${inputCls} h-24 resize-none`} placeholder="Enter items separated by commas" />
        ) : (fieldType && typeof fieldType === 'object' && 'type' in fieldType) ? (() => {
          const t = fieldType as { type: string; options?: string[] };
          if (t.type === 'multi-enum') return (
            <div className={`rounded-xl border overflow-hidden bg-white ${hasErr ? 'border-red-300' : 'border-slate-200'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 max-h-56 overflow-y-auto">
                {options.map(opt => {
                  const checked = defArr.includes(opt);
                  return (
                    <label key={opt} className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${checked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <span className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center border-2 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                        {checked && <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <input type="checkbox" className="sr-only" checked={checked} onChange={e => {
                        handleInputChange(field, e.target.checked ? [...defArr, opt] : defArr.filter(v => v !== opt));
                      }} />
                      <span className={`text-sm font-medium leading-snug ${checked ? 'text-indigo-700' : 'text-slate-700'}`}>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {defArr.length > 0 && (
                <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-600">{defArr.length} of {options.length} selected</span>
                </div>
              )}
            </div>
          );
          if (t.type === 'radio-enum' || (t.type === 'enum' && options.length <= 5)) return (
            <div className={`rounded-xl border overflow-hidden divide-y bg-white ${hasErr ? 'border-red-300 divide-red-100' : 'border-slate-200 divide-slate-100'}`}>
              {options.map(opt => {
                const sel = currentValue === opt;
                return (
                  <label key={opt} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${sel ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? 'border-indigo-600' : 'border-slate-300'}`}>
                      {sel && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                    </span>
                    <input type="radio" name={field} className="sr-only" checked={sel} onChange={() => handleInputChange(field, opt)} />
                    <span className={`text-sm font-medium ${sel ? 'text-indigo-700' : 'text-slate-700'}`}>{opt}</span>
                  </label>
                );
              })}
            </div>
          );
          if (t.type === 'enum') return (
            <div className="relative">
              <select value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={`${inputCls} appearance-none pr-10`}>
                <option value="">Select {formatFieldName(field)}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          );
          if (t.type === 'array' || t.type === 'textarea') return <textarea value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder={`Enter ${formatFieldName(field)}…`} />;
          if (t.type === 'number') return <input type="number" value={(currentValue as number) ?? ''} onChange={e => handleInputChange(field, parseFloat(e.target.value) || 0)} className={inputCls} placeholder={`Enter ${formatFieldName(field)}`} />;
          if (t.type === 'date') return <input type="date" value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={inputCls} />;
          return <input type="text" value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={inputCls} placeholder={`Enter ${formatFieldName(field)}`} />;
        })() : (
          <input type="text" value={String(currentValue ?? '')} onChange={e => handleInputChange(field, e.target.value)} className={inputCls} placeholder={`Enter ${formatFieldName(field)}`} />
        )}

        {hasErr && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 font-medium"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{fieldErrors.join('; ')}</p>}
      </div>
    );
  };

  // ── Conditional sections ──────────────────────────────────────────────────
  const renderConditionalFields = () => {
    if (!formConfig?.conditionalFields || !Array.isArray(allFormData.services)) return null;
    const ss = allFormData.services as string[];
    const sections: { [k: string]: React.ReactElement[] } = {};
    Object.entries(formConfig.conditionalFields).forEach(([field, fc]) => {
      if (fc.condition.some(s => ss.includes(s))) {
        const key = fc.condition.join(', ');
        if (!sections[key]) sections[key] = [];
        sections[key].push(renderField(field, fc, allFormData[field], validationErrors[field] || [], field));
      }
    });
    return Object.entries(sections).map(([svc, fields]) => (
      <div key={svc} className="col-span-full border border-indigo-100 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border-b border-indigo-100">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Additional details — {svc}</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">{fields}</div>
      </div>
    ));
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isAuthorized) return (
    <div className="flex items-center justify-center h-80">
      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Verifying access…
      </div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    // Negative margin to undo the parent layout padding and go truly full-width
    <div className="-mx-8 lg:-mx-12 -mt-8 min-h-screen flex flex-col bg-slate-50">
      <Toaster position="top-right" toastOptions={{ duration: 4000, className: 'text-sm' }} />

      {/* ══ TOP HERO BANNER ══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        {/* background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-[80px] translate-y-1/2" />
        </div>

        <div className="relative w-full flex-1 px-8 lg:px-12 py-10 flex flex-col md:flex-row md:items-center gap-6">
          {/* Back + breadcrumb */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Link href="/user-dashboard/Project" className="hover:text-white transition-colors">Projects</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white font-semibold">New Project</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                <FileText className="w-7 h-7 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">New Project Request</h1>
                <p className="text-slate-400 mt-1 text-sm">
                  {activeStep === 1
                    ? 'Choose your research department to get started'
                    : `Configuring: ${selectedDepartment}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: steps + back btn */}
          <div className="md:ml-auto flex flex-col gap-4 items-start md:items-end">
            {/* Steps indicator */}
            <div className="flex items-center gap-2">
              {[{ n: 1, label: 'Department' }, { n: 2, label: 'Details' }].map((s, i) => (
                <React.Fragment key={s.n}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all
                    ${activeStep >= s.n
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-500'}`}>
                    {activeStep > s.n
                      ? <CheckCircle className="w-3.5 h-3.5" />
                      : <span className="w-4 h-4 flex items-center justify-center">{s.n}</span>}
                    {s.label}
                  </div>
                  {i < 1 && <div className={`w-6 h-px ${activeStep >= 2 ? 'bg-indigo-500' : 'bg-white/10'}`} />}
                </React.Fragment>
              ))}
            </div>
            <Link href="/user-dashboard/Project"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to portfolio
            </Link>
          </div>
        </div>

        {/* progress strip */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_12px_rgba(99,102,241,0.7)]" style={{ width: `${formProgress}%` }} />
        </div>
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 w-full px-8 lg:px-12 py-10 flex flex-col">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* ════ MAIN CONTENT ════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0">

            {/* ── STEP 1: Department grid ──────────────────────────────────── */}
            {activeStep === 1 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Select Department</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Pick the domain that best fits your project</p>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {departments.map(dept => {
                    const sel = selectedDepartment === dept.value;
                    return (
                      <button
                        key={dept.value}
                        onClick={() => setSelectedDepartment(dept.value)}
                        className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300
                          ${sel
                            ? 'border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100/60'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100/80'}`}
                      >
                        {/* icon */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border transition-all ${sel ? `${dept.tag} border-transparent text-white` : `${dept.bg} ${dept.border} ${dept.color}`}`}>
                          {dept.icon}
                        </div>
                        <h3 className={`font-bold text-sm mb-1.5 leading-snug transition-colors ${sel ? 'text-indigo-700' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                          {dept.value}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{dept.description}</p>
                        {sel && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {selectedDepartment ? `Selected: ${selectedDepartment}` : 'No department selected yet'}
                  </p>
                  <button
                    onClick={() => { if (selectedDepartment) setActiveStep(2); }}
                    disabled={!selectedDepartment}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Form ─────────────────────────────────────────────── */}
            {activeStep === 2 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${selectedDept ? `${selectedDept.bg} ${selectedDept.border} ${selectedDept.color}` : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                      {selectedDept?.icon || <ClipboardList className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedDepartment} — Project Details</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Fields marked <span className="text-rose-500 font-bold">*</span> are required</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveStep(1)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50">
                    <ArrowLeft className="w-3.5 h-3.5" /> Change
                  </button>
                </div>

                {/* fields */}
                <div className="p-8">
                  {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="text-sm font-medium">Loading form configuration…</p>
                    </div>
                  ) : formConfig ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* base fields */}
                      {formConfig.requiredFields.map(field =>
                        renderField(field, formConfig.fieldTypes[field], allFormData[field], validationErrors[field] || [], field)
                      )}
                      {/* conditional */}
                      {renderConditionalFields()}
                      {/* remarks — full width */}
                      <div className="col-span-full pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-600">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          Additional Remarks
                          <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 h-28 resize-none outline-none transition-all bg-white"
                          placeholder="Any extra context, special requirements, or notes for our team…"
                        />
                      </div>

                      {/* File Upload Section */}
                      <div className="col-span-full pt-8 border-t border-slate-100">
                        <label className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700 uppercase tracking-widest">
                          <Paperclip className="w-4 h-4 text-indigo-500" />
                          Supporting Documents
                          <span className="text-slate-400 font-normal normal-case ml-1 font-medium">(Optional)</span>
                        </label>

                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 transition-all hover:bg-slate-50 hover:border-indigo-400 cursor-pointer group bg-slate-50/30">
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                  }
                                }}
                              />
                              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm border border-slate-100 transition-all group-hover:bg-indigo-50 group-hover:scale-110">
                                <FilePlus className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                              </div>
                              <p className="text-sm font-bold text-slate-900 mb-1">Upload Files</p>
                              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Any supporting images or documents (Max 50MB)</p>
                            </label>
                          </div>

                          {selectedFiles.length > 0 && (
                            <div className="flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Selected Assets ({selectedFiles.length})</p>
                              {selectedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                                      <Paperclip className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="text-sm font-bold text-slate-700 truncate tracking-tight">{file.name}</p>
                                      <p className="text-[10px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* footer actions */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isFormComplete
                      ? <span className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Ready to submit</span>
                      : <span className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /> Incomplete</span>
                    }
                  </div>
                  <button
                    onClick={handleCreateAndSubmit}
                    disabled={submitting || !isFormComplete}
                    className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Submitting…' : 'Submit Project'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ════ SIDEBAR ══════════════════════════════════════════════════════ */}
          <aside className="xl:w-80 flex-shrink-0 space-y-5 xl:sticky xl:top-24 xl:h-fit">

            {/* Storage Quota card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Drive Quota</span>
                </div>
                {storageStats && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${Number(storageStats.percent) > 90 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {storageStats.percent}%
                  </span>
                )}
              </div>
              <div className="p-5">
                {storageStats ? (
                  <div className="space-y-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${Number(storageStats.percent) > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${storageStats.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 tracking-wide uppercase">
                      <span>{(storageStats.used / (1024 * 1024 * 1024)).toFixed(2)} GB used</span>
                      <span>2.0 GB Limit</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calculating Storage...
                  </div>
                )}
              </div>
            </div>

            {/* Progress card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submission Progress</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Completion</span>
                    <span className="text-xs font-bold text-indigo-600">{Math.round(formProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${formProgress}%` }} />
                  </div>
                </div>

                {/* Department pill */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department</p>
                  {selectedDept ? (
                    <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${selectedDept.bg} ${selectedDept.color} border ${selectedDept.border}`}>
                      {selectedDept.icon}
                      {selectedDept.value}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">Not selected</p>}
                </div>

                {/* Selected services */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Services</p>
                  {Array.isArray(allFormData.services) && (allFormData.services as string[]).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(allFormData.services as string[]).map(s => (
                        <span key={s} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100">{s}</span>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">None selected</p>}
                </div>
              </div>
            </div>

            {/* Tips card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-xl shadow-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-indigo-200" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Helpful Tips</span>
              </div>
              <ul className="space-y-3">
                {[
                  'Select services to reveal extra sub-options',
                  'All starred fields are required before submitting',
                  'Use the Remarks box for any special notes',
                  'You can change department using the "Change" button',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-indigo-100 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-white/15 flex-shrink-0 flex items-center justify-center font-bold text-[10px] mt-0.5">{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Status badge (step 2 only) */}
            {activeStep === 2 && (
              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${isFormComplete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isFormComplete ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {isFormComplete ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                </div>
                <div>
                  <p className={`text-xs font-bold ${isFormComplete ? 'text-green-700' : 'text-amber-700'}`}>
                    {isFormComplete ? 'Ready to Submit' : 'Form Incomplete'}
                  </p>
                  <p className={`text-[11px] mt-1 leading-relaxed ${isFormComplete ? 'text-green-600' : 'text-amber-600'}`}>
                    {isFormComplete ? 'All required fields are filled. Click Submit.' : 'Please fill all required fields marked with *.'}
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div >
  );
}