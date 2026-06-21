'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Construction, Sparkles, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const ComingSoonPage = () => {
    const router = useRouter();

    return (
        <div className="animate-in fade-in duration-700 h-[80vh] flex flex-col items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white p-16 rounded-[4rem] shadow-sm max-w-xl w-full text-center border border-slate-100 relative overflow-hidden group"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors duration-1000"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-slate-50 rounded-full blur-3xl group-hover:bg-slate-100/50 transition-colors duration-1000"></div>

                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group-hover:scale-110 transition-transform duration-700 group-hover:rotate-6">
                    <Wrench className="w-10 h-10 text-white" />
                    <Sparkles className="w-6 h-6 text-indigo-400 absolute -top-2 -right-2 animate-pulse" />
                </div>

                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Tools & Resources</h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Resource Library Syncing</p>

                <p className="text-slate-500 font-bold mb-12 leading-relaxed text-lg max-w-sm mx-auto">
                    We're curating an elite repository of assets and specialized tools to accelerate your operational efficiency.
                </p>

                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-full px-10 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black transition-all gap-4 shadow-xl shadow-slate-200 group/btn"
                >
                    <ArrowLeft className="w-4 h-4 group-hover/btn:-translate-x-2 transition-transform" />
                    <span>Back to Command</span>
                </button>
            </motion.div>
        </div>
    );
};

export default ComingSoonPage;
