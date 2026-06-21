'use client';
import { useState, useEffect } from 'react';
import Header from '../../Manager-Compontent/sales/salesheader/Header'; // Adjust path as needed
import SidebarManager from '../../Manager-Compontent/sales/salesheader/Sidebar'; // Adjust path as needed
import PerformanceComplianceReporting from "@/components/Reports/PerformanceComplianceReporting";
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users2, BarChart3, Settings } from 'lucide-react';

export default function ReportingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>({ name: 'Manager', role: 'manager' });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/Login');
  };

  const services = [
    { name: 'Dashboard', path: '/manager-dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/manager-dashboard/projects', icon: FileText },
    { name: 'Team', path: '/manager-dashboard/team', icon: Users2 },
    { name: 'Reports', path: '/manager-dashboard/reports', icon: BarChart3 },
    { name: 'Settings', path: '/manager-dashboard/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarManager
        isSidebarOpen={sidebarOpen}
        pathname={pathname}
        services={services}
        handleLogout={handleLogout}
      />
      <div className="lg:ml-80">
        <Header
          scrolled={scrolled}
          isSidebarOpen={sidebarOpen}
          setIsSidebarOpen={setSidebarOpen}
          user={user}
          pathname={pathname}
          services={services}
        />
        <main className="pt-16 p-6">
          <PerformanceComplianceReporting />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
