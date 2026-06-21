'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { validateURL } from '@/lib/validation';
import DOMPurify from 'dompurify';
import { 
  ShoppingCart, 
  ArrowUpRight, 
  CheckCircle, 
  Package, 
  Truck, 
  Eye, 
  FileText, 
  DollarSign, 
  Calendar, 
  Layers, 
  Loader2, 
  Navigation, 
  ShieldCheck, 
  Activity, 
  Send, 
  Receipt, 
  ArrowDownLeft, 
  Check, 
  FileCheck, 
  ImageOff, 
  Zap,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import Header from '../../../../adminCompontent/Header';

export default function PurchaseOrderDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      fetchPODetails();
    }
  }, [id]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Using /api/purchase/all and filtering for now as per previous logic, 
      // though a specific detail endpoint would be better if backend supports it
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/purchase/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const found = response.data.data.find((p: any) => p._id === id);
        setPo(found);
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('APPROV') || s.includes('SETTLED') || s.includes('DELIVER') || s.includes('COMPLET')) return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50';
    if (s.includes('PEND') || s.includes('TRANSIT') || s.includes('REVIEW')) return 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50';
    if (s.includes('REJECT') || s.includes('FAIL')) return 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-50';
    return 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-indigo-50';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sourcing Artifacts...</p>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
          <FileText size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Purchase Order Not Found</h2>
        <button onClick={() => router.back()} className="text-indigo-600 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="p-10 space-y-10 w-full">
      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">PO Details</h2>
              <span className={`text-[10px] inline-flex items-center gap-1 font-black uppercase tracking-widest px-4 py-1 rounded-full border shadow-sm ${getStatusColor(po.financialReview?.status || po.status)} italic`}>
                 {po.financialReview?.status || po.status || 'PENDING'}
              </span>
            </div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">
              Identifier: {po.uniqueId || (po.formData?.referenceId ? po.formData.referenceId.substring(0, 8) : po._id?.substring(0, 8).toUpperCase())}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="px-5 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              Linked to Project: {po.formData?.projectTitle || 'General'}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* General Information */}
          <div className="space-y-6">
             <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <Layers size={14} className="text-indigo-500" /> Procurement Context
             </h4>
             <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project Scope</p>
                  <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{po.formData?.projectTitle || 'General Inventory'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Acquisition Rationale</p>
                  <p className="font-medium text-slate-600 text-sm leading-relaxed italic">
                    "{po.financialReview?.requestReason || po.formData?.description || 'Strategic acquisition for specialized discovery operations.'}"
                  </p>
                </div>
                   <div className="flex items-center gap-8 pt-4 border-t border-slate-100">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date</p>
                         <p className="font-black text-slate-900 text-xs">{new Date(po.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items / Pieces</p>
                         <p className="font-black text-indigo-600 text-[10px] uppercase italic tracking-widest">{po.formData?.pieces || 'Standard Unit'}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Version</p>
                         <p className="font-black text-slate-900 text-xs">V2.4.0-Stable</p>
                      </div>
                   </div>
             </div>
          </div>

          {/* Financial Architecture */}
          <div className="space-y-6">
             <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
               <DollarSign size={14} className="text-indigo-500" /> Capital Allocation
             </h4>
             <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                   <Activity size={100} />
                </div>
                <div className="relative z-10 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Requested Outlay</p>
                        <h5 className="text-3xl font-black tracking-tighter italic">
                          ${Number(po.financialReview?.requestedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h5>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Approval Verified</p>
                         <h5 className="text-3xl font-black text-emerald-400 italic">
                           ${Number(po.financialReview?.approvedAmount || po.financialReview?.requestedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </h5>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Disbursed</p>
                         <h5 className="text-3xl font-black text-white italic">
                           ${Number(po.purchaseDetails?.amountSent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </h5>
                      </div>
                   </div>
                   
                </div>
             </div>
          </div>
        </div>




        {/* Metrics Grid */}
        {po.purchaseDetails && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-slate-100">
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Send size={12} /> Disbursed
                 </p>
                 <h5 className="text-3xl font-black text-slate-900">
                    ${Number(po.purchaseDetails.amountSent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </h5>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <Receipt size={12} /> Validated
                 </p>
                 <h5 className="text-3xl font-black text-slate-900">
                    ${Number(po.purchaseDetails.billForm?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </h5>
              </div>
              <div className="bg-emerald-50/50 p-8 rounded-[32px] border border-emerald-100 shadow-sm group">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    <ArrowDownLeft size={12} /> Remaining Fund
                 </p>
                 <h5 className="text-3xl font-black text-emerald-700">
                    ${Number((po.financialReview?.approvedAmount || po.financialReview?.requestedAmount || 0) - (po.purchaseDetails?.billForm?.totalAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </h5>
              </div>
           </div>
        )}

        {/* Evidence Artifact */}
        {po.purchaseDetails?.billForm?.billImage && (
           <div className="pt-10">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                <ShieldCheck size={14} className="text-emerald-500" /> Compliance Evidence
              </h4>
              <div className="relative group max-w-2xl rounded-[32px] overflow-hidden border border-slate-100 shadow-2xl">
                 <img 
                    src={DOMPurify.sanitize(validateURL(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/${po.purchaseDetails.billForm.billImage.replace(/\\/g, '/')}`))}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex flex-col justify-end p-8">
                    <p className="text-white font-black text-lg uppercase">Official Receipt Copy</p>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Verified by Compliance Node</p>
                 </div>
              </div>
           </div>
        )}
      </div>
      </main>
    </div>
  );
}
