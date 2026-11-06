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
          badgeClass: "bg-rose-50 text-rose-600 border border-rose-200/70",
          icon: <AlertCircle className="h-4 w-4 text-rose-600" />,
        };
      case "warning":
        return {
          label: "Warning",
          badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/70",
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        };
      default:
        return {
          label: "Info",
          badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
          icon: <Info className="h-4 w-4 text-slate-600" />,
        };
    }
  };

  return (
    <>
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        {/* Card Header matching Dashboard Style */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">System health</h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-600 border border-rose-200/70">
              {issues.length} issues
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 border border-amber-200/70">
              {warnings.length} warnings
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700 border border-slate-200">
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
                  <div className="h-8 w-8 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : topIssues.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No health issues detected. All platform services are operational.
            </div>
          ) : (
            topIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50/70 border border-slate-200/80 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{issue.title}</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">{issue.detail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToSection(issue.target)}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <span>{getActionLabel(issue)}</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Expand / View All */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 font-semibold text-slate-600 transition-colors hover:text-slate-900 cursor-pointer"
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
            <span>
              {warnings.length} warnings · {infos.length} informational insight ·{" "}
              <span className="text-slate-900 underline-offset-2 hover:underline">View all</span>
            </span>
          </button>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 bg-[#f8fafc] overflow-y-auto border-l border-slate-200">
          <SheetHeader className="pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Shield className="h-5 w-5" />
              </div>
              <SheetTitle className="text-lg font-bold text-slate-900">
                System health
              </SheetTitle>
            </div>

            {/* Badges in Drawer Header */}
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-600 border border-rose-200/70">
                {issues.length} issues
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700 border border-amber-200/70">
                {warnings.length} warnings
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700 border border-slate-200">
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
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{config.icon}</div>
                    <div>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      <h4 className="mt-1.5 text-xs font-bold text-slate-900">
                        {insight.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
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
                    className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
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
