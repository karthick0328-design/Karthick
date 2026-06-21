'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface CalendarDay {
    date: string;
    type: string;
    userStatus?: string;
    attendanceDetails?: any;
    holidayName?: string;
    holidayType?: string;
    hasAttendance: boolean;
}

interface AttendanceCalendarProps {
    uniqueId: string;
    onClose?: () => void;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ uniqueId, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchCalendar = async () => {
        try {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 1-indexed

            // Calculate start and end of the month
            const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0];
            const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/attendance/calendar`, {
                params: {
                    startDate,
                    endDate,
                    uniqueId
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setCalendarData(response.data.data.calendar);
                setSummary(response.data.data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch calendar', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (uniqueId) {
            fetchCalendar();
        }
    }, [currentDate, uniqueId]);

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const getDayStatusColor = (day: CalendarDay) => {
        if (day.type.startsWith('holiday')) return 'bg-purple-100 text-purple-700 border-purple-200';

        if (day.userStatus === 'present') return 'bg-green-100 text-green-700 border-green-200';
        if (day.userStatus === 'absent') return 'bg-red-100 text-red-700 border-red-200';
        if (day.userStatus === 'on-leave') return 'bg-amber-100 text-amber-700 border-amber-200';
        if (day.userStatus === 'waiting') return 'bg-orange-50 text-orange-600 border-orange-100 italic';
        if (day.userStatus === 'late') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (day.userStatus === 'half-day') return 'bg-yellow-100 text-yellow-700 border-yellow-200';

        if (day.type === 'non-workday') return 'bg-gray-50 text-gray-400 border-gray-100'; // Weekend or no record

        // Default workday with no record yet (future or missed)
        const dayDate = new Date(day.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dayDate < today && day.type === 'workday') return 'bg-red-50 text-red-400 border-red-100'; // Absent implicitly?

        return 'bg-white text-gray-700 border-gray-200';
    };

    const getDayLabel = (day: CalendarDay) => {
        if (day.type.startsWith('holiday')) return 'H';
        if (day.userStatus) return day.userStatus.charAt(0).toUpperCase();
        return '';
    };

    const daysInMonth = () => {
        // We rely on the backend response which gives us the range we asked for.
        // But we need to pad the start of the grid to align with days of week.
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        const padding = Array(firstDay).fill(null);
        return [...padding, ...calendarData];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-6 rounded-3xl shadow-xl h-full flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="text-emerald-500" />
                    Attendance History
                </h2>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button onClick={prevMonth} suppressHydrationWarning className="p-2 hover:bg-white rounded-md transition-all shadow-sm"><ChevronLeft size={16} /></button>
                    <span className="font-bold text-sm min-w-[100px] text-center">
                        {isMounted ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : '...'}
                    </span>
                    <button onClick={nextMonth} suppressHydrationWarning className="p-2 hover:bg-white rounded-md transition-all shadow-sm"><ChevronRight size={16} /></button>
                </div>
            </div>

            {/* Summary Chips */}
            {summary && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                        Present: {summary.presentDays}
                    </div>
                    <div className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                        Absent: {summary.absentDays}
                    </div>
                    <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
                        Leave: {summary.leaveDays}
                    </div>
                    {summary.waitingDays > 0 && (
                        <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold border border-orange-100 animate-pulse">
                            Waiting: {summary.waitingDays}
                        </div>
                    )}
                    <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-100">
                        Holidays: {summary.regularHolidays + summary.governmentHolidays}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                </div>
            ) : (
                <div className="flex-1 overflow-auto">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {daysInMonth().map((day, index) => {
                            if (!day) return <div key={`pad-${index}`} className="aspect-square"></div>;

                            return (
                                <div
                                    key={day.date}
                                    className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${getDayStatusColor(day)}`}
                                    title={`${day.date} - ${day.userStatus || day.type} ${day.holidayName ? `(${day.holidayName})` : ''}`}
                                >
                                    <span className="text-xs font-bold">{new Date(day.date).getDate()}</span>
                                    <div className="flex-1 flex items-center justify-center">
                                        {day.userStatus === 'present' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                                        {day.userStatus === 'absent' && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                                        {day.type.startsWith('holiday') && <div className="text-[10px] leading-tight text-center font-medium opacity-75">{day.holidayName?.split(' ')[0]}</div>}
                                        {day.userStatus === 'on-leave' && <span className="text-[10px] font-bold">LEAVE</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {onClose && (
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={onClose}
                        suppressHydrationWarning
                        className="text-gray-500 hover:text-gray-800 text-sm font-medium underline decoration-dotted"
                    >
                        Back to Mark Attendance
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default AttendanceCalendar;
