'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeAttendanceRedirect() {
    const router = useRouter();

    React.useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                // If user is an employee and has a service/seniority assigned, redirect to their specific attendance dash
                if (user.role === 'employee' && user.service && user.seniority) {
                    const serviceSlug = user.service.toLowerCase().replace(/\s+/g, '-');
                    const senioritySlug = user.seniority.toLowerCase();
                    router.push(`/employee-dashboard/service/${serviceSlug}/seniority/${senioritySlug}/attendance`);
                    return;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        // If not logged in or no service info, go back to main dash hub
        router.push('/employee-dashboard');
    }, [router]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Navigating to your attendance portal...</p>
        </div>
    );
}
