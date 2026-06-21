'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User,
  LayoutDashboard,
  LogOut,
  Calendar,
  DollarSign,
  FileText,
  Search,
  MessageCircle,
  HardDrive,
  Bug,
  ShieldAlert,
} from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  className?: string;
  isSidebarOpen: boolean;
  setIsOpen?: (open: boolean) => void;
  handleLogout?: () => void;
}

const SidebarUser = ({ className = '', isSidebarOpen, setIsOpen, handleLogout }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/user-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/user-dashboard/Project', label: 'Projects', icon: Calendar },
    { href: '/user-dashboard/Drive', label: 'My Drive', icon: HardDrive },
    { href: '/user-dashboard/Payment', label: 'Payments', icon: DollarSign },
    { href: '/user-dashboard/Tool', label: 'Tools', icon: FileText },
    { href: '/user-dashboard/software-issues', label: 'Software Issues', icon: Bug },
    { href: '/user-dashboard/complaints', label: 'Service Complaints', icon: ShieldAlert },
    { href: '/user-dashboard/Profile', label: 'Profile', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/user-dashboard' && pathname === href) return true;
    if (href !== '/user-dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  const onLogout = () => {
    localStorage.removeItem('token');
    if (handleLogout) handleLogout();
    router.push('/Login/Signin');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isSidebarOpen ? 'w-72' : 'w-24'
        } ${className}`}
    >
      <div className="flex flex-col h-full bg-slate-50/30">
        {/* Header / Branding */}

        <div className="h-24 flex items-center justify-center border-b border-slate-100 mb-6 bg-white px-6">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'w-full' : 'w-auto'}`}>
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-lg shadow-slate-100 overflow-hidden">
              <img src="/cag.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h2 className="font-extrabold text-slate-900 leading-tight text-[15px] uppercase tracking-wider">Client Portal</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">User Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${isActive(item.href)
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]'
                : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                }`}
              aria-label={`Navigate to ${item.label}`}
            >
              <item.icon size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive(item.href) ? 'text-white' : ''}`} />
              {isSidebarOpen && <span className="font-black text-sm tracking-wide uppercase">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={onLogout}
            suppressHydrationWarning
            className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-lg ${isSidebarOpen
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'
              : 'bg-transparent text-slate-400 hover:text-rose-600 justify-center'
              }`}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Client Role Access</p>
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

export default SidebarUser;
