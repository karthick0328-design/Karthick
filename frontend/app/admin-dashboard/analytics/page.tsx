'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/app/adminCompontent/Header';
import SidebarAdmin from '@/app/adminCompontent/sidebarAdmin';
import { BarChart3, TrendingUp, Users, PieChart } from 'lucide-react';

interface Dataset {
  _id: string;
  count: number;
}

interface AnalyticsData {
  statusDistribution: Dataset[];
  deptDistribution: Dataset[];
  trend: Dataset[];
}

export default function AdminAnalytics() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`http://localhost:5000/api/adminassignments/analytics?timeRange=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SidebarAdmin sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-gray-500 mt-1">Detailed breakdown of platform usage and metrics</p>
              </div>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : !data ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg">Unable to load analytics data.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-2 mb-6 text-gray-900">
                    <PieChart className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-lg font-bold">Projects by Department</h2>
                  </div>
                  <div className="space-y-4">
                    {data.deptDistribution.map((item, idx) => {
                      const maxCount = Math.max(...data.deptDistribution.map(d => d.count), 1);
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{item._id || 'Unassigned'}</span>
                            <span className="text-gray-500">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                    {data.deptDistribution.length === 0 && (
                      <p className="text-gray-400 text-sm italic">No data available for this period.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center space-x-2 mb-6 text-gray-900">
                    <PieChart className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-bold">Projects by Status</h2>
                  </div>
                  <div className="space-y-4">
                    {data.statusDistribution.map((item, idx) => {
                      const maxCount = Math.max(...data.statusDistribution.map(d => d.count), 1);
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{item._id || 'Unknown'}</span>
                            <span className="text-gray-500">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                    {data.statusDistribution.length === 0 && (
                      <p className="text-gray-400 text-sm italic">No data available for this period.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                  <div className="flex items-center space-x-2 mb-6 text-gray-900">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-bold">Growth Trend</h2>
                  </div>
                  <div className="flex h-48 items-end space-x-2">
                    {data.trend.map((item, idx) => {
                      const maxCount = Math.max(...data.trend.map(d => d.count), 1);
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            className="w-full bg-blue-100 hover:bg-blue-200 rounded-t-sm transition-colors relative"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          >
                             <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                                {item.count} projects
                             </div>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">
                            {item._id.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      )
                    })}
                    {data.trend.length === 0 && (
                      <div className="w-full h-full flex items-center justify-center">
                         <p className="text-gray-400 text-sm italic">No data available for this period.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
