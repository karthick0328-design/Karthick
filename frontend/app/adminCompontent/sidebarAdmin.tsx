"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Briefcase,
  Users,
  Search,
  Settings,
  Dna,
  Activity,
  CreditCard,
  ChevronDown,
  Bug,
  PieChart,
  Megaphone,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import Image from "next/image";

interface SidebarProps {
  className?: string;
  sidebarOpen?: boolean;
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  handleLogout?: () => void;
}

const SidebarAdmin = ({
  className = "",
  sidebarOpen,
  isSidebarOpen,
  setSidebarOpen,
  handleLogout,
}: SidebarProps) => {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fallback to whichever prop is provided, but default to true if neither is
  const isOpen =
    isSidebarOpen !== undefined
      ? isSidebarOpen
      : sidebarOpen !== undefined
        ? sidebarOpen
        : true;

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";

  const navItems = [
    { href: "/admin-dashboard", label: "Overview", icon: LayoutDashboard },
    ...(isSuperAdmin ? [
      {
        href: "#financials",
        label: "Financials",
        icon: CreditCard,
        subItems: [
          { href: "/admin-dashboard/finance/profit-loss", label: "Profit & Loss" },
          { href: "/admin-dashboard/finance/cashbook", label: "Income & Cashbook" },
          { href: "/admin-dashboard/finance/expenses", label: "Expenses" },
          { href: "/admin-dashboard/finance/gst", label: "GST Report" },
          { href: "/admin-dashboard/finance/salaries", label: "Salaries" },
          { href: "/admin-dashboard/finance/purchase-orders", label: "Purchase Orders" },
          { href: "/admin-dashboard/finance/service-profit", label: "Service P&L" },
        ]
      },
      {
        href: "#operations",
        label: "Operations",
        icon: Briefcase,
        subItems: [
          { href: "/admin-dashboard/recruitment", label: "Recruitment" },
          { href: "/admin-dashboard/members", label: "Members Profiles" },
          { href: "/admin-dashboard/attendance", label: "Attendance" },
          { href: "/admin-dashboard/meetings", label: "Meetings" },
        ]
      },
      {
        href: "#clients",
        label: "Client Details",
        icon: Users,
        subItems: [
          { href: "/admin-dashboard/clients/details", label: "Client Details" },
          { href: "/admin-dashboard/clients/drive", label: "Drive Usage" },
          { href: "/admin-dashboard/clients/payments", label: "Payment Status" },
        ]
      },
      { href: "/admin-dashboard/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin-dashboard/job-openings", label: "Job Openings", icon: Briefcase },
      { href: "/admin-dashboard/chat", label: "Chat", icon: MessageSquare },
    ] : []),
    {
      href: "#projects",
      label: "Research Projects",
      icon: Dna,
      subItems: [
        {
          href: "/admin-dashboard/projects/drug-discovery",
          label: "Drug Discovery",
        },
        {
          href: "/admin-dashboard/projects/molecular",
          label: "Molecular Biology",
        },
        { href: "/admin-dashboard/projects/ngs", label: "NGS Analysis" },
        { href: "/admin-dashboard/projects/software", label: "Software Dev" },
      ],
    },
    { href: "/admin-dashboard/analytics", label: "Analytics", icon: Activity },
    { href: "/admin-dashboard/software-issues", label: "Software Issues", icon: Bug },
    { href: "/admin-dashboard/reports", label: "Reporting", icon: PieChart },
    { href: "/admin-dashboard/advertisements", label: "Advertisements", icon: Megaphone },
    { 
      href: !mounted ? "/admin-dashboard/project-complaints" :
            user?.role?.toLowerCase() === 'admin' || isSuperAdmin ? "/admin-dashboard/project-complaints" :
            user?.role?.toLowerCase() === 'head' ? "/head-dashboard/complaints" :
            user?.role?.toLowerCase() === 'manager' ? "/manager-dashboard/service/complaints" :
            user?.role?.toLowerCase() === 'tl' ? "/tl-dashboard/service/complaints" :
            user?.role ? "/employee-dashboard/service/complaints" : "#",
      label: "Service Complaints", 
      icon: ShieldAlert 
    },
  ];

  const isActive = (
    href: string,
    subItems?: { href: string; label: string }[],
  ) => {
    if (pathname === href) return true;
    if (subItems && subItems.some((s) => pathname === s.href)) return true;
    return false;
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const handleLogoutClick = () => {
    if (handleLogout) {
      handleLogout();
    } else {
      localStorage.removeItem("token");
    }
    if (setSidebarOpen) setSidebarOpen(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out bg-white border-r border-slate-100 shadow-xl ${isOpen ? "w-72" : "w-24"} ${className}`}
    >
      <div className="flex flex-col h-full bg-slate-50/30">
        {/* Header / Branding */}
        <div className="h-16 flex items-center border-b border-slate-100 flex-shrink-0 bg-white px-6">
          <div
            className={`flex items-center gap-3 transition-all duration-300 ${isOpen ? "w-full" : "justify-center w-full"}`}
          >
            <div className="relative w-8 h-8 lg:w-9 lg:h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg shadow-teal-100 ring-2 ring-white">
              <img
                src="/cag.jpg"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {isOpen && (
              <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                <h2 className="font-extrabold text-slate-900 leading-none text-sm uppercase tracking-wide">
                  TamSci Admin
                </h2>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">
                  Management
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 pt-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href, item.subItems);
            const isDropdownOpen = openDropdown === item.label;

            if (item.subItems) {
              return (
                <div
                  key={item.label}
                  className="w-full flex justify-center flex-col"
                >
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className={`flex items-center transition-all duration-300 group ${isOpen
                      ? "gap-4 w-full px-4 py-4 rounded-2xl"
                      : "justify-center w-14 h-14 rounded-2xl mx-auto"
                      } ${active
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]"
                        : "text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md"
                      }`}
                  >
                    <item.icon
                      size={20}
                      className={`shrink-0 transition-transform group-hover:scale-110 ${active ? "text-white" : ""}`}
                    />
                    {isOpen && (
                      <span className="font-bold text-sm tracking-wide flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                    {isOpen && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>
                  {isOpen && isDropdownOpen && (
                    <div className="pl-12 pr-4 py-2 space-y-1">
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block py-2 text-sm font-semibold transition-colors ${pathname === sub.href ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"}`}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center transition-all duration-300 group ${isOpen
                  ? "gap-4 w-full px-4 py-4 rounded-2xl"
                  : "justify-center w-14 h-14 rounded-2xl mx-auto"
                  } ${active
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]"
                    : "text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md"
                  }`}
              >
                <item.icon
                  size={20}
                  className={`shrink-0 transition-transform group-hover:scale-110 ${active ? "text-white" : ""}`}
                />
                {isOpen && (
                  <span className="font-bold text-sm tracking-wide">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col items-center w-full">
          <Link
            href="/Login/Signin"
            onClick={handleLogoutClick}
            className={`flex items-center transition-all duration-300 group hover:shadow-lg ${isOpen
              ? "gap-4 w-full px-4 py-4 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white"
              : "justify-center w-14 h-14 rounded-2xl bg-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 mx-auto"
              }`}
          >
            <LogOut size={20} className="shrink-0" />
            {isOpen && <span className="font-bold text-sm">Sign Out</span>}
          </Link>
          {isOpen && (
            <div className="mt-4 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Restricted Access
              </p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
    </aside>
  );
};

export default SidebarAdmin;
