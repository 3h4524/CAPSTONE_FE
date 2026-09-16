import { ChevronDown } from "lucide-react";

import type { MonthlyRevenueDto } from "@/api/admin";

type AdminRevenueChartProps = {
  revenueChart?: MonthlyRevenueDto[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
};

const AdminRevenueChart = ({ revenueChart = [], timeRange, onTimeRangeChange }: AdminRevenueChartProps) => {
  // Need to scale heights based on maximum value
  const maxRevenue = Math.max(
    ...revenueChart.map((d) => d.subscriptions + d.usage),
    1 // Prevent division by zero
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Revenue &amp; Consumption Trend</h2>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
              Live
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            Recurring subscription plans vs pay-as-you-go GPU credit overages.
          </p>
        </div>
        <div className="flex items-center gap-1 self-start rounded-md border border-slate-200 p-0.5 text-[10px] font-semibold text-slate-500">
          {["Day", "Month", "Year"].map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onTimeRangeChange(item)}
              className={`rounded px-2 py-1 transition-colors ${timeRange === item ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"}`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            className="ml-1 flex items-center gap-1 border-l border-slate-200 px-2 py-1 cursor-default"
          >
            <span>
              Current (
              {timeRange === "Day" 
                ? "Today" 
                : timeRange === "Year" 
                  ? new Date().getFullYear() 
                  : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              })
            </span>
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-500 capitalize">{timeRange}ly Breakdown ($USD)</p>
        <div className="flex items-center gap-3 text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <i className="size-1.5 rounded-full bg-slate-900" /> Subscriptions
          </span>
          <span className="flex items-center gap-1">
            <i className="size-1.5 rounded-full bg-slate-300" /> GPU Overage API
          </span>
        </div>
      </div>
      <div className="mt-4 flex h-40 items-end justify-between gap-3 border-b border-slate-100 px-2 pb-0 sm:px-5">
        {revenueChart.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No data available</div>
        ) : (
          revenueChart.map((item) => {
            const total = item.subscriptions + item.usage;
            const heightPercent = (total / maxRevenue) * 100;
            const subPercent = total > 0 ? (item.subscriptions / total) * 100 : 0;
            const usagePercent = total > 0 ? (item.usage / total) * 100 : 0;

            return (
              <div
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                key={item.month}
              >
                <div
                  className="flex w-7 flex-col justify-end sm:w-9"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div className="rounded-t bg-slate-300" style={{ height: `${usagePercent}%` }} />
                  <div className="rounded-b bg-slate-900" style={{ height: `${subPercent}%` }} />
                </div>
                <span className="text-[9px] text-slate-400">{item.month}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export { AdminRevenueChart };
