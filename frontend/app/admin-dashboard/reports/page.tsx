"use client";
import SidebarAdmin from "@/app/adminCompontent/sidebarAdmin";
import Header from "@/app/adminCompontent/Header";
import PerformanceComplianceReporting from "@/components/Reports/PerformanceComplianceReporting";
import { useState } from "react";

export default function ReportsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white">
      <SidebarAdmin isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-72" : "ml-24"}`}>
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 pt-16">
          <PerformanceComplianceReporting />
        </main>
      </div>
    </div>
  );
}
