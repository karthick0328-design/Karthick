'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, Megaphone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Holiday {
    _id: string;
    name: string;
    date: string;
    type: 'government' | 'regular';
    description?: string;
}

const HolidayAnnouncements = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/holidays`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    // Filter for upcoming holidays (next 30 days)
                    const now = new Date();
                    const nextMonth = new Date();
                    nextMonth.setDate(now.getDate() + 30);

                    const upcoming = response.data.data.filter((h: Holiday) => {
                        const hDate = new Date(h.date);
                        return hDate >= now && hDate <= nextMonth;
                    });

                    setHolidays(upcoming);
                }
            } catch (err) {
                console.error('Failed to fetch holidays:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHolidays();
    }, []);

    if (loading) return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
        </div>
    );

    if (holidays.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 text-indigo-700 mb-2">
                <Megaphone size={20} />
                <span className="font-bold uppercase tracking-wider text-xs">Announcements</span>
            </div>

            <AnimatePresence>
                {holidays.map((holiday, index) => (
                    <motion.div
                        key={holiday._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl hover:shadow-indigo-200/50 transition-all hover:-translate-y-1"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles size={80} />
                        </div>

                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                <Bell size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold uppercase tracking-widest">
                                        {holiday.type} Holiday
                                    </span>
                                    <span className="text-white/60 text-[10px] font-bold uppercase">
                                        {new Date(holiday.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <h4 className="text-xl font-black tracking-tight mb-1">New Holiday Announced!</h4>
                                <p className="text-indigo-100 font-medium leading-tight">
                                    {holiday.name} is coming up. Plan your work accordingly.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default HolidayAnnouncements;
