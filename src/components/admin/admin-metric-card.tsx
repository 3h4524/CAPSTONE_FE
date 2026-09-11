import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type AdminMetricCardProps = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  note: string;
  icon: React.ComponentType<{ className?: string }>;
};

const AdminMetricCard = ({
  label,
  value,
  change,
  trend,
  note,
  icon: Icon,
}: AdminMetricCardProps) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</p>
      <span className="flex size-5 items-center justify-center rounded bg-slate-50 text-slate-400">
        <Icon className="size-3" />
      </span>
    </div>
    <div className="mt-3 flex items-end gap-2">
      <p className="font-display text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <span
        className={`mb-1 flex items-center text-[10px] font-bold ${trend === "up" ? "text-emerald-600" : "text-rose-500"}`}
      >
        {trend === "up" ? (
          <ArrowUpRight className="size-3" />
        ) : (
          <ArrowDownRight className="size-3" />
        )}
        {change}
      </span>
    </div>
    <p className="mt-2 text-[10px] text-slate-400">{note}</p>
  </article>
);

export { AdminMetricCard };
