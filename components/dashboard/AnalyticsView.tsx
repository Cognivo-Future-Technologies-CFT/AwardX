
import React from 'react';
import { 
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
   PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const revenueData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 2000 },
  { name: 'Apr', revenue: 2780 },
  { name: 'May', revenue: 1890 },
  { name: 'Jun', revenue: 2390 },
  { name: 'Jul', revenue: 3490 },
];

const deviceData = [
  { name: 'Desktop', value: 65 },
  { name: 'Mobile', value: 25 },
  { name: 'Tablet', value: 10 },
];

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4'];

export const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-8">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500">Deep dive into your program performance and revenue.</p>
       </div>

       {/* Revenue Chart */}
       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Growth</h3>
          <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} prefix="$" />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                   <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Submission Source</h3>
             <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-6">
                {deviceData.map((entry, index) => (
                   <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-sm text-slate-600">{entry.name} ({entry.value}%)</span>
                   </div>
                ))}
             </div>
          </div>

          {/* Geo/Demographics Placeholder */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="text-lg font-bold text-slate-900 mb-6">Top Regions</h3>
             <div className="space-y-4">
                {[
                   { country: "United States", count: 1240, percent: 45 },
                   { country: "United Kingdom", count: 850, percent: 30 },
                   { country: "Germany", count: 420, percent: 15 },
                   { country: "Canada", count: 210, percent: 8 },
                   { country: "Others", count: 80, percent: 2 },
                ].map((item, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <div className="w-8 text-sm font-bold text-slate-400">#{i+1}</div>
                      <div className="flex-1">
                         <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{item.country}</span>
                            <span className="text-sm text-slate-500">{item.count}</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${item.percent}%` }}></div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};
