import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  change: string | number;
  status: 'up' | 'down';
  icon: React.ElementType;
  variant?: 'purple' | 'red' | 'emerald' | 'amber';
  description?: string;
  onClick?: () => void;
}

const SummaryCard = ({ 
  title, 
  value, 
  change, 
  status, 
  icon: Icon, 
  variant = 'purple', 
  description = "GROWTH RATE",
  onClick 
}: SummaryCardProps) => {
  const gradients = {
    purple: 'from-indigo-600 to-violet-700 shadow-indigo-200/50',
    emerald: 'from-emerald-500 to-teal-700 shadow-emerald-100/50',
    amber: 'from-amber-400 to-orange-500 shadow-amber-100/50',
    red: 'from-rose-500 to-orange-600 shadow-rose-100/50',
  };

  const isUp = status === 'up';

  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden p-8 rounded-[2.5rem] flex flex-col justify-between h-[280px] shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] cursor-pointer group bg-gradient-to-br ${gradients[variant]}`}
    >
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
      
      {/* Background Icon (subtle) */}
      <div className="absolute bottom-[-10%] right-[-5%] opacity-10 text-white pointer-events-none group-hover:scale-125 group-hover:rotate-6 transition-transform duration-1000">
        <Icon size={200} strokeWidth={1} />
      </div>

      {/* Top Row */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-black tracking-[0.25em] text-white/70 uppercase">{title}</span>
          <div className="h-1 w-8 bg-white/30 rounded-full group-hover:w-12 transition-all duration-500" />
        </div>
        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-white shadow-xl group-hover:rotate-12 transition-transform">
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 mt-auto">
        <h3 className="text-4xl font-[900] text-white tracking-tighter mb-6 truncate drop-shadow-md">
          {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
        </h3>
        
        {/* Growth Label Row */}
        <div className="flex items-center gap-3">
          {/* White Pill Badge */}
          <div className="bg-white rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-lg shadow-black/10 transition-transform group-hover:scale-105">
            <div className={`p-0.5 rounded-full ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isUp ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
            </div>
            <span className={`text-[11px] font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {change}{typeof change === 'number' ? '%' : ''}
            </span>
          </div>
          
          {/* Secondary description text */}
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] whitespace-nowrap italic">
            {description}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
