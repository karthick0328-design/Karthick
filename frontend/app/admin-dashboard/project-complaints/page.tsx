"use client";

import React, { useState } from 'react';
import SidebarAdmin from '../../adminCompontent/sidebarAdmin';
import Header from '../../adminCompontent/Header';
import ProjectComplaintManager from '@/components/ProjectService/ProjectComplaintManager';

export default function AdminProjectComplaintsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-slate-50">
            <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="p-4 lg:p-10">
                    <ProjectComplaintManager role="admin" />
                </main>
            </div>
        </div>
    );
}
