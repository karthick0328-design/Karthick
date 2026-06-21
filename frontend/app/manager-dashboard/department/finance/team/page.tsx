'use client';

import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { Users, CheckSquare, Square, Shield, Loader2, ChevronDown, Briefcase } from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

const SERVICE_OPTIONS = [
    { id: 'service', name: 'All Services' },
    { id: 'service:ngs', name: 'NGS' },
    { id: 'service:drug-discovery', name: 'Drug Discovery' },
    { id: 'service:software-development', name: 'Software Development' },
    { id: 'service:microbiology', name: 'Microbiology' },
    { id: 'service:biochemistry', name: 'Biochemistry' },
    { id: 'service:molecular-biology', name: 'Molecular Biology' },
];

interface FinanceEmployee {
    _id: string;
    name: string;
    uniqueId: string;
    department: string;
    financeAccess: string[]; // ['attendance', 'salary', 'service', 'purchase']
}

export default function FinanceTeamAccessPage() {
    const [employees, setEmployees] = useState<FinanceEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/finance/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
            } else {
                toast.error('Failed to load team data');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    const toggleAccess = async (userId: string, accessType: string, currentAccess: string[], forceNewValue?: string[]) => {
        // Use forced value if provided (for dropdowns), otherwise toggle the singular permission
        const newAccess = forceNewValue !== undefined
            ? forceNewValue
            : currentAccess.includes(accessType) ? [] : [accessType];

        // Optimistic UI Update
        setEmployees(prev => prev.map(e => e._id === userId ? { ...e, financeAccess: newAccess } : e));

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/finance/team/access`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, access: newAccess })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            toast.success('Permissions updated');
        } catch (err) {
            toast.error('Update failed, reverting...');
            fetchEmployees(); // Revert on failure
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black mb-2 tracking-tight">Access Control</h1>
                        <p className="text-slate-300">Assign operational permissions to Finance Department employees.</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                {loading ? (
                    <div className="p-20 flex justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : employees.length === 0 ? (
                    <div className="p-20 text-center text-slate-400 font-bold">
                        No employees found in Finance Department.
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-40">Salaries</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-40">Services</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-40">Purchase</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {employees.map(emp => (
                                <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-lg">{emp.name}</div>
                                                <div className="text-xs text-slate-400 font-bold tracking-wider">{emp.uniqueId} • {emp.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Salaries Column */}
                                    <td className="px-8 py-6 text-center">
                                        <button
                                            onClick={() => toggleAccess(emp._id, 'salary', emp.financeAccess || [])}
                                            className={`w-full max-w-[120px] mx-auto py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn ${(emp.financeAccess || []).includes('salary')
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                        >
                                            {(emp.financeAccess || []).includes('salary') ? (
                                                <><CheckSquare size={18} /><span className="text-xs font-bold uppercase tracking-widest">Active</span></>
                                            ) : (
                                                <><Square size={18} /><span className="text-xs font-bold uppercase tracking-widest">Locked</span></>
                                            )}
                                        </button>
                                    </td>

                                    {/* Services Column (Dynamic Selection) */}
                                    <td className="px-8 py-6 text-center">
                                        <div className="relative inline-block w-full max-w-[200px]">
                                            <select
                                                value={(emp.financeAccess || []).find(a => a === 'service' || a.startsWith('service:')) || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const newAccess = val ? [val] : [];
                                                    toggleAccess(emp._id, val, emp.financeAccess || [], newAccess);
                                                }}
                                                className={`w-full py-3 px-4 rounded-xl border-2 transition-all appearance-none cursor-pointer font-bold text-xs uppercase tracking-widest outline-none
                                                    ${(emp.financeAccess || []).some(a => a === 'service' || a.startsWith('service:'))
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                <option value="" className="text-slate-900 bg-white">No Service Access</option>
                                                {SERVICE_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id} className="text-slate-900 bg-white">
                                                        {opt.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${(emp.financeAccess || []).some(a => a === 'service' || a.startsWith('service:')) ? 'text-white' : 'text-slate-400'}`}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Purchase Column */}
                                    <td className="px-8 py-6 text-center">
                                        <button
                                            onClick={() => toggleAccess(emp._id, 'purchase', emp.financeAccess || [])}
                                            className={`w-full max-w-[120px] mx-auto py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn ${(emp.financeAccess || []).includes('purchase')
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                }`}
                                        >
                                            {(emp.financeAccess || []).includes('purchase') ? (
                                                <><CheckSquare size={18} /><span className="text-xs font-bold uppercase tracking-widest">Active</span></>
                                            ) : (
                                                <><Square size={18} /><span className="text-xs font-bold uppercase tracking-widest">Locked</span></>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-900">Security Note</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Granting access allows employees to view and manage specific modules.
                        Note: Employees are restricted to one active permission at a time to ensure separation of duties.
                    </p>
                </div>
            </div>
        </div>
    );
}
