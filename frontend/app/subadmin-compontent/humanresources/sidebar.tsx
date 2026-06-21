'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  LayoutDashboard,
  LogOut,
  Calendar,
  DollarSign,
  BadgeCheck,
  Megaphone,
  ChevronDown,
  Bug,
  PieChart,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  subItems?: { href: string; label: string }[];
}

interface SidebarProps {
  className?: string;
  sidebarOpen?: boolean;
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  handleLogout?: () => void;
}

const SidebarSubadmin = ({ className = '', sidebarOpen = true, isSidebarOpen, setSidebarOpen, handleLogout }: SidebarProps) => {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const open = isSidebarOpen !== undefined ? isSidebarOpen : sidebarOpen;

  const navItems: NavItem[] = [
    { href: '/subadmin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/subadmin-dashboard/Attendance', label: 'Attendance Management', icon: Calendar },
    { href: '/subadmin-dashboard/Salary', label: 'Salary Management', icon: DollarSign },
    { href: '/subadmin-dashboard/department/humanresources/Creation', label: 'Position Creation', icon: BadgeCheck },
    { href: '/subadmin-dashboard/department/humanresources/Vacancy', label: 'Vacancy Creation', icon: Megaphone },
    { href: '/subadmin-dashboard/software-issues', label: 'Software Issues', icon: Bug },
    { href: '/subadmin-dashboard/reports', label: 'Reports', icon: PieChart },
  ];

  const isActive = (href: string, subItems?: { href: string; label: string }[]) => {
    if (pathname === href) return true;
    if (subItems) return subItems.some(s => pathname === s.href);
    return false;
  };

  const handleLogoutClick = () => {
    if (setSidebarOpen) setSidebarOpen(false);
    if (handleLogout) handleLogout();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${open ? 'w-72' : 'w-24'} ${className}`}
    >
      <div className="flex flex-col h-full bg-slate-50/30">
        {/* Header / Branding */}
        <div className="h-24 flex items-center justify-center border-b border-slate-100 mb-6 bg-white px-6">
          <div className={`flex items-center gap-3 transition-all duration-300 ${open ? 'w-full' : 'w-auto'}`}>
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-slate-100 overflow-hidden">
              <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {open && (
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-slate-900 leading-tight text-sm uppercase tracking-wide">Sub Admin HR</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href, item.subItems);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${active
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]'
                  : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                  }`}
                aria-label={`Navigate to ${item.label}`}
              >
                <IconComponent size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                {open && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <Link
            href="/Login/Signin"
            onClick={handleLogoutClick}
            className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg ${open
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
              : 'bg-transparent text-slate-400 hover:text-rose-600 justify-center'
              }`}
          >
            <LogOut size={20} className="shrink-0" />
            {open && <span className="font-bold text-sm">Sign Out</span>}
          </Link>
          {open && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sub Admin Access</p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; background: transparent; }
      `}</style>
    </aside>
  );
};

export default SidebarSubadmin;