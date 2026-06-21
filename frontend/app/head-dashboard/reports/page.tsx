'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import PerformanceComplianceReporting from "@/components/Reports/PerformanceComplianceReporting";

// Depending on the user's department, we might want to show a specific sidebar
// But for a global reports page, we can use a generic head sidebar or the one from their department
import SalesSidebar from '@/app/head-compontent/sale/sidebar';
import FinanceSidebar from '@/app/head-compontent/finance/sidebar';
import HRSidebar from '@/app/head-compontent/humanresource/sidebar';

import SalesHeader from '@/app/head-compontent/sale/header';
import FinanceHeader from '@/app/head-compontent/finance/header';
import HRHeader from '@/app/head-compontent/humanresource/header';

export default function HeadReportingPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser(decoded);
                setLoading(false);
            } catch (e) {
                console.error('Failed to decode token', e);
            }
        }
    }, []);

    if (loading) return null;

    const department = (user?.department || '').toLowerCase();
    
    // Choose appropriate components based on department
    let Sidebar = SalesSidebar;
    let Header = SalesHeader;
    let deptName = "Sales and Customer Services";

    if (department.includes('finance') || department.includes('financial')) {
        Sidebar = FinanceSidebar;
        Header = FinanceHeader;
        deptName = "Financial";
    } else if (department.includes('human resource') || department.includes('hr')) {
        Sidebar = HRSidebar;
        Header = HRHeader;
        deptName = "Human Resource";
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Sidebar department={deptName} />
            <div className="ml-72 flex flex-col min-h-screen">
                <Header department={deptName} />
                <main className="flex-1 p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Performance & Compliance</h1>
                        <p className="text-slate-500 mt-2">Comprehensive reporting suite for cross-departmental oversight.</p>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <PerformanceComplianceReporting />
                    </div>
                </main>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>
        </div>
    );
}
