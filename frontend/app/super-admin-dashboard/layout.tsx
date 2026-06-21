'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import SuperAdminSidebar from './components/SuperAdminSidebar';
import SuperAdminHeader from './components/SuperAdminHeader';
import { Toaster } from 'react-hot-toast';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/Login/Signin');
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      if (decoded.role?.toLowerCase() !== 'superadmin') {
        router.push('/Login/Signin');
        return;
      }
      setUser(decoded);
      setAuthorized(true);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/Login/Signin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/Login/Signin');
  };

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white font-sans tracking-tight">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
            <span className="text-2xl font-black">SA</span>
          </div>
          <div className="h-1.5 w-48 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 w-1/3 animate-[loading_1.5s_infinite_linear]" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastering Security Protocols</p>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white !p-0 !m-0 overflow-x-hidden">
      <Toaster position="top-right" />

      <SuperAdminSidebar
        isSidebarOpen={isSidebarOpen}
        handleLogout={handleLogout}
      />

      <div className={`flex flex-col flex-grow min-w-0 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-24'}`}>
        <SuperAdminHeader
          scrolled={scrolled}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={user}
        />

        <main className="pt-24 min-h-screen px-6">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>

        {/* <footer className="px-10 py-6 border-t border-slate-100 flex justify-between items-center bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Enterprise Global Hub v4.0</span>
          <span>&copy; {new Date().getFullYear()} BioScience Administration</span>
        </footer> */}
      </div>
    </div>
  );
}
