'use client';

import { ReactNode, useState, useEffect } from 'react';
import Header from '../user-compontent/header';
import SidebarUser from '../user-compontent/sidebar';
import { jwtDecode } from 'jwt-decode';

export default function UserDashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState({ name: 'User', role: 'Member' });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({
          name: decoded.name || 'User',
          role: decoded.role || 'Member'
        });
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 overflow-x-hidden w-full">
      <SidebarUser isSidebarOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-500 ease-in-out ${sidebarOpen ? 'ml-72' : 'ml-24'}`}>
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          user={user}
        />
        <main className="flex-1 p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700 bg-white overflow-x-hidden flex flex-col">
          <div className="w-full h-full flex flex-col flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}