'use client';

import React, { useState, useEffect } from 'react';
import AttendanceWidget from './AttendanceWidget';
import LeaveRequestWidget from './LeaveRequestWidget';
import HolidayAnnouncements from './HolidayAnnouncements';
import AttendanceCalendar from './AttendanceCalendar';
import { Calendar, Clock, MapPin, Smartphone, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const UnifiedAttendancePortal = () => {
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserData(payload);
            } catch (e) {
                console.error('Failed to decode token:', e);
            }
        }
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Actions & Announcements (5 cols) */}
            <div className="lg:col-span-5 space-y-10">
                {/* User Stats/Context (Optional) */}
                {userData && (
                    <div className="flex items-center gap-6 p-1 bg-white rounded-3xl border border-gray-100 shadow-sm pr-6">
                        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-indigo-200">
                            {userData.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-gray-900 leading-none mb-1">{userData.name}</h3>
                            <div className="flex items-center gap-3 text-gray-500 font-bold text-xs uppercase tracking-wider">
                                <span className="flex items-center gap-1"><UserIcon size={12} /> {userData.role}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="flex items-center gap-1"><Smartphone size={12} /> {userData.uniqueId}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-700 mb-2">
                            <Clock size={20} />
                            <span className="font-bold uppercase tracking-wider text-xs">Daily Check-in</span>
                        </div>
                        <AttendanceWidget variant="card" />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-purple-700 mb-2">
                            <Calendar size={20} />
                            <span className="font-bold uppercase tracking-wider text-xs">Time Off</span>
                        </div>
                        <LeaveRequestWidget variant="card" />
                    </div>
                </div>

                {/* Holiday Announcements */}
                <HolidayAnnouncements />
            </div>

            {/* Right Column: Calendar & Detailed View (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
                <div className="flex items-center gap-3 text-slate-700 mb-2">
                    <Calendar size={20} />
                    <span className="font-bold uppercase tracking-wider text-xs">Attendance History</span>
                </div>

                {userData?.uniqueId ? (
                    <div className="h-[600px]">
                        <AttendanceCalendar uniqueId={userData.uniqueId} />
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl"></div>
                            <div className="h-4 w-48 bg-gray-100 rounded"></div>
                        </div>
                    </div>
                )}

                {/* Legend or Instructions */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <div className="flex flex-wrap gap-6 items-center justify-center">
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Present</span>
                        </div>
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Absent</span>
                        </div>
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 bg-purple-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Holiday</span>
                        </div>
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 bg-amber-500 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Leave</span>
                        </div>
                        <div className="flex items-center gap-2 group">
                            <div className="w-3 h-3 border-2 border-dashed border-orange-400 rounded-full shadow-sm group-hover:scale-125 transition-transform"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Waiting</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedAttendancePortal;
