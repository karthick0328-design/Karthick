'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { validateURL } from '@/lib/validation';
import createDOMPurify from 'dompurify';
const DOMPurify = { sanitize: (val: any, opts?: any) => typeof window !== 'undefined' ? createDOMPurify(window as any).sanitize(val, opts) : val };
import {
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  Package,
  Truck,
  Eye,
  X,
  FileText,
  DollarSign,
  User,
  Calendar,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Paperclip,
  Navigation,
  ShieldCheck,
  Activity,
  Send,
  Receipt,
  IndianRupee,
  ArrowDownLeft,
  Check,
  FileCheck,
  ImageOff,
  Zap
} from 'lucide-react';
import axios from 'axios';
import SummaryCard from '../../components/SummaryCard';
import { Toaster } from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [financeTeam, setFinanceTeam] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Create PO functionality
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newPO, setNewPO] = useState({
    projectId: '',
    projectTitle: '',
    description: '',
    requestedAmount: '',
    pieces: '',
    vendors: [{ details: '', amount: '' }]
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchProjects();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/purchase/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setPurchaseOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/adminassignments/projects/all?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setProjectsList(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching projects", err);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('projectId', newPO.projectId);
      formData.append('projectTitle', newPO.projectTitle);
      formData.append('description', newPO.description);
      formData.append('requestedAmount', newPO.requestedAmount);
      formData.append('pieces', newPO.pieces);
      formData.append('vendors', JSON.stringify(newPO.vendors));

      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/purchase/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setIsCreateModalOpen(false);
        fetchPurchaseOrders();
        setNewPO({
          projectId: '',
          projectTitle: '',
          description: '',
          requestedAmount: '',
          pieces: '',
          vendors: [{ details: '', amount: '' }]
        });
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error creating PO:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('APPROV') || s.includes('SETTLED') || s.includes('DELIVER') || s.includes('COMPLET')) return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50';
    if (s.includes('PEND') || s.includes('TRANSIT') || s.includes('REVIEW')) return 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50';
    if (s.includes('REJECT') || s.includes('FAIL')) return 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-50';
    return 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-indigo-50';
  };

  const totals = useMemo(() => {
    const total = purchaseOrders.length;
    const completed = purchaseOrders.filter(po => {
      const s = (po.purchaseDetails?.status || po.financialReview?.status || po.status || '').toLowerCase();
      return s.includes('deliver') || s.includes('settle') || s.includes('complet');
    }).length;
    const pending = total - completed;
    const totalCapital = purchaseOrders.reduce((sum, po) => sum + Number(po.financialReview?.requestedAmount || 0), 0);
    return { total, pending, completed, totalCapital };
  }, [purchaseOrders]);

  return (
    <div className="space-y-10 font-sans antialiased text-slate-900">
      <Toaster position="top-center" />
      
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-2">
          <div className="space-y-4">
            <span>Purchase Order List</span>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                Purchase Orders
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
              </h2>
              <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight leading-relaxed">Manage and track all company purchases in one place</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPurchaseOrders()}
              className="p-3.5 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95"
            >
              <Clock size={20} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3.5 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 flex items-center gap-2 hover:bg-slate-900 transition-all active:scale-95"
            >
              <Plus size={16} strokeWidth={3} /> Create New Purchase Order
            </button>
          </div>
        </div>

        {/* Metrics Summary Row - Inspired by Expenses UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <SummaryCard
            title="Total Orders"
            value={totals.total.toString()}
            change="0"
            status="up"
            icon={ShoppingCart}
            variant="purple"
            description="Active Orders"
          />
          <SummaryCard
            title="Pending Orders"
            value={totals.pending.toString()}
            change="0"
            status="down"
            icon={Clock}
            variant="amber"
            description="Awaiting Fulfillment"
          />
          <SummaryCard
            title="Completed Orders"
            value={totals.completed.toString()}
            change="0"
            status="up"
            icon={CheckCircle}
            variant="emerald"
            description="Order Delivered"
          />
          <SummaryCard
            title="Total Amount"
            value={Number(totals.totalCapital)}
            change="0"
            status="up"
            icon={IndianRupee}
            variant="red"
            description="Gross Outlay"
          />
        </div>

        {/* Main Table Container */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} className="text-indigo-500" /> Active Purchase Orders
            </h4>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="SEARCH PO IDENTIFIER..."
                  className="pl-10 pr-6 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600 transition-all w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading records...</p>
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-0">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project/Description</th>
                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance Remaining</th>
                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchaseOrders.map((row) => (
                    <tr key={row._id} className="group hover:bg-indigo-50/30 transition-all">
                      <td className="bg-slate-50/50 py-4 px-8 rounded-l-[24px] border-y border-l border-transparent">
                        <div>
                          <p className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                            {row.uniqueId || (row.formData?.referenceId ? row.formData.referenceId.substring(0, 8) : row._id?.substring(0, 8).toUpperCase())}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(row.createdAt).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-4 px-6 border-y border-transparent">
                        <div className="space-y-1.5">
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{row.formData?.projectTitle || 'General'}</p>
                            {row.formData?.description && (
                              <p className="text-[9px] font-medium text-slate-400 mt-0.5 italic">"{row.formData.description}"</p>
                            )}
                          </div>

                          {/* Initiator and Agent Info */}
                          <div className="flex flex-col gap-1 pt-0.5">
                            {/* Project Content */}
                          </div>

                          {/* Services / Vendors Summary */}
                          {Array.isArray(row.formData?.vendors) && row.formData.vendors.length > 0 && (
                            <div className="flex flex-col gap-1 pt-1 border-t border-slate-50 mt-1">
                              {row.formData.vendors.map((v: any, idx: number) => (
                                <p key={idx} className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                                  <span className="w-1 h-1 bg-indigo-200 rounded-full shrink-0" />
                                  {v.details}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="bg-slate-50/50 py-4 px-6 text-right border-y border-transparent">
                        <p className="text-[11px] font-black text-slate-900">₹{Number(row.financialReview?.requestedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="bg-slate-50/50 py-4 px-6 text-right border-y border-transparent">
                        <p className="text-[11px] font-black text-rose-600">₹{Number((row.financialReview?.approvedAmount || row.financialReview?.requestedAmount || 0) - (row.purchaseDetails?.billForm?.totalAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="bg-slate-50/50 py-4 px-6 text-center border-y border-transparent">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${getStatusColor(row.financialReview?.status || row.status)}`}>
                          {row.financialReview?.status || row.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="bg-slate-50/50 py-4 px-6 rounded-r-[24px] text-right border-y border-r border-transparent">
                        <button
                          onClick={() => router.push(`/super-admin-dashboard/finance/purchase-orders/${row._id}`)}
                          className="p-2.5 bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl border border-slate-100 transition-all shadow-sm group-hover:scale-105 active:scale-95"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {purchaseOrders.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No purchase orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create PO Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Purchase Order</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
                      Create a direct purchase order
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-3 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePO} className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link to Project</label>
                    <select
                      value={newPO.projectId}
                      onChange={(e) => {
                        const selectedProjectId = e.target.value;
                        const pListProj = projectsList.find(p => p._id === selectedProjectId);

                        // Real-time Title Resolution (No static registry)
                        const resolvedTitle = pListProj ? (
                          pListProj.formData?.projectTitle ||
                          pListProj.formData?.titleProject ||
                          pListProj.paymentDetails?.title ||
                          pListProj.category ||
                          pListProj.department ||
                          pListProj.uniqueId
                        ) : "";

                        setNewPO({
                          ...newPO,
                          projectId: selectedProjectId,
                          projectTitle: resolvedTitle
                        });
                      }}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    >
                      <option value="">-- Independent Order (No Project) --</option>
                      {(() => {
                        // Real-Time Stakeholder Initiative Filter (Excludes purely transactional entries)
                        const masterProjects = projectsList.filter(p =>
                          (p.department || '').toUpperCase().trim() !== 'FINANCIAL' &&
                          (p.uniqueId || '').toLowerCase() !== 'superadmin'
                        );

                        return masterProjects.map(p => {
                          const display = p.formData?.projectTitle || p.formData?.titleProject || p.paymentDetails?.title || p.category || p.department || p.uniqueId;
                          return (
                            <option key={`${p._id}_initiative`} value={p._id}>
                              {p.uniqueId} - {display}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project / Item Name</label>
                    <input
                      type="text"
                      required
                      value={newPO.projectTitle}
                      onChange={(e) => setNewPO({ ...newPO, projectTitle: e.target.value })}
                      placeholder="e.g. Server Infrastructure Q3"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendors & Distribution</label>
                      <button
                        type="button"
                        onClick={() => setNewPO({ ...newPO, vendors: [...newPO.vendors, { details: '', amount: '' }] })}
                        className="text-[10px] flex items-center gap-1 bg-slate-100 text-indigo-600 px-3 py-1.5 rounded-full font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
                      >
                        <Plus size={10} /> Add Vendor
                      </button>
                    </div>
                    <div className="space-y-3">
                      {newPO.vendors.map((v, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <input
                            type="text"
                            placeholder="Vendor Name / Service Details"
                            value={v.details}
                            onChange={(e) => {
                              const updated = newPO.vendors.map((item, idx) =>
                                idx === i ? { ...item, details: e.target.value } : item
                              );
                              setNewPO({ ...newPO, vendors: updated });
                            }}
                            className="flex-[2] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                          <input
                            type="number"
                            placeholder="Amount (₹)"
                            min="0" step="0.01"
                            value={v.amount}
                            onChange={(e) => {
                              const updated = newPO.vendors.map((item, idx) =>
                                idx === i ? { ...item, amount: e.target.value } : item
                              );
                              const newTotal = updated.reduce((sum, current) => sum + (Number(current.amount) || 0), 0);
                              setNewPO({ ...newPO, vendors: updated, requestedAmount: newTotal > 0 ? newTotal.toString() : newPO.requestedAmount });
                            }}
                            className="flex-[1] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                          />
                          {newPO.vendors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newPO.vendors.filter((_, idx) => idx !== i);
                                const newTotal = updated.reduce((sum, current) => sum + (Number(current.amount) || 0), 0);
                                setNewPO({ ...newPO, vendors: updated, requestedAmount: newTotal > 0 ? newTotal.toString() : '' });
                              }}
                              className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all mt-0.5"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newPO.requestedAmount}
                        onChange={(e) => setNewPO({ ...newPO, requestedAmount: e.target.value })}
                        placeholder="e.g. 50000"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pieces / Quantity</label>
                      <input
                        type="text"
                        required
                        value={newPO.pieces}
                        onChange={(e) => setNewPO({ ...newPO, pieces: e.target.value })}
                        placeholder="e.g. 10 Units"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      required
                      value={newPO.description}
                      onChange={(e) => setNewPO({ ...newPO, description: e.target.value })}
                      placeholder="Why are you buying this? (Brief details)..."
                      rows={4}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Attachments (Images/PDFs)</label>
                    <div className="relative group/upload">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] p-6 flex flex-col items-center justify-center gap-2 group-hover/upload:border-indigo-300 group-hover/upload:bg-indigo-50/30 transition-all">
                        <Paperclip size={20} className="text-slate-300 group-hover/upload:text-indigo-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Files or Drag & Drop</p>
                      </div>
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedFiles.map((f, i) => (
                          <div key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[9px] font-black border border-indigo-100 flex items-center gap-2">
                            <span className="truncate max-w-[120px]">{f.name}</span>
                            <button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} className="hover:text-rose-600 focus:outline-none"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-6 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreating ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Submit Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
