'use client';

import React from 'react';
import Sidebar from '@/app/head-compontent/humanresource/sidebar';
import Header from '@/app/head-compontent/humanresource/header';
import { Toaster } from 'react-hot-toast';

export default function HeadHRLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar department="HUMAN RESOURCE" />
            <div className="flex-1 flex flex-col ml-72">
                <Header />
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
