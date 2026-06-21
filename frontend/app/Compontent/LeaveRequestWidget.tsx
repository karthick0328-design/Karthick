'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, Send, AlertCircle, CheckCircle2, Clock, Sparkles, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format, eachDayOfInterval, parseISO, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface LeaveRequestWidgetProps {
    onSuccess?: () => void;
    variant?: 'default' | 'card';
}

const LeaveRequestWidget: React.FC<LeaveRequestWidgetProps> = ({ onSuccess, variant = 'default' }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (reason.trim().length < 10) {
            setError('Please provide a reason (at least 10 characters)');
            return;
        }

        const start = parseISO(startDate);
        const end = parseISO(endDate);

        if (isAfter(start, end)) {
            setError('Start date cannot be after end date');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            const token = localStorage.getItem('token');

            // Generate all dates in the range
            const days = eachDayOfInterval({ start, end });

            let successCount = 0;
            let errorMessages: string[] = [];

            // Submit request for each day
            for (const day of days) {
                try {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const checkInTime = new Date(day);
                    checkInTime.setHours(9, 0, 0, 0);

                    const response = await axios.post(`${API_URL}/api/attendance/self`, {
                        status: 'on-leave',
                        leaveReason: reason.trim(),
                        date: dateStr,
                        checkIn: checkInTime.toISOString()
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data.success) {
                        successCount++;
                    }
                } catch (err: any) {
                    const msg = err.response?.data?.message || `Error for ${format(day, 'MMM dd')}`;
                    if (!errorMessages.includes(msg)) {
                        errorMessages.push(msg);
                    }
                }
            }

            if (successCount === days.length) {
                toast.success(`Leave request for ${successCount} day(s) submitted successfully`);
                setReason('');
                setIsOpen(false);
                if (onSuccess) onSuccess();
            } else if (successCount > 0) {
                toast.success(`Submitted ${successCount} out of ${days.length} days. Errors: ${errorMessages.join(', ')}`);
                setIsOpen(false);
                if (onSuccess) onSuccess();
            } else {
                setError(errorMessages[0] || 'Failed to submit leave request');
            }
        } catch (err: any) {
            console.error('Leave request error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative">
            {/* Trigger */}
            {variant === 'card' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    suppressHydrationWarning
                    className={`w-full group relative overflow-hidden text-left p-8 rounded-3xl transition-all duration-300 border bg-white border-white/20 hover:border-white/40 shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50`}
                >
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">Request Leave</h3>
                            <p className="text-gray-500 font-medium">Apply for time off</p>
                        </div>
                    </div>
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    suppressHydrationWarning
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium"
                >
                    <Calendar size={18} />
                    <span>Request Leave</span>
                </button>
            )}

            {/* Full Screen Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-white flex overflow-hidden"
                    >
                        {/* Decorative Left Panel */}
                        <div className="hidden lg:flex w-1/3 bg-gradient-to-br from-indigo-600 to-purple-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                                        <Calendar size={32} className="text-white" />
                                    </div>
                                    <span className="text-lg font-bold tracking-widest uppercase opacity-80">Leave Portal</span>
                                </div>
                                <h2 className="text-5xl font-black leading-tight mb-4">
                                    Need some<br />
                                    <span className="text-purple-300">Time Off?</span>
                                </h2>
                                <p className="text-purple-100 text-lg max-w-md mt-4 leading-relaxed">
                                    We understand that life happens. Submit your leave request for today, and we'll process it promptly.
                                </p>
                            </div>

                            <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                                <div className="flex items-center gap-3 text-purple-200 mb-2">
                                    <Sparkles size={20} />
                                    <span className="font-bold text-white uppercase tracking-wider text-xs">Reminder</span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed">
                                    Leave verification helps maintain accurate records. Please provide a clear reason for your absence to assist with team planning.
                                </p>
                            </div>
                        </div>

                        {/* Main Form Content */}
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 custom-scrollbar">
                            <div className="max-w-2xl mx-auto min-h-screen flex flex-col justify-center p-8 lg:p-12 relative">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    suppressHydrationWarning
                                    className="absolute top-8 right-8 p-2 bg-gray-100/50 hover:bg-gray-200/50 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mb-8 lg:hidden">
                                    <h2 className="text-3xl font-black text-gray-900 mb-2">Request Leave</h2>
                                    <p className="text-gray-500">Submit your time-off request.</p>
                                </div>

                                <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100">
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={16} className="text-purple-500" />
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    min={format(new Date(), 'yyyy-MM-dd')}
                                                    suppressHydrationWarning
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-bold text-gray-700"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={16} className="text-indigo-500" />
                                                    End Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    min={startDate}
                                                    suppressHydrationWarning
                                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                                <Clock size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-indigo-900">
                                                Total Duration: {isMounted ? (() => {
                                                    try {
                                                        const start = parseISO(startDate);
                                                        const end = parseISO(endDate);
                                                        const count = differenceInDays(end, start) + 1;
                                                        return isNaN(count) || count < 1 ? 'Select valid range' : `${count} Day${count > 1 ? 's' : ''}`;
                                                    } catch {
                                                        return 'Invalid range';
                                                    }
                                                })() : '...'}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={16} className="text-gray-400" />
                                                Reason for Leave
                                            </label>
                                            <div className="relative group">
                                                <textarea
                                                    value={reason}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    placeholder="Please provide a detailed reason for your absence (min 10 characters)..."
                                                    className="w-full px-6 py-5 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all resize-none h-48 font-medium placeholder:text-gray-400 text-lg leading-relaxed shadow-inner"
                                                    required
                                                />
                                                <div className="absolute bottom-4 right-6 text-xs font-bold text-gray-300 pointer-events-none group-focus-within:text-purple-400 transition-colors">
                                                    {reason.length} chars
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 pl-2">
                                                This note will be visible to your manager and HR.
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 animate-in slide-in-from-top-2">
                                                <AlertCircle size={20} className="flex-shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        <div className="pt-4 flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsOpen(false)}
                                                suppressHydrationWarning
                                                className="px-8 py-4 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700 hover:border-gray-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                suppressHydrationWarning
                                                className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-200 hover:shadow-2xl hover:scale-[1.01] hover:shadow-purple-300/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                            >
                                                {isSubmitting ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Send size={20} />
                                                )}
                                                <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LeaveRequestWidget;
