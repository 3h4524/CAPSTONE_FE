import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Layers,
} from "lucide-react";

import { cn } from "@/utils/cn";

type TestReportMetricCardsProps = {
  totalRuns: number;
  passRate: number;
  failingTests: number;
  flakyTests: number;
  isLoading: boolean;
};

type MetricCard = {
  label: string;
  value: string;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

export const TestReportMetricCards = ({
  totalRuns,
  passRate,
  failingTests,
  flakyTests,
  isLoading,
}: TestReportMetricCardsProps) => {
  const cards: MetricCard[] = [
    {
      label: "Test runs",
      value: String(totalRuns),
      note: "Runs kept on this machine",
      icon: Layers,
      tone: "bg-ink-100 text-ink-600",
    },
    {
      label: "Pass rate",
      value: `${passRate}%`,
      note: "Of every test of the latest runs",
      icon: CheckCircle2,
      tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Failing tests",
      value: String(failingTests),
      note: "Tests that did not pass at all",
      icon: AlertTriangle,
      tone: "bg-rose-50 dark:bg-rose-500/10 text-rose-500",
    },
    {
      label: "Flaky tests",
      value: String(flakyTests),
      note: "Passed only after a retry",
      icon: FlaskConical,
      tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, note, icon: Icon, tone }) => (
        <article
          key={label}
          className="rounded-lg border border-ink-200 bg-card p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[9px] font-bold tracking-[0.13em] text-ink-400 uppercase">
              {label}
            </p>
            <span className={cn("flex size-6 items-center justify-center rounded", tone)}>
              <Icon className="size-3.5" />
            </span>
          </div>
          {isLoading ? (
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-ink-100" />
          ) : (
            <p className="font-display mt-3 text-2xl font-bold tracking-tight text-ink-900">
              {value}
            </p>
          )}
          <p className="mt-2 text-[10px] text-ink-400">{note}</p>
        </article>
      ))}
    </div>
  );
};
