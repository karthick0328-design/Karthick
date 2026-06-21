'use client';

import { ReactNode } from 'react';

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="flex-1 overflow-auto p-6 bg-white">
        {children}
      </main>
    </>
  );
}