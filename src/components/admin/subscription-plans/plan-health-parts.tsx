import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import type { PlanAiFeatureKind, PlanAiStatus } from "@/types/plan-ai-review";
import { cn } from "@/utils/cn";

// The same palette as the rest of Plan Insights: teal goes well, amber needs a look, coral goes badly.
export const STATUS_STYLE: Record<PlanAiStatus, { chip: string; selected: string; score: string; stroke: string }> = {
  healthy: { chip: "bg-[#2a9d8f]/12 text-[#21796e]", selected: "border-[#2a9d8f] bg-[#2a9d8f]/5", score: "text-[#21796e]", stroke: "#2a9d8f" },
  watch: { chip: "bg-amber-100 text-amber-800", selected: "border-amber-400 bg-amber-50/60", score: "text-amber-700", stroke: "#f59e0b" },
  at_risk: { chip: "bg-[#e76e50]/12 text-[#c4553a]", selected: "border-[#e76e50] bg-[#e76e50]/5", score: "text-[#c4553a]", stroke: "#e76e50" },
  not_enough_data: { chip: "bg-slate-100 text-slate-600", selected: "border-slate-400 bg-slate-50", score: "text-slate-400", stroke: "#cbd5e1" },
};

export const KIND_STYLE: Record<PlanAiFeatureKind, string> = {
  needs_improvement: "bg-[#e76e50]/12 text-[#c4553a]",
  underused: "bg-amber-100 text-amber-800",
  keeps_customers: "bg-[#2a9d8f]/12 text-[#21796e]",
};

// One pill style for every level on the page: how sure a churn reason is, how urgent an action is.
const LEVEL_STYLE = {
  high: "bg-[#e76e50]/12 text-[#c4553a]",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-500",
} as const;

const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export const OUTLOOK_ICON = { improving: ArrowUpRight, stable: ArrowRight, declining: ArrowDownRight } as const;

export function FindingList({ title, tone, items, className }: { title: string; tone: string; items: string[]; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className={cn("size-2 rounded-full", tone)} />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">None noted.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item} className="rounded-xl border border-slate-200 p-3">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Pill({ level }: { level: keyof typeof LEVEL_STYLE }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", LEVEL_STYLE[level])}>{LEVEL_LABEL[level]}</span>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Section({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="size-4 text-slate-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}
