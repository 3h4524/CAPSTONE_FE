import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import type { PlanAiFeatureKind, PlanAiStatus } from "@/types/plan-ai-review";
import { cn } from "@/utils/cn";

// The same palette as the rest of Plan Insights: teal goes well, amber needs a look, coral goes badly.
export const STATUS_STYLE: Record<PlanAiStatus, { chip: string; selected: string; ring: string; score: string; stroke: string }> = {
  healthy: { chip: "bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]", selected: "border-[#2a9d8f] bg-[#2a9d8f]/5", ring: "ring-[#2a9d8f]/25", score: "text-[#21796e] dark:text-[#8fe0d6]", stroke: "#2a9d8f" },
  watch: { chip: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300", selected: "border-amber-400 bg-amber-50/60 dark:bg-amber-500/10", ring: "ring-amber-300/40 dark:ring-amber-500/40", score: "text-amber-700 dark:text-amber-300", stroke: "#f59e0b" },
  at_risk: { chip: "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]", selected: "border-[#e76e50] bg-[#e76e50]/5", ring: "ring-[#e76e50]/25", score: "text-[#c4553a] dark:text-[#dea091]", stroke: "#e76e50" },
  not_enough_data: { chip: "bg-ink-100 text-ink-600", selected: "border-ink-400 bg-ink-50", ring: "ring-ink-300/40", score: "text-ink-400", stroke: "var(--ink-300)" },
};

export const KIND_STYLE: Record<PlanAiFeatureKind, string> = {
  needs_improvement: "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]",
  underused: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  keeps_customers: "bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]",
};

// One pill style for every level on the page: how sure a churn reason is, how urgent an action is.
const LEVEL_STYLE = {
  high: "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]",
  medium: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
  low: "bg-ink-100 text-ink-500",
} as const;

const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export const OUTLOOK_ICON = { improving: ArrowUpRight, stable: ArrowRight, declining: ArrowDownRight } as const;

/** The outlook as a coloured chip: green when it is getting better, red when worse. */
export const OUTLOOK_CHIP = {
  improving: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  stable: "bg-ink-100 text-ink-600",
  declining: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
} as const;

export function FindingList({ title, tone, items, className }: { title: string; tone: string; items: string[]; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
        <span className={cn("size-2 rounded-full", tone)} />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-ink-400">None noted.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-ink-600">
          {items.map((item) => (
            <li key={item} className="rounded-xl border border-ink-200 bg-card p-3">
              <Figures text={item} />
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
    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
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
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Icon className="size-4 text-ink-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// Figures in the AI's sentences: counts, percentages and amounts.
const FIGURE = /(\d[\d.,]*\d%?|\d%?)/g;

/** A sentence with its figures in bold, so it can be skimmed for the numbers. */
export function Figures({ text, className = "font-semibold text-ink-900" }: { text: string; className?: string }) {
  return (
    <>
      {text.split(FIGURE).map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className={cn("tabular-nums", className)}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
