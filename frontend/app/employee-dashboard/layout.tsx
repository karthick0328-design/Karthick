'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import EmployeeSidebar from './components/EmployeeSidebar';
import EmployeeHeader from './components/EmployeeHeader';

export default function EmployeeDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Define pages that shouldn't have header/sidebar
  const hideLayout =
    pathname?.includes('/department/finance/seniority/') ||
    pathname?.startsWith('/employee-dashboard/finance');

  if (hideLayout) {
    const isDeptPage = pathname?.includes('/department/finance/seniority/');
    return (
      <div className="min-h-screen bg-gray-50 overflow-auto custom-scrollbar">
        {isDeptPage ? (
          <div className="max-w-7xl mx-auto p-8">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <EmployeeSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <EmployeeHeader />

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-8 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
