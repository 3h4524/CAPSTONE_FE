"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Info,
  Shield,
  ShieldAlert,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SystemStatisticsOverviewDto } from "@/types/system-statistics";

import {
  buildStatisticsInsights,
  type InsightSeverity,
  type InsightTarget,
  type StatisticsInsight,
} from "./statistics-insights";

interface StatisticsInsightsPanelProps {
  data?: SystemStatisticsOverviewDto;
  isLoading: boolean;
}

export const sectionId = (target: InsightTarget) => `stats-${target}`;

function scrollToSection(target: InsightTarget) {
  document.getElementById(sectionId(target))?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function StatisticsInsightsPanel({ data, isLoading }: StatisticsInsightsPanelProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const insights = useMemo(() => (data ? buildStatisticsInsights(data) : []), [data]);
  const issues = useMemo(() => insights.filter((i) => i.severity === "critical"), [insights]);
  const warnings = useMemo(() => insights.filter((i) => i.severity === "warning"), [insights]);
  const infos = useMemo(() => insights.filter((i) => i.severity === "info" || i.severity === "positive"), [insights]);

  const topIssues = useMemo(() => {
    if (issues.length >= 2) return issues.slice(0, 2);
    return insights.slice(0, 2);
  }, [issues, insights]);

  const getActionLabel = (insight: StatisticsInsight) => {
    if (insight.target === "integrations") return "Check integration";
    if (insight.target === "volume") return "View daily volume";
    if (insight.target === "pipeline") return "View pipeline";
    if (insight.target === "errors") return "View error logs";
    return "View section";
  };

  const getBadgeConfig = (severity: InsightSeverity) => {
    switch (severity) {
      case "critical":
        return {
          label: "Issue",
          badgeClass: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-500/30",
          icon: <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
        };
      case "warning":
        return {
          label: "Warning",
          badgeClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30",
          icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        };
      default:
        return {
          label: "Info",
          badgeClass: "bg-ink-100 text-ink-700 border border-ink-200",
          icon: <Info className="text-ink-600 h-4 w-4" />,
        };
    }
  };

  return (
    <>
      <div className="border-ink-200/80 bg-card flex h-full flex-col justify-between rounded-2xl border p-5 shadow-2xs max-md:p-4">
        {/* Card Header matching Dashboard Style */}
        <div className="border-ink-100 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-ink-100 text-ink-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-ink-900 text-sm font-bold">System health</h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
              {issues.length} issues
            </span>
            <span className="text-ink-300">·</span>
            <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {warnings.length} warnings
            </span>
            <span className="text-ink-300">·</span>
            <span className="border-ink-200 bg-ink-100 text-ink-700 inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold">
              {infos.length} info
            </span>
          </div>
        </div>

        {/* Card Body - Top critical issues with action buttons */}
        <div className="my-3 space-y-3">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3">
                  <div className="bg-ink-100 h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="bg-ink-100 h-3.5 w-3/4 rounded" />
                    <div className="bg-ink-100 h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : topIssues.length === 0 ? (
            <div className="text-ink-500 py-6 text-center text-xs">
              No health issues detected. All platform services are operational.
            </div>
          ) : (
            topIssues.map((issue) => (
              <div
                key={issue.id}
                className="border-ink-200/80 bg-ink-50/70 flex flex-col justify-between gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-ink-900 text-xs font-bold">{issue.title}</h4>
                    <p className="text-ink-500 mt-0.5 text-[11px]">{issue.detail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToSection(issue.target)}
                  className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs"
                >
                  <span>{getActionLabel(issue)}</span>
                  <ArrowRight className="text-ink-500 h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Expand / View All */}
        <div className="border-ink-100 flex items-center justify-between border-t pt-3 text-xs">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-ink-600 hover:text-ink-900 flex cursor-pointer items-center gap-1.5 font-semibold transition-colors"
          >
            <ChevronDown className="text-ink-500 h-4 w-4" />
            <span>
              {warnings.length} warnings · {infos.length} informational insight ·{" "}
              <span className="text-ink-900 underline-offset-2 hover:underline">View all</span>
            </span>
          </button>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="border-ink-200 bg-ink-50 w-full overflow-y-auto border-l p-6 sm:max-w-md">
          <SheetHeader className="border-ink-200 border-b pb-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-ink-100 text-ink-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <Shield className="h-5 w-5" />
              </div>
              <SheetTitle className="text-ink-900 text-lg font-bold">
                System health
              </SheetTitle>
            </div>

            {/* Badges in Drawer Header */}
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                {issues.length} issues
              </span>
              <span className="text-ink-300">·</span>
              <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {warnings.length} warnings
              </span>
              <span className="text-ink-300">·</span>
              <span className="border-ink-200 bg-ink-100 text-ink-700 inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold">
                {infos.length} info
              </span>
            </div>
          </SheetHeader>

          {/* Drawer List */}
          <div className="mt-5 space-y-3">
            {insights.map((insight) => {
              const config = getBadgeConfig(insight.severity);
              return (
                <div
                  key={insight.id}
                  className="border-ink-200/80 bg-card hover:border-ink-300 flex items-start justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{config.icon}</div>
                    <div>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      <h4 className="text-ink-900 mt-1.5 text-xs font-bold">
                        {insight.title}
                      </h4>
                      <p className="text-ink-500 mt-1 text-xs leading-relaxed">
                        {insight.detail}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      scrollToSection(insight.target);
                    }}
                    title="Jump to section"
                    className="border-ink-200 bg-card text-ink-500 hover:bg-ink-50 hover:text-ink-900 mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border shadow-2xs"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
