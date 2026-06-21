'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { toast, Toaster } from 'react-hot-toast';
import {
  ArrowLeft, Save, Check, X, Calendar, FileText, Tag, Eye,
  Building, Shield, User, Loader2, Sparkles, ChevronDown,
  MessageSquare, Send, Clock, DollarSign, CreditCard, Receipt,
  AlertCircle, CheckCircle2, RefreshCw, Beaker, Activity, Paperclip, XCircle, FilePlus
} from 'lucide-react';
import Link from 'next/link';
// Redundant imports removed (Header, Sidebar)

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
  name?: string;
}

interface BackendProject {
  _id: string;
  uniqueId: string;
  userId: { _id: string; name: string; email: string; uniqueId: string; department: string };
  department: string;
  category: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'In Progress' | 'Completed' | 'Rejected';
  formData?: Record<string, any>;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  paymentStatus?: string;
  quotedAmount?: number;
  paymentDetails?: {
    title?: string;
    projectDescription?: string;
    detailedQuotation?: string;
    dueDate?: string;
    amount?: number;
    paidAmount?: number;
    paymentMethod?: string;
  };
  receipt?: { data: any; generatedAt: string };
  messages?: Array<{
    _id: string;
    senderId: { _id: string; name: string; role: string };
    content: string;
    timestamp: string;
    createdAt?: string;
  }>;
  activities?: Array<{
    action: string;
    timestamp: string;
    updatedBy?: { name: string; role: string };
  }>;
  assignedTo?: Array<{ _id: string; name: string; email: string }>;
  attachments?: Array<{ path: string; filename: string; mimetype: string }>;
}

