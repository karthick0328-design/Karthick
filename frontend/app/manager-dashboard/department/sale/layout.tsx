'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function SaleManagerRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Toaster position="top-right" />
            {children}
        </div>
    );
}
