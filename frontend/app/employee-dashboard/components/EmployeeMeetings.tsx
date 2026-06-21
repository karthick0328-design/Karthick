'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, Calendar, Clock, User, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Meeting {
    _id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    meetingCode: string;
    meetingLink: string;
    service: string;
    managerId: {
        name: string;
        email: string;
    };
    status: string;
}

export default function EmployeeMeetings({ serviceName, departmentName }: { serviceName?: string; departmentName?: string }) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const token = localStorage.getItem('token');
                const userStr = localStorage.getItem('user');
                const userData = userStr ? JSON.parse(userStr) : null;

                const params = new URLSearchParams();

                // Prioritize props if provided, otherwise fallback to userData
                const effectiveService = serviceName || userData?.service;
                const effectiveDept = departmentName || userData?.department;

                if (effectiveService) params.append('service', effectiveService);
                if (effectiveDept) params.append('department', effectiveDept);

                const res = await axios.get(`${backendUrl}/api/meetings?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setMeetings(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch meetings:', err);
                toast.error('Could not load meetings');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMeetings();
    }, [serviceName, departmentName, backendUrl]);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const isLive = (start: string, end: string) => {
        const now = new Date();
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1hr if no end
        return now >= startTime && now <= endTime;
    };

    const isPast = (start: string, end: string) => {
        const now = new Date();
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date(startTime.getTime() + 60 * 60 * 1000);
        return now > endTime;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold text-sm animate-pulse">Loading Meetings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black italic tracking-tighter">
                        {serviceName ? 'SERVICE MEETINGS' : 'DEPARTMENT MEETINGS'}
                    </h2>
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-2">
                        {(serviceName || departmentName || '').replace('-', ' ')} Professional Hub
                    </p>
                </div>
                <Video className="absolute bottom-[-20px] right-[-20px] w-48 h-48 text-white/10 group-hover:rotate-12 transition-transform duration-700" />
            </div>

            {meetings.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl italic">No meetings scheduled yet</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Check back later or wait for a notification from your management.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {meetings.map((meeting) => (
                        <div
                            key={meeting._id}
                            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-xl ${isLive(meeting.startTime, meeting.endTime) ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                                            <Video size={20} />
                                        </div>
                                        {isLive(meeting.startTime, meeting.endTime) && (
                                            <span className="text-[10px] font-black italic text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full">LIVE NOW</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(meeting.startTime)}</p>
                                        <p className="text-sm font-bold text-slate-900">{formatTime(meeting.startTime)}</p>
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{meeting.title}</h3>
                                <p className="text-slate-500 text-xs line-clamp-2 mb-6 font-medium leading-relaxed">{meeting.description}</p>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-6">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm">
                                        {meeting.managerId?.name?.charAt(0) || 'H'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Organized by</p>
                                        <p className="text-xs font-bold text-slate-900">{meeting.managerId?.name || 'Department Head'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => !isPast(meeting.startTime, meeting.endTime) && router.push(`/meeting/${meeting.meetingCode}`)}
                                disabled={isPast(meeting.startTime, meeting.endTime)}
                                className={`w-full py-4 font-black text-sm italic rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${isPast(meeting.startTime, meeting.endTime)
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-slate-100 hover:scale-[1.02]'
                                    }`}
                            >
                                {isPast(meeting.startTime, meeting.endTime) ? (
                                    <>
                                        <Clock size={18} />
                                        MEETING ENDED
                                    </>
                                ) : (
                                    <>
                                        <Video size={18} />
                                        JOIN MEETING ROOM
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4 items-start translate-y-4 opacity-70">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <div>
                    <h4 className="text-amber-800 font-bold text-sm leading-none">Safe Workspace Notice</h4>
                    <p className="text-amber-700 text-xs mt-2 font-medium leading-relaxed">Please ensure your camera and microphone are working correctly before joining. Recording may be active depending on policy.</p>
                </div>
            </div>
        </div>
    );
}
