"use client";

import React from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueChartDto } from "@/types/revenue";

interface RevenueChartsProps {
  charts?: RevenueChartDto;
  isLoading: boolean;
}

const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b"];

export function RevenueCharts({ charts, isLoading }: RevenueChartsProps) {
  if (isLoading || !charts) {
    return (
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="border-none shadow-sm lg:col-span-4 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Growth Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center">
            <div className="flex h-full w-full animate-pulse items-end space-x-4 px-4 pb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-full rounded-t bg-slate-200 dark:bg-slate-800" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm lg:col-span-3 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center">
            <div className="h-48 w-48 animate-pulse rounded-full border-8 border-slate-100 dark:border-slate-800"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="border-none bg-white shadow-sm lg:col-span-4 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue Growth Trend</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="dateLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: unknown) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#0ea5e9" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-none bg-white shadow-sm lg:col-span-3 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] w-full flex-col justify-center">
            {charts.byPlan.length === 0 ? (
              <div className="text-center text-slate-500">No revenue data for this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.byPlan}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="planName"
                    stroke="none"
                  >
                    {charts.byPlan.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: unknown) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value: unknown, entry: unknown) => {
                      const payload = (entry as Record<string, unknown>)?.payload as Record<string, unknown> | undefined;
                      const percentage = payload?.percentage ?? (payload?.payload as Record<string, unknown> | undefined)?.percentage ?? 0;
                      return <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{String(value)} ({Number(percentage)}%)</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
