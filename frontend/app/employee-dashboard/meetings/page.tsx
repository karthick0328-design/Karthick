'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootMeetingsPage() {
    const router = useRouter();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const senioritySlug = user.seniority?.toLowerCase() || 'junior';

                if (user.service) {
                    const serviceSlug = user.service.toLowerCase().replace(/\s+/g, '-');
                    router.push(`/employee-dashboard/service/${serviceSlug}/seniority/${senioritySlug}/meetings`);
                } else if (user.department) {
                    const deptSlug = user.department.toLowerCase().replace(/\s+/g, '');
                    router.push(`/employee-dashboard/department/${deptSlug}/seniority/${senioritySlug}/meetings`);
                }
            } catch (e) {
                console.error('Error redirecting to meetings', e);
                router.push('/employee-dashboard');
            }
        }
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-bold text-sm">Redirecting to your service meetings...</p>
        </div>
    );
}
