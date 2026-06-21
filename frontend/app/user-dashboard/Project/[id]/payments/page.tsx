// ──────────────────────────────────────────────────────────────────────────────
//  User Payment Submission
//  Allows users to record payments (cash, check, UPI, bank transfer)
// ──────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type Project = {
  _id: string;
  uniqueId: string;
  quotedAmount?: number;
  paymentDetails?: {
    paidAmount: number;
    amount: number;
  };
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('Cash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // ──────────────────────────────────────────────────────────────────────────
  // Authenticated fetch
  // ──────────────────────────────────────────────────────────────────────────
  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    };
    const res = await fetch(`${API}${url}`, { ...opts, headers });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Request failed');
    }
    return res.json();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Load project
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch(`/projects/${projectId}`);
        setProject(data.project);
      } catch (e: any) {
        setMessage(e.message);
      }
    })();
  }, [projectId]);

  // ──────────────────────────────────────────────────────────────────────────
  // Submit payment
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await authFetch(`/projects/${projectId}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method,
          transactionId,
          notes,
          paymentType: 'milestone',
        }),
      });
      setMessage('Payment recorded successfully!');
      setTimeout(() => {
        router.push(`/user-dashboard/projects/${projectId}`);
      }, 2000);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  const totalAmount = project.paymentDetails?.amount ?? project.quotedAmount ?? 0;
  const paidAmount = project.paymentDetails?.paidAmount ?? 0;
  const remaining = totalAmount - paidAmount;

  return (
    <div className="animate-in fade-in duration-500 w-full flex-1 flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Submit Payment</h1>
        <p className="text-gray-600 font-medium">Record your project payments securely.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {message && (
            <div className={`p-4 mb-6 rounded-2xl border ${message.includes('successfully') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'} font-bold flex items-center gap-2 animate-in slide-in-from-top-2`}>
              {message.includes('successfully') ? '✅' : '❌'}
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-white/60 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Amount</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</div>
                  <input
                    type="number"
                    className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    max={remaining}
                    min={1}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 font-medium ml-1">
                  Maximum allowable: <span className="text-red-500 font-bold">${remaining.toLocaleString()}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                <select
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option>Cash</option>
                  <option>Check</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Transaction ID / Check Number
              </label>
              <input
                type="text"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction reference"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
              <textarea
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes here..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a1c21] text-white py-4 rounded-2xl hover:bg-gray-800 font-bold text-lg shadow-xl shadow-gray-200 transition-all"
            >
              Confirm and Submit Payment
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-white/60 p-8">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Project Summary</h2>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Project ID</p>
                <p className="text-xl font-black text-gray-900">{project.uniqueId}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Due</p>
                  <p className="text-xl font-black text-gray-900">${totalAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-xl font-black text-green-700">${paidAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Remaining</p>
                  <p className="text-xl font-black text-red-700">${remaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
