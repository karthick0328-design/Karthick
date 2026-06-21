'use client';

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
   FileSpreadsheet,
   Plus,
   Trash2,
   PieChart,
   Download,
   TrendingDown,
   TrendingUp,
   ReceiptText,
   Building2,
   Calculator,
   ShieldCheck,
   Loader2
} from 'lucide-react';
import SummaryCard from '../../components/SummaryCard';

const COMPANY_STATE = 'Tamil Nadu'; // Set Home State for Intra vs Inter State matching

type RecordData = {
   id: string;
   date: string;
   docNumber: string; // Invoice / Bill
   partyName: string; // Customer / Supplier
   partyGSTIN: string;
   categoryOrState: string; // Place of supply OR Expense Category
   description: string;
   hsnSac: string;
   unit: string;
   quantity: number;
   costPerUnit: number;
   gstRate: number; // 0, 5, 12, 18, 28
   discount: number;
   isInterState: boolean; // Computed or toggleable
};

export default function GSTTrackerPage() {
   const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'expenses'>('summary');
   const [loading, setLoading] = useState(true);
   const [month, setMonth] = useState(new Date().getMonth() + 1);
   const [year, setYear] = useState(new Date().getFullYear());

   const [sales, setSales] = useState<RecordData[]>([]);
   const [expenses, setExpenses] = useState<RecordData[]>([]);

   const fetchGST = React.useCallback(async () => {
      setLoading(true);
      try {
         const token = localStorage.getItem('token');
         // Using the GST report endpoint we just updated to return salesData and expensesData
         const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/gst/report`, {
            params: { month, year },
            headers: { Authorization: `Bearer ${token}` }
         });
         if (response.data.success) {
            const { salesData, expensesData } = response.data.data;
            if (salesData) setSales(salesData);
            if (expensesData) setExpenses(expensesData);
         }
      } catch (error) {
         console.error('Error fetching GST data:', error);
      } finally {
         setLoading(false);
      }
   }, [month, year]);

   React.useEffect(() => {
      fetchGST();
   }, [fetchGST]);

   // Formulas calculation engine
   const calculateRow = (row: RecordData) => {
      const taxableValue = row.quantity * row.costPerUnit;
      const gstAmount = (taxableValue * row.gstRate) / 100;

      let cgst = 0, sgst = 0, igst = 0;

      if (row.isInterState) {
         igst = gstAmount;
      } else {
         cgst = gstAmount / 2;
         sgst = gstAmount / 2;
      }

      const grandTotal = taxableValue + gstAmount - row.discount;

      return { taxableValue, cgst, sgst, igst, totalGst: gstAmount, grandTotal };
   };

   const getAggregation = (data: RecordData[]) => {
      return data.reduce((acc, row) => {
         const calc = calculateRow(row);
         return {
            taxable: acc.taxable + calc.taxableValue,
            cgst: acc.cgst + calc.cgst,
            sgst: acc.sgst + calc.sgst,
            igst: acc.igst + calc.igst,
            totalGst: acc.totalGst + calc.totalGst,
            grandTotal: acc.grandTotal + calc.grandTotal,
            discount: acc.discount + row.discount
         };
      }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, grandTotal: 0, discount: 0 });
   };

   const salesSummary = useMemo(() => getAggregation(sales), [sales]);
   const expenseSummary = useMemo(() => getAggregation(expenses), [expenses]);

   const netGstPayable = salesSummary.totalGst - expenseSummary.totalGst;

   const renderTable = (type: 'sales' | 'expenses', data: RecordData[]) => (
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden mt-6 flex flex-col w-full">
         <div className={`px-8 py-5 flex items-center justify-between border-b ${type === 'sales' ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
            <div className="flex items-center gap-3">
               <FileSpreadsheet className={type === 'sales' ? 'text-indigo-600' : 'text-rose-600'} />
               <h3 className={`text-xl font-black ${type === 'sales' ? 'text-indigo-900' : 'text-rose-900'}`}>
                  {type === 'sales' ? 'Sales GST Report (Outward Supplies)' : 'Expense GST Report (Inward Supplies)'}
               </h3>
            </div>
         </div>
         <div className="overflow-x-auto custom-scrollbar flex-1 pb-10">
            <table className="w-full text-left whitespace-nowrap min-w-[1800px]">
               <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                     <th className="px-4 py-4 w-32">Date</th>
                     <th className="px-4 py-4 w-32">{type === 'sales' ? 'Invoice No.' : 'Bill No.'}</th>
                     <th className="px-4 py-4 w-40">{type === 'sales' ? 'Customer Name' : 'Supplier Name'}</th>
                     <th className="px-4 py-4 w-36">GSTIN</th>
                     <th className="px-4 py-4 w-36">{type === 'sales' ? 'Place of Supply' : 'Category'}</th>
                     <th className="px-4 py-4 w-32 text-center border-l border-slate-200 bg-slate-100/50">Interstate?</th>
                     <th className="px-4 py-4 w-48">Description</th>
                     <th className="px-4 py-4 w-28">HSN/SAC</th>
                     <th className="px-4 py-4 w-20">Unit</th>
                     <th className="px-4 py-4 w-24 text-right bg-indigo-50/30 border-l border-slate-200">Qty</th>
                     <th className="px-4 py-4 w-28 text-right bg-indigo-50/30">Cost / Unit (₹)</th>
                     <th className="px-4 py-4 text-right font-black text-indigo-700 bg-indigo-50 border-r border-slate-200">Taxable Value (₹)</th>
                     <th className="px-4 py-4 w-24 border-l border-slate-200 bg-emerald-50/30 text-center">GST Rate</th>
                     <th className="px-4 py-4 text-right bg-emerald-50/30">CGST (₹)</th>
                     <th className="px-4 py-4 text-right bg-emerald-50/30">SGST (₹)</th>
                     <th className="px-4 py-4 text-right bg-emerald-50/30">IGST (₹)</th>
                     <th className="px-4 py-4 w-28 text-right bg-rose-50/30 border-l border-slate-200">Discount (₹)</th>
                     <th className="px-6 py-4 text-right bg-slate-900 text-white font-black sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.1)]">{type === 'sales' ? 'Grand Total (₹)' : 'Total Bill (₹)'}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {data.map((row) => {
                     const calc = calculateRow(row);
                     return (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors text-sm">
                           <td className="px-4 py-4 font-medium text-slate-700">{row.date}</td>
                           <td className="px-4 py-4 font-medium text-slate-700">{row.docNumber}</td>
                           <td className="px-4 py-4 font-medium text-slate-700">{row.partyName}</td>
                           <td className="px-4 py-4 font-bold text-slate-500">{row.partyGSTIN || 'NA'}</td>
                           <td className="px-4 py-4 font-medium text-slate-700">{row.categoryOrState}</td>
                           <td className="px-4 py-4 border-l border-slate-200 bg-slate-100/20 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${row.isInterState ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                 {row.isInterState ? 'YES' : 'NO'}
                              </span>
                           </td>
                           <td className="px-4 py-4 font-medium text-xs text-slate-700">{row.description}</td>
                           <td className="px-4 py-4 font-bold text-xs text-slate-500">{row.hsnSac || '-'}</td>
                           <td className="px-4 py-4 font-bold text-xs text-slate-500">{row.unit || 'Nos'}</td>
                           <td className="px-4 py-4 font-bold text-slate-700 text-right border-l border-slate-100 bg-indigo-50/10">{row.quantity}</td>
                           <td className="px-4 py-4 font-bold text-slate-700 text-right bg-indigo-50/10">{row.costPerUnit.toLocaleString()}</td>
                           <td className="px-4 py-4 text-right font-black text-indigo-700 bg-indigo-50 border-r border-slate-200">{(calc.taxableValue).toLocaleString()}</td>
                           <td className="px-4 py-4 border-l border-slate-100 bg-emerald-50/10 text-center font-black text-emerald-700">{row.gstRate}%</td>
                           <td className="px-4 py-4 text-right bg-emerald-50/10 font-bold text-slate-600">{(calc.cgst).toLocaleString()}</td>
                           <td className="px-4 py-4 text-right bg-emerald-50/10 font-bold text-slate-600">{(calc.sgst).toLocaleString()}</td>
                           <td className="px-4 py-4 text-right bg-emerald-50/10 border-r border-emerald-100 font-bold text-slate-600">{(calc.igst).toLocaleString()}</td>
                           <td className="px-4 py-4 border-l border-slate-100 bg-rose-50/10 font-bold text-rose-600 text-right">{row.discount.toLocaleString()}</td>
                           <td className="px-6 py-4 text-right font-black bg-slate-100 border-l border-slate-200 text-slate-900 sticky right-0 z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">₹{(calc.grandTotal).toLocaleString()}</td>
                        </tr>
                     )
                  })}

                  {data.length === 0 && (
                     <tr>
                        <td colSpan={18} className="px-4 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                           No records found for this period
                        </td>
                     </tr>
                  )}
               </tbody>
               <tfoot className="bg-slate-100 shadow-inner sticky bottom-0">
                  {(() => {
                     const total = type === 'sales' ? salesSummary : expenseSummary;
                     return (
                        <tr className="text-right text-[11px] font-black uppercase tracking-widest text-slate-800">
                           <td colSpan={11} className="px-4 py-5">Totals:</td>
                           <td className="px-4 py-5 text-indigo-700 border-x border-slate-200 bg-indigo-200/50">₹{total.taxable.toLocaleString()}</td>
                           <td className="px-4 py-5 text-center border-r border-slate-200">—</td>
                           <td className="px-4 py-5 text-emerald-700">₹{total.cgst.toLocaleString()}</td>
                           <td className="px-4 py-5 text-emerald-700">₹{total.sgst.toLocaleString()}</td>
                           <td className="px-4 py-5 text-emerald-700 border-r border-emerald-200">₹{total.igst.toLocaleString()}</td>
                           <td className="px-4 py-5 text-rose-600">₹{total.discount.toLocaleString()}</td>
                           <td className="px-6 py-5 bg-slate-900 text-white text-sm sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.15)]">₹{total.grandTotal.toLocaleString()}</td>
                        </tr>
                     );
                  })()}
               </tfoot>
            </table>
         </div>
      </div>
   );

   const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
   ];
   const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

   return (
      <div className="space-y-12 pb-24 max-w-[1600px] mx-auto">
         {/* Header */}
         <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 ring-2 ring-indigo-50">
                  <Calculator size={10} className="text-indigo-400" />
                  <span>Interactive Tool</span>
               </div>
               <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-4">
                     GST Returns Calculator
                     <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                  </h2>
                  <p className="text-[11px] font-bold text-slate-400 mt-3 uppercase tracking-widest leading-relaxed">
                     Dynamically compute India GST Tax metrics with real-time formulas. <br /> Taxable Value = Qty × Cost. Net GST = Output - Input.
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                  <select
                     value={month}
                     onChange={(e) => setMonth(parseInt(e.target.value))}
                     className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-0 cursor-pointer px-3"
                  >
                     {months.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                     ))}
                  </select>
                  <div className="w-px h-4 bg-slate-100" />
                  <select
                     value={year}
                     onChange={(e) => setYear(parseInt(e.target.value))}
                     className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-900 focus:ring-0 cursor-pointer px-3"
                  >
                     {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                     ))}
                  </select>
               </div>
               <button className="px-5 py-5 bg-slate-900 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-3">
                  <Download size={16} /> Export to Excel
               </button>
            </div>
         </div>

         {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[40px] border border-slate-100 shadow-xl">
               <Loader2 className="animate-spin text-indigo-600" size={40} />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic tracking-[0.2em]">Syncing GST ledgers...</p>
            </div>
         )}

         {/* Tabs */}
         {!loading && (
            <>
               <div className="flex gap-4 p-2 bg-slate-100 rounded-2xl w-max">
                  <button onClick={() => setActiveTab('summary')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>
                     <PieChart size={14} /> Monthly GST Summary
                  </button>
                  <button onClick={() => setActiveTab('sales')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                     <TrendingUp size={14} /> Sales Report (Outward)
                  </button>
                  <button onClick={() => setActiveTab('expenses')} className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                     <TrendingDown size={14} /> Expense Report (Inward)
                  </button>
               </div>

               {/* Monthly Summary Tab */}
               {activeTab === 'summary' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <SummaryCard
                           title="Total Taxable Sales"
                           value={`₹${salesSummary.taxable.toLocaleString()}`}
                           change="+0"
                           status="up"
                           icon={TrendingUp}
                           variant="purple"
                           description="Gross Revenue"
                        />
                        <SummaryCard
                           title="Total Taxable Purchases"
                           value={`₹${expenseSummary.taxable.toLocaleString()}`}
                           change="+0"
                           status="down"
                           icon={TrendingDown}
                           variant="emerald"
                           description="Total Procurement"
                        />
                        <SummaryCard
                           title="Output GST (Collected)"
                           value={`₹${salesSummary.totalGst.toLocaleString()}`}
                           change="+0"
                           status="up"
                           icon={ReceiptText}
                           variant="amber"
                           description="Tax Liability"
                        />
                        <SummaryCard
                           title="Input GST (ITC Paid)"
                           value={`₹${expenseSummary.totalGst.toLocaleString()}`}
                           change="+0"
                           status="up"
                           icon={FileSpreadsheet}
                           variant="red"
                           description="Input Credits"
                        />
                     </div>

                     <div className="bg-slate-900 rounded-[48px] shadow-2xl border border-slate-800 flex flex-col md:flex-row overflow-hidden">
                        <div className="flex-1 p-12 lg:p-16 border-r border-white/10 relative">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/30 blur-[100px] rounded-full pointer-events-none" />
                           <p className="inline-flex px-4 py-1.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Tax Liability</p>
                           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Net GST Payable <br /> (Output - Input)</h3>
                           <div className="flex items-end gap-4 mt-2">
                              <span className={`text-6xl lg:text-7xl font-black tracking-tighter ${netGstPayable > 0 ? 'text-white' : 'text-emerald-400'}`}>
                                 ₹{netGstPayable.toLocaleString()}
                              </span>
                           </div>
                           <p className="text-xs font-bold text-slate-500 mt-6 max-w-sm leading-relaxed">
                              This is the final amount payable to the government via cash ledger after adjusting available Input Tax Credits.
                           </p>
                        </div>

                        <div className="w-full md:w-[450px] bg-slate-800/50 p-12 space-y-8 flex flex-col justify-center text-white">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-4">GST Collection Breakdown</h4>

                           <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                              <span className="text-xs font-bold text-slate-300">Total CGST Collected</span>
                              <span className="text-lg font-black tracking-tight text-white">₹{salesSummary.cgst.toLocaleString()}</span>
                           </div>

                           <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                              <span className="text-xs font-bold text-slate-300">Total SGST Collected</span>
                              <span className="text-lg font-black tracking-tight text-white">₹{salesSummary.sgst.toLocaleString()}</span>
                           </div>

                           <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                              <span className="text-xs font-bold text-slate-300">Total IGST Collected</span>
                              <span className="text-lg font-black tracking-tight text-white">₹{salesSummary.igst.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Sales Tab */}
               {activeTab === 'sales' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {renderTable('sales', sales)}
                  </div>
               )}

               {/* Expenses Tab */}
               {activeTab === 'expenses' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {renderTable('expenses', expenses)}
                  </div>
               )}
            </>
         )}
         {/* Calculation Logic & Compliance Reference */}
         <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl p-12 space-y-12 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 blur-[120px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-indigo-100/50" />

            <div className="flex items-center gap-4 relative">
               <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <ShieldCheck size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Calculation Logic & Compliance Reference</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Understanding how your GST metrics are derived</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
               <div className="space-y-4 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-3 text-indigo-600">
                     <TrendingUp size={18} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Total Taxable Sales</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                     Aggregates the base value of all customer engagements (Projects) excluding procurement orders.
                     Includes projects paid or updated within the selected month.
                  </p>
                  <div className="pt-2 text-[10px] font-black text-indigo-700 bg-indigo-50/50 px-3 py-1.5 rounded-lg w-max uppercase tracking-widest">
                     Formula: Σ (Qty × Base Cost)
                  </div>
               </div>

               <div className="space-y-4 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-3 text-emerald-600">
                     <TrendingDown size={18} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Total Taxable Purchases</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                     Sum of all procurement activities and corporate expenses. Synchronized directly
                     from the Expense Registry and Purchase Order system.
                  </p>
                  <div className="pt-2 text-[10px] font-black text-emerald-700 bg-emerald-50/50 px-3 py-1.5 rounded-lg w-max uppercase tracking-widest">
                     Formula: Σ (PO Amount + Expenses)
                  </div>
               </div>

               <div className="space-y-4 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 hover:border-violet-200 transition-all">
                  <div className="flex items-center gap-3 text-violet-600">
                     <ReceiptText size={18} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Tax Breakdown (Output)</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                     Automatically computed as 18% of taxable sales. Intra-state sales (Tamil Nadu) are split
                     into CGST/SGST, while Inter-state sales are attributed to IGST.
                  </p>
                  <div className="pt-2 text-[10px] font-black text-violet-700 bg-violet-50/50 px-3 py-1.5 rounded-lg w-max uppercase tracking-widest">
                     Logic: 9% CGST + 9% SGST OR 18% IGST
                  </div>
               </div>

               <div className="space-y-4 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 hover:border-sky-200 transition-all">
                  <div className="flex items-center gap-3 text-sky-600">
                     <FileSpreadsheet size={18} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Input Tax Credit (ITC)</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed">
                     Tax paid on business purchases that reduces your final liability. Values are
                     fetched from valid expense receipts where tax is explicitly recorded.
                  </p>
                  <div className="pt-2 text-[10px] font-black text-sky-700 bg-sky-50/50 px-3 py-1.5 rounded-lg w-max uppercase tracking-widest">
                     Source: Expense Registry
                  </div>
               </div>

               <div className="lg:col-span-2 space-y-4 p-6 rounded-[24px] bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden group/card shadow-indigo-500/10">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full -mr-24 -mt-24 pointer-events-none" />
                  <div className="flex items-center gap-3 text-indigo-400 relative">
                     <ShieldCheck size={18} />
                     <h4 className="text-xs font-black uppercase tracking-widest">Final Tax Settlement</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed relative max-w-2xl">
                     The Net GST Payable represents your real-time tax obligation to the government.
                     It is calculated by subtracting your Input Tax Credits from your Total Output Tax.
                     A negative value indicates a carry-forward credit.
                  </p>
                  <div className="pt-2 text-[10px] font-black text-white bg-indigo-600 px-4 py-2 rounded-xl w-max uppercase tracking-widest shadow-lg shadow-indigo-600/20">
                     Net Payable = (Output Collected — Input Credits)
                  </div>
               </div>
            </div>
         </div>

         {/* Global generic styles for scrollbar */}
         <style jsx global>{`
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>
      </div>
   );
}
