import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { UsageHistoryPoint } from '../types';

interface UsageChartProps {
  data: UsageHistoryPoint[];
  className?: string;
}

export const UsageChart: React.FC<UsageChartProps> = ({ data, className = '' }) => {
  return (
    <div className={`w-full h-[300px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#0f172a', fontWeight: 500 }}
          />
          <Area 
            type="monotone" 
            dataKey="submissions" 
            name="Submissions"
            stroke="#6366f1" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorSubmissions)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
