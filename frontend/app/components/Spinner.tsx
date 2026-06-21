'use client';

import React from 'react';

export const Spinner = () => {
    return (
        <div className="flex items-center justify-center">
            <div className="relative w-16 h-16">
                {/* Outer Ring */}
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                {/* Spinning Ring */}
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                {/* Inner Pulsing Circle */}
                <div className="absolute inset-4 bg-indigo-500/20 rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};
