'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Construction } from 'lucide-react';

const ComingSoonPage = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Construction className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h1>
                <p className="text-gray-600 mb-8">
                    We're working hard to bring you this page. Stay tuned for updates!
                </p>
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-full px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default ComingSoonPage;
