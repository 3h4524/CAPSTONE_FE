import { ChevronDown } from "lucide-react";

const chartData = [
  { month: "May", subscriptions: 44, usage: 20 },
  { month: "Jun", subscriptions: 58, usage: 27 },
  { month: "Jul", subscriptions: 72, usage: 32 },
  { month: "Aug", subscriptions: 84, usage: 38 },
  { month: "Sep", subscriptions: 86, usage: 41 },
  { month: "Oct", subscriptions: 93, usage: 48 },
];

const AdminRevenueChart = () => (
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
            className={`rounded px-2 py-1 ${item === "Month" ? "bg-slate-100 text-slate-900" : ""}`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          className="ml-1 flex items-center gap-1 border-l border-slate-200 px-2 py-1"
        >
          <span>Current (Oct 2026)</span>
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-4 border-b border-slate-100 pb-5 sm:grid-cols-4">
      <Stat label="Subscriptions ARR" value="$460,800.00" />
      <Stat label="API Cost (Leonardo / OpenAI)" value="$5,420.18" />
      <Stat label="Gross Margin" value="88.2%" accent />
      <Stat label="Average ARPU" value="$168.20 / user" />
    </div>

    <div className="mt-5 flex items-center justify-between">
      <p className="text-[10px] font-semibold text-slate-500">Monthly Breakdown ($USD)</p>
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
      {chartData.map((item) => (
        <div
          className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          key={item.month}
        >
          <div
            className="flex w-7 flex-col justify-end sm:w-9"
            style={{ height: `${item.subscriptions}%` }}
          >
            <div className="h-[32%] rounded-t bg-slate-300" />
            <div className="h-[68%] rounded-b bg-slate-900" />
          </div>
          <span className="text-[9px] text-slate-400">{item.month}</span>
        </div>
      ))}
    </div>
  </section>
);

const Stat = ({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div>
    <p className="text-[9px] text-slate-400">{label}</p>
    <p className={`mt-1 text-xs font-bold ${accent ? "text-emerald-600" : "text-slate-800"}`}>
      {value}
    </p>
  </div>
);

export { AdminRevenueChart };
