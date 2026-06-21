'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function HeadDashboardRoot() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const role = (parsedUser.role || '').toLowerCase();
        const department = parsedUser.department || '';
        const service = parsedUser.service || '';

        if (pathname === '/head-dashboard') {
          const normalizeToSlug = (input: string) => {
            if (!input) return '';
            return input
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9\s&]/g, '')
              .replace(/\s+/g, '-')
              .replace(/&/g, '-and-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
          };

          const userDeptSlug = normalizeToSlug(department);
          const userServiceSlug = normalizeToSlug(service);

          const slugMappings: Record<string, string> = {
            'sales-and-customer-services': 'sale',
            'human-resources': 'humanresource',
            'financial': 'finance',
            'finance-department': 'finance',
            'ngs': 'ngs',
            'drug-discovery': 'drug-discovery',
            'software-development': 'software-development',
            'microbiology': 'microbiology',
            'biochemistry': 'biochemistry',
            'molecular-biology': 'molecular-biology',
          };

          let path = '';
          if (userDeptSlug) {
            const mappedDept = slugMappings[userDeptSlug] || userDeptSlug;
            path = `/department/${mappedDept}`;
            
            // For Heads, they might want to go to their department root
            // But if they have a specific service, we can also check that
          }

          const redirectPath = `/head-dashboard${path}`;
          if (path) {
            router.push(redirectPath);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse user', e);
        setLoading(false);
      }
    } else {
      router.push('/Login/Signin');
    }
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-2xl font-bold text-slate-800">Head Dashboard</h1>
      <p className="text-slate-500 mt-2">Please select a department or service from the navigation.</p>
    </div>
  );
}