interface FormConfig {
  department: string;
  requiredFields: string[];
  fieldTypes: Record<string, any>;
  conditionalFields?: Record<string, any>;
  servicesOptions?: string[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/projects';

// Department form configurations
const departmentFallbacks: Record<string, Omit<FormConfig, 'department'>> = {
  'Drug Discovery': {
    requiredFields: ['titleProject', 'targetPosition', 'methodology', 'expectedOutcome', 'compoundDetailsOrInformation', 'timeline', 'services'],
    fieldTypes: {
      titleProject: 'string',
      targetPosition: 'string',
      methodology: 'textarea',
      expectedOutcome: 'textarea',
      compoundDetailsOrInformation: 'textarea',
      timeline: 'date',
      services: { type: 'multi-enum', options: ['Virtual screening + Docking', 'ADMET Prediction', 'Toxicity Profiling of compounds', 'QSAR modelling', 'Ligand Search and Creation compound chemistry', 'MD Simulantor'] },
    },
    servicesOptions: ['Virtual screening + Docking', 'ADMET Prediction', 'Toxicity Profiling of compounds', 'QSAR modelling', 'Ligand Search and Creation compound chemistry', 'MD Simulantor'],
    conditionalFields: {
      mdEngine: { type: 'enum', options: ['growmax', 'amper', 'desmomd'], condition: ['MD Simulantor'] },
      dockingSoftware: { type: 'enum', options: ['AutoDock', 'Glide', 'GOLD'], condition: ['Virtual screening + Docking'] },
      admetModel: { type: 'enum', options: ['SwissADME', 'pkCSM', 'ADMETlab'], condition: ['ADMET Prediction'] },
      toxicityAssay: { type: 'string', condition: ['Toxicity Profiling of compounds'] },
      qsarDescriptors: { type: 'multi-enum', options: ['Molecular Weight', 'LogP', 'TPSA'], condition: ['QSAR modelling'] },
      ligandSource: { type: 'enum', options: ['PubChem', 'ZINC', 'Custom'], condition: ['Ligand Search and Creation compound chemistry'] },
    },
  },
  'NGS': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s', 'services'],
    fieldTypes: {
      sampleName: 'string', volume: 'number', species: 'string', preparationDate: 'date',
      concentration: 'number', totalAmount: 'number', od260280: 'number', remarks: 'string', ratio28s18s: 'number',
      services: { type: 'multi-enum', options: ['Whole genome / genome analysis', 'RNA-sequence differential expression analysis', 'Metagenomics (16S and shotgun)', 'Microbiomes profiling', 'Variant annotation and reporting', 'Oncogenomics: tumor-normal analysis', 'Pharmacogenomics'] },
    },
    servicesOptions: ['Whole genome / genome analysis', 'RNA-sequence differential expression analysis', 'Metagenomics (16S and shotgun)', 'Microbiomes profiling', 'Variant annotation and reporting', 'Oncogenomics: tumor-normal analysis', 'Pharmacogenomics'],
    conditionalFields: {
      genomeCoverage: { type: 'number', condition: ['Whole genome / genome analysis'] },
      genomeType: { type: 'enum', options: ['Whole Genome', 'Exome', 'Targeted Panel'], condition: ['Whole genome / genome analysis'] },
      sampleGroups: { type: 'string', condition: ['RNA-sequence differential expression analysis'] },
      replicates: { type: 'number', condition: ['RNA-sequence differential expression analysis'] },
      sequencingPlatform: { type: 'enum', options: ['16S', 'Shotgun'], condition: ['Metagenomics (16S and shotgun)'] },
      microbiomeType: { type: 'string', condition: ['Microbiomes profiling'] },
      variantCaller: { type: 'enum', options: ['GATK', 'FreeBayes', 'DeepVariant'], condition: ['Variant annotation and reporting'] },
      tumorNormalPair: { type: 'enum', options: ['Matched', 'Unmatched'], condition: ['Oncogenomics: tumor-normal analysis'] },
      pgxGenes: { type: 'multi-enum', options: ['CYP2D6', 'TPMT', 'VKORC1'], condition: ['Pharmacogenomics'] },
    },
  },
  'Software Development': {
    requiredFields: ['projectName', 'description', 'techStack', 'requirements', 'timeline', 'teamSize', 'budgetEstimate', 'remarks'],
    fieldTypes: { projectName: 'string', description: 'string', techStack: ['string'], requirements: 'string', timeline: 'date', teamSize: 'number', budgetEstimate: 'number', remarks: 'string' },
  },
  'Microbiology': {
    requiredFields: ['sampleName', 'volume', 'species', 'preparationDate', 'concentration', 'totalAmount', 'od260280', 'remarks', 'ratio28s18s'],
    fieldTypes: { sampleName: 'string', volume: 'number', species: 'string', preparationDate: 'date', concentration: 'number', totalAmount: 'number', od260280: 'number', remarks: 'string', ratio28s18s: 'number' },
  },
  'IT': {
    requiredFields: ['projectName', 'description', 'techStack', 'requirements', 'timeline', 'teamSize', 'budgetEstimate', 'remarks'],
    fieldTypes: { projectName: 'string', description: 'string', techStack: ['string'], requirements: 'string', timeline: 'date', teamSize: 'number', budgetEstimate: 'number', remarks: 'string' },
  },
  'Sales & Customer Support': {
    requiredFields: ['clientName', 'projectDescription', 'expectedRevenue', 'timeline', 'resourcesNeeded', 'remarks'],
    fieldTypes: { clientName: 'string', projectDescription: 'string', expectedRevenue: 'number', timeline: 'date', resourcesNeeded: 'string', remarks: 'string' },
  },
};

const defaultFields = [
  { field: 'projectName', label: 'Project Name', type: 'string' },
  { field: 'description', label: 'Description', type: 'string' },
  { field: 'timeline', label: 'Timeline', type: 'date' },
  { field: 'resourcesNeeded', label: 'Resources Needed', type: 'string' },
  { field: 'expectedOutcome', label: 'Expected Outcome', type: 'string' },
];

export default function ProjectEditPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [user, setUser] = useState<{ name: string; department: string; role: string; id: string } | null>(null);
  const [project, setProject] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [remarks, setRemarks] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('details');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const isValidObjectId = (str: string): boolean => /^[0-9a-fA-F]{24}$/.test(str);
  const getFieldLabel = (field: string) => field.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, l => l.toUpperCase()).trim();

  const getToken = useCallback(() => localStorage.getItem('token') || '', []);

  // Load project data
  const loadProjectData = useCallback(async (token: string, id: string) => {
    setFetchLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/my-projects`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch projects');

      const projects: BackendProject[] = data.data;
      let foundProject = isValidObjectId(id) ? projects.find(p => p._id === id) : null;
      if (!foundProject) foundProject = projects.find(p => p.uniqueId === id);
      if (!foundProject) throw new Error(`Project with ID '${id}' not found`);

      setProject(foundProject);
      setFormData(foundProject.formData || {});
      setRemarks(foundProject.remarks || '');

      // Load form config
      if (foundProject.category === 'New Project' && foundProject.department) {
        try {
          const configRes = await fetch(`${API_BASE}/form-config?department=${encodeURIComponent(foundProject.department)}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.success) setFormConfig(configData.data);
            else handleConfigFallback(foundProject);
          } else handleConfigFallback(foundProject);
        } catch { handleConfigFallback(foundProject); }
      } else handleConfigFallback(foundProject);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const handleConfigFallback = (proj: BackendProject) => {
    const dept = proj.department || 'IT';
    if (departmentFallbacks[dept]) {
      setFormConfig({ department: dept, ...departmentFallbacks[dept] });
    } else {
      setFormConfig({
        department: dept,
        requiredFields: defaultFields.map(f => f.field),
        fieldTypes: defaultFields.reduce((acc, f) => { acc[f.field] = f.type; return acc; }, {} as Record<string, any>),
      });
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token || !projectId) { router.push('/Login/Signin'); return; }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) { localStorage.removeItem('token'); router.push('/Login/Signin'); return; }
      if (decoded.role === 'manager') { router.push('/manager/dashboard'); return; }
      setUser({ name: decoded.name || `User`, role: decoded.role, department: decoded.department, id: decoded.id || decoded.sub || '' });
      loadProjectData(token, projectId);
    } catch { localStorage.removeItem('token'); router.push('/Login/Signin'); }
  }, [router, projectId, getToken, loadProjectData]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors(prev => ({ ...prev, [field]: [] }));
  };

  const handleTagKeyDown = (field: string, e: React.KeyboardEvent) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const trimmed = tagInputs[field]?.trim() || '';
      if (trimmed) {
        const currentTags = Array.isArray(formData[field]) ? [...formData[field]] : [];
        if (!currentTags.includes(trimmed)) handleFieldChange(field, [...currentTags, trimmed]);
        setTagInputs(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const removeTag = (field: string, tag: string) => {
    const currentTags = Array.isArray(formData[field]) ? [...formData[field]] : [];
    handleFieldChange(field, currentTags.filter(t => t !== tag));
  };

  const validateForm = (config: FormConfig) => {
    const errors: Record<string, string[]> = {};
    config.requiredFields.forEach(field => {
      // Special handling for remarks - it's stored in separate state variable
      if (field === 'remarks') {
        if (!remarks || remarks.trim() === '') {
          errors[field] = [`${getFieldLabel(field)} is required`];
        }
      } else {
        const value = formData[field];
        if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[field] = [`${getFieldLabel(field)} is required`];
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (isSubmit = false) => {
    const token = getToken();
    if (isSubmit && formConfig && !validateForm(formConfig)) {
      toast.error('Please complete all required fields');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isSubmit ? `${API_BASE}/${projectId}/submit` : `${API_BASE}/${projectId}`;
      const method = isSubmit ? 'POST' : 'PUT';

      const formDataToSend = new FormData();
      formDataToSend.append('formData', JSON.stringify(formData));
      formDataToSend.append('remarks', remarks);
      if (!isSubmit) formDataToSend.append('status', 'Draft');

      selectedFiles.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const response = await fetch(endpoint, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle backend validation errors
        if (response.status === 400 && responseData.errors) {
          const backendErrors: Record<string, string[]> = {};
          responseData.errors.forEach((err: { field?: string; message: string }) => {
            const field = err.field || 'general';
            if (!backendErrors[field]) backendErrors[field] = [];
            backendErrors[field].push(err.message);
          });
          setValidationErrors(backendErrors);

          // Show specific error messages
          const errorFields = Object.keys(backendErrors).filter(k => k !== 'general');
          if (errorFields.length > 0) {
            toast.error(`Missing required fields: ${errorFields.map(f => getFieldLabel(f)).join(', ')}`);
          } else {
            toast.error(responseData.message || 'Validation failed');
          }
          return;
        }
        throw new Error(responseData.message || `Error: ${response.status}`);
      }

      if (!responseData.success) throw new Error(responseData.message);

      toast.success(isSubmit ? 'Project submitted!' : 'Draft saved!');
      setValidationErrors({});
      if (isSubmit) router.push('/user-dashboard/Project');
      else {
        setSelectedFiles([]); // Clear selected files after successful save
        loadProjectData(token, projectId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`${API_BASE}/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageInput.trim() }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      toast.success('Message sent!');
      setMessageInput('');
      loadProjectData(getToken(), projectId);
    } catch { toast.error('Failed to send message'); }
    finally { setSendingMessage(false); }
  };

  const submitPayment = async (method: string, fullPayment: boolean, extraData: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${projectId}/submit-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: method, fullPayment, ...extraData }),
      });
      if (!response.ok) throw new Error('Payment submission failed');
      toast.success('Payment submitted!');
      loadProjectData(getToken(), projectId);
    } catch { toast.error('Payment failed'); }
    finally { setLoading(false); }
  };

  const shouldShowConditional = (field: string, config: FormConfig) => {
    if (!config.conditionalFields?.[field]?.condition) return true;
    const selectedServices = Array.isArray(formData.services) ? formData.services : [];
    return config.conditionalFields[field].condition.some((s: string) => selectedServices.includes(s));
  };

  const canEdit = project && (!project.assignedTo || project.assignedTo.length === 0) && project.paymentStatus === 'Pending';

  if (!user || fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Project</h3>
          <p className="text-gray-600 mb-6">{error || 'Project not found'}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => loadProjectData(getToken(), projectId)} className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <Link href="/user-dashboard/Project" className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  const effectiveConfig = formConfig || { department: project.department, requiredFields: [], fieldTypes: {} };
  const statusColors: Record<string, string> = {
    'Draft': 'bg-gray-500', 'Submitted': 'bg-amber-500', 'Under Review': 'bg-blue-500',
    'In Progress': 'bg-purple-500', 'Completed': 'bg-green-500', 'Rejected': 'bg-red-500',
  };
  const paymentStatusColors: Record<string, string> = {
    'Pending': 'bg-gray-500', 'Quote Sent': 'bg-amber-500', 'Payment Form Created': 'bg-blue-500',
    '50% Paid': 'bg-purple-500', 'Full Paid': 'bg-green-500', 'Official Receipt Issued': 'bg-emerald-500',
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  const renderField = (field: string, type: any, isConditional = false) => {
    const value = formData[field] || '';
    const hasError = validationErrors[field]?.length > 0;
    const inputClass = `w-full px-4 py-3 bg-white border ${hasError ? 'border-red-500' : 'border-gray-200'} rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 transition-all`;

    if (Array.isArray(type) || (typeof type === 'object' && type.type === 'multi-enum')) {
      const options = type.options || effectiveConfig.servicesOptions || [];
      const tags = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          <select onChange={(e) => { if (e.target.value && !tags.includes(e.target.value)) handleFieldChange(field, [...tags, e.target.value]); e.target.value = ''; }} className={inputClass}>
            <option value="">Select {getFieldLabel(field)}...</option>
            {options.filter((o: string) => !tags.includes(o)).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/30 text-purple-300 rounded-full text-sm">
                {tag}<button type="button" onClick={() => removeTag(field, tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      );
    }
    if (typeof type === 'object' && type.type === 'enum') {
      return (
        <select value={value} onChange={(e) => handleFieldChange(field, e.target.value)} disabled={!canEdit} className={inputClass}>
          <option value="">Select {getFieldLabel(field)}...</option>
          {type.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    if (type === 'number') return <input type="number" value={value} onChange={(e) => handleFieldChange(field, e.target.value)} disabled={!canEdit} className={inputClass} placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`} />;
    if (type === 'date') return <input type="date" value={value} onChange={(e) => handleFieldChange(field, e.target.value)} disabled={!canEdit} className={inputClass} />;
    return <input type="text" value={String(value)} onChange={(e) => handleFieldChange(field, e.target.value)} disabled={!canEdit} className={inputClass} placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`} />;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <Toaster position="top-right" toastOptions={{ className: 'bg-white text-gray-900 border border-gray-200 shadow-xl rounded-2xl' }} />
      <div className="w-full flex-1 flex flex-col py-4">
        <div className="w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/user-dashboard/Project" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Beaker className="w-8 h-8 text-purple-400" />
                  {project.uniqueId}
                </h1>
                <p className="text-white/60">{project.department} • {project.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 ${statusColors[project.status] || 'bg-gray-500'} text-white rounded-full text-sm font-medium`}>
                {project.status}
              </span>
              {project.paymentStatus && (
                <span className={`px-4 py-2 ${paymentStatusColors[project.paymentStatus] || 'bg-gray-500'} text-white rounded-full text-sm font-medium`}>
                  {project.paymentStatus}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 p-2">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                        <Icon className="w-4 h-4" />{tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6">
                  {/* Details Tab */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      {!canEdit && (
                        <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                          <p className="text-amber-200">This project cannot be edited at this time.</p>
                        </div>
                      )}
                      {Object.keys(validationErrors).length > 0 && (
                        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                          <p className="text-red-300 font-medium mb-2">Validation Errors:</p>
                          {Object.entries(validationErrors).map(([f, msgs]) => (
                            <p key={f} className="text-red-200 text-sm">{getFieldLabel(f)}: {msgs.join(', ')}</p>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {effectiveConfig.requiredFields.map(field => (
                          <div key={field} className="space-y-2">
                            <label className="block text-sm font-medium text-white/80">{getFieldLabel(field)} <span className="text-red-400">*</span></label>
                            {renderField(field, effectiveConfig.fieldTypes[field])}
                          </div>
                        ))}
                        {effectiveConfig.conditionalFields && Object.entries(effectiveConfig.conditionalFields).map(([field, cfg]) => {
                          if (!shouldShowConditional(field, effectiveConfig)) return null;
                          return (
                            <div key={field} className="space-y-2 md:col-span-2">
                              <label className="block text-sm font-medium text-white/80">{getFieldLabel(field)} <span className="text-purple-400">(Conditional)</span></label>
                              {renderField(field, cfg)}
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-white/80">Remarks <span className="text-red-400">*</span></label>
                        <textarea value={remarks} onChange={(e) => { setRemarks(e.target.value); if (validationErrors['remarks']) setValidationErrors(prev => ({ ...prev, remarks: [] })); }} disabled={!canEdit} rows={4}
                          className={`w-full px-4 py-3 bg-white/5 border ${validationErrors['remarks']?.length ? 'border-red-500' : 'border-white/20'} rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 resize-none`}
                          placeholder="Enter project remarks (required)..." />
                        {validationErrors['remarks']?.length > 0 && (
                          <p className="text-red-400 text-sm">{validationErrors['remarks'][0]}</p>
                        )}
                      </div>

                      {/* File Upload Section */}
                      {canEdit && (
                        <div className="col-span-full pt-8 border-t border-white/10 mt-4">
                          <label className="flex items-center gap-2 mb-4 text-sm font-bold text-white/80 uppercase tracking-widest">
                            <Paperclip className="w-4 h-4 text-purple-400" />
                            Add New Supporting Documents
                            <span className="text-white/40 font-normal normal-case ml-1 font-medium">(Optional)</span>
                          </label>

                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-3xl p-8 transition-all hover:bg-white/5 hover:border-purple-400 cursor-pointer group bg-white/5">
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
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10 transition-all group-hover:bg-purple-500/20 group-hover:scale-110">
                                  <FilePlus className="w-8 h-8 text-white/40 group-hover:text-purple-400" />
                                </div>
                                <p className="text-sm font-bold text-white mb-1">Upload Files</p>
                                <p className="text-[10px] text-white/40 font-medium tracking-wide">Any supporting images or documents (Max 50MB)</p>
                              </label>
                            </div>

                            {selectedFiles.length > 0 && (
                              <div className="flex-1 space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 ml-1">New Assets to Upload ({selectedFiles.length})</p>
                                {selectedFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/10 shadow-sm transition-all hover:bg-white/10 group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <Paperclip className="w-4 h-4 text-purple-400" />
                                      </div>
                                      <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-white truncate tracking-tight">{file.name}</p>
                                        <p className="text-[10px] text-white/40 font-medium">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Existing Attachments Display */}
                      {project.attachments && project.attachments.length > 0 && (
                        <div className="col-span-full pt-8 border-t border-white/10 mt-4">
                          <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-4">Current Documents</h3>
                          <div className="flex flex-wrap gap-3">
                            {project.attachments.map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white shadow-sm">
                                <FileText className="w-4 h-4 text-purple-400" />
                                <span className="truncate max-w-[150px]">{file.filename}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {canEdit && (
                        <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                          <button onClick={() => handleSave(false)} disabled={loading}
                            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                          </button>
                          <button onClick={() => handleSave(true)} disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-2">
                            <Check className="w-4 h-4" /> Submit
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Tab */}
                  {activeTab === 'payment' && (
                    <div className="space-y-6">
                      {project.quotedAmount && (
                        <div className="p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/30">
                          <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-6 h-6 text-emerald-400" />
                            <h3 className="text-lg font-bold text-white">Quoted Amount</h3>
                          </div>
                          <p className="text-3xl font-bold text-emerald-400">₹{project.quotedAmount.toLocaleString()}</p>
                        </div>
                      )}
                      {project.paymentDetails && (
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" /> Payment Details</h3>
                          {project.paymentDetails.title && <p className="text-white/80"><strong>Title:</strong> {project.paymentDetails.title}</p>}
                          {project.paymentDetails.projectDescription && <p className="text-white/60">{project.paymentDetails.projectDescription}</p>}
                          {project.paymentDetails.dueDate && <p className="text-amber-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Due: {new Date(project.paymentDetails.dueDate).toLocaleDateString()}</p>}
                          {project.paymentDetails.paidAmount !== undefined && <p className="text-green-400">Paid: ₹{project.paymentDetails.paidAmount.toLocaleString()}</p>}
                        </div>
                      )}
                      {project.paymentStatus === 'Payment Form Created' && (
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                          <h3 className="text-lg font-bold text-white">Make Payment</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button onClick={() => submitPayment('UPI', false, { upiId: 'sample@upi' })} disabled={loading}
                              className="p-4 bg-purple-600/30 border border-purple-500/50 rounded-xl text-white hover:bg-purple-600/50 transition-all">
                              <p className="font-medium">UPI - 50%</p>
                            </button>
                            <button onClick={() => submitPayment('UPI', true, { upiId: 'sample@upi' })} disabled={loading}
                              className="p-4 bg-green-600/30 border border-green-500/50 rounded-xl text-white hover:bg-green-600/50 transition-all">
                              <p className="font-medium">UPI - Full</p>
                            </button>
                            <button onClick={() => submitPayment('Cash', false)} disabled={loading}
                              className="p-4 bg-amber-600/30 border border-amber-500/50 rounded-xl text-white hover:bg-amber-600/50 transition-all">
                              <p className="font-medium">Cash</p>
                            </button>
                          </div>
                        </div>
                      )}
                      {project.receipt && (
                        <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <Receipt className="w-6 h-6 text-green-400" />
                            <h3 className="text-lg font-bold text-white">Receipt Available</h3>
                          </div>
                          <p className="text-white/60 mb-4">Receipt ID: {project.receipt.data?.receiptId}</p>
                          <button className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">Download Receipt</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Messages Tab */}
                  {activeTab === 'messages' && (
                    <div className="space-y-4">
                      <div className="h-[400px] overflow-y-auto custom-scrollbar space-y-4 p-4 bg-white/5 rounded-xl">
                        {project.messages && project.messages.length > 0 ? (
                          [...project.messages].reverse().map((msg, i) => (
                            <div key={i} className={`flex ${msg.senderId?._id === user.id ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] p-4 rounded-2xl ${msg.senderId?._id === user.id ? 'bg-purple-600' : 'bg-white/10'}`}>
                                <p className="text-white/60 text-xs mb-1">{msg.senderId?.name} • {new Date(msg.timestamp || msg.createdAt || Date.now()).toLocaleString()}</p>
                                <p className="text-white">{msg.content}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-white/40 py-12"><MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No messages yet</p></div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40"
                          placeholder="Type a message..." />
                        <button onClick={sendMessage} disabled={sendingMessage || !messageInput.trim()}
                          className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                          {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Activity Tab */}
                  {activeTab === 'activity' && (
                    <div className="space-y-4">
                      {project.activities && project.activities.filter(act => act.updatedBy?.role === 'employee').length > 0 ? (
                        project.activities
                          .filter(act => act.updatedBy?.role === 'employee')
                          .map((act, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-purple-500/20">
                              <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {act.updatedBy?.name?.charAt(0) || 'E'}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-white font-semibold">{act.updatedBy?.name || 'Employee'}</p>
                                  <span className="text-xs px-2 py-1 bg-purple-500/30 text-purple-300 rounded-full">Employee</span>
                                </div>
                                <p className="text-white/80">{act.action}</p>
                                <p className="text-white/40 text-sm mt-1">{new Date(act.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center text-white/40 py-12">
                          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No employee activity yet</p>
                          <p className="text-sm mt-2">Employee updates will appear here</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-400" /> Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-white/60">Status</span><span className="text-white capitalize">{project.status}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Created</span><span className="text-white">{new Date(project.createdAt).toLocaleDateString()}</span></div>
                  {project.submittedAt && <div className="flex justify-between"><span className="text-white/60">Submitted</span><span className="text-white">{new Date(project.submittedAt).toLocaleDateString()}</span></div>}
                  {project.paymentStatus && <div className="flex justify-between"><span className="text-white/60">Payment</span><span className="text-white">{project.paymentStatus}</span></div>}
                </div>
              </div>

              {project.assignedTo && project.assignedTo.length > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-400" /> Assigned To</h3>
                  {project.assignedTo.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">{m.name.charAt(0)}</div>
                      <div><p className="text-white font-medium">{m.name}</p><p className="text-white/40 text-sm">{m.email}</p></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/user-dashboard/Project" className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-all">
                    <Eye className="w-4 h-4 text-purple-400" /> View All Projects
                  </Link>
                  {canEdit && (
                    <button onClick={() => handleSave(false)} disabled={loading}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/10 text-white transition-all disabled:opacity-50">
                      <Save className="w-4 h-4 text-green-400" /> Save Draft
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 