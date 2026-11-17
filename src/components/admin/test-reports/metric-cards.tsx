import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");

  const cards: MetricCard[] = [
    {
      label: t("admin.testReports.metricCards.testRuns"),
      value: String(totalRuns),
      note: t("admin.testReports.metricCards.testRunsNote"),
      icon: Layers,
      tone: "bg-ink-100 text-ink-600",
    },
    {
      label: t("admin.testReports.metricCards.passRate"),
      value: `${passRate}%`,
      note: t("admin.testReports.metricCards.passRateNote"),
      icon: CheckCircle2,
      tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: t("admin.testReports.metricCards.failingTests"),
      value: String(failingTests),
      note: t("admin.testReports.metricCards.failingTestsNote"),
      icon: AlertTriangle,
      tone: "bg-rose-50 dark:bg-rose-500/10 text-rose-500",
    },
    {
      label: t("admin.testReports.metricCards.flakyTests"),
      value: String(flakyTests),
      note: t("admin.testReports.metricCards.flakyTestsNote"),
      icon: FlaskConical,
      tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, note, icon: Icon, tone }) => (
        <article
          key={label}
          className="border-ink-200 bg-card rounded-lg border p-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-ink-500 text-[9px] font-bold tracking-[0.13em] uppercase">
              {label}
            </p>
            <span className={cn("flex size-6 items-center justify-center rounded", tone)}>
              <Icon className="size-3.5" />
            </span>
          </div>
          {isLoading ? (
            <div className="bg-ink-100 mt-3 h-7 w-16 animate-pulse rounded" />
          ) : (
            <p className="font-display text-ink-900 mt-3 text-2xl font-bold tracking-tight">
              {value}
            </p>
          )}
          <p className="text-ink-500 mt-2 text-[10px]">{note}</p>
        </article>
      ))}
    </div>
  );
};
