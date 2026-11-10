"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Headphones,
  Sparkles,
  Store,
  Workflow,
} from "lucide-react";

import type { HealthCheck } from "@/components/admin/admin-attention-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type AdminHealthCheckDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthChecks: HealthCheck[];
};
const AREA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  revenue: CreditCard,
  support: Headphones,
  ai: Sparkles,
  integrations: Store,
  pipeline: Workflow,
};

export const AdminHealthCheckDrawer = ({
  open,
  onOpenChange,
  healthChecks,
}: AdminHealthCheckDrawerProps) => {
  const issues = healthChecks.filter((check) => check.status !== "ok");
  const healthy = healthChecks.filter((check) => check.status === "ok");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-ink-200/80 bg-ink-50/50 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="text-ink-700 size-4.5" />
            <SheetTitle className="text-ink-900 text-base font-bold">
              Platform health checks
            </SheetTitle>
          </div>
          <SheetDescription className="text-ink-500 mt-0.5 text-xs">
            {issues.length > 0
              ? `${issues.length} of ${healthChecks.length} areas need attention`
              : "All system areas are currently operational and healthy"}
          </SheetDescription>
        </SheetHeader>

        <div className="bg-ink-50/30 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Summary Banner */}
          {issues.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-2xs dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">All systems operational</p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  All services, revenue pipelines, and AI models are running smoothly.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-900 shadow-2xs dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="flex-1">
                <strong className="font-semibold">
                  {issues.length} {issues.length === 1 ? "issue" : "issues"} detected.
                </strong>{" "}
                Review the details below to take action.
              </p>
            </div>
          )}

          {/* Section 1: Needs attention (if any) */}
          {issues.length > 0 && (
            <div className="space-y-3">
              <p className="text-ink-400 text-[11px] font-semibold tracking-wider uppercase">
                Needs attention ({issues.length})
              </p>
              {issues.map((check) => {
                const AreaIcon = AREA_ICONS[check.key] || Activity;
                const isCritical = check.status === "critical";
                const StatusIcon = isCritical ? AlertOctagon : AlertCircle;
                const badgeColor = isCritical
                  ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300";
                const cardBorder = isCritical
                  ? "border-rose-200/80 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/40"
                  : "border-amber-200/80 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/40";

                return (
                  <div
                    key={check.key}
                    className={`bg-card rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isCritical
                              ? "bg-rose-100/70 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                              : "bg-amber-100/70 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                          }`}
                        >
                          <AreaIcon className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-ink-900 text-sm font-semibold">{check.label}</h4>
                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              isCritical ? "text-rose-700 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {check.summary}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${badgeColor}`}
                      >
                        <StatusIcon className="size-3" />
                        {isCritical ? "Critical" : "Warning"}
                      </span>
                    </div>

                    {check.details.length > 0 && (
                      <div
                        className={`mt-3 space-y-1 rounded-lg border p-2.5 text-xs ${
                          isCritical
                            ? "border-rose-200/60 bg-rose-50/50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                            : "border-amber-200/60 bg-amber-50/50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                        }`}
                      >
                        {check.details.map((detail) => (
                          <div
                            key={detail.key}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="font-medium">{detail.text}</span>
                            {detail.figure && (
                              <span
                                className={`rounded px-1.5 py-0.5 font-bold tabular-nums ${
                                  isCritical
                                    ? "bg-rose-200/70 text-rose-900 dark:bg-rose-500/25 dark:text-rose-300"
                                    : "bg-amber-200/70 text-amber-900 dark:bg-amber-500/25 dark:text-amber-300"
                                }`}
                              >
                                {detail.figure}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3.5 flex justify-end">
                      <Link
                        href={check.href}
                        onClick={() => onOpenChange(false)}
                        className="bg-ink-900 text-card hover:bg-ink-800 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <span>{check.action}</span>
                        <ArrowRight className="text-ink-300 size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 2: Operating normally */}
          {healthy.length > 0 && (
            <div className="space-y-2">
              <p className="text-ink-400 text-[11px] font-semibold tracking-wider uppercase">
                Operating normally ({healthy.length})
              </p>
              <div className="divide-ink-100 border-ink-200/80 bg-card divide-y overflow-hidden rounded-xl border shadow-2xs">
                {healthy.map((check) => {
                  const AreaIcon = AREA_ICONS[check.key] || Activity;
                  return (
                    <div
                      key={check.key}
                      className="hover:bg-ink-50/60 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="bg-ink-100 text-ink-600 flex size-7 shrink-0 items-center justify-center rounded-lg">
                          <AreaIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-ink-800 truncate text-xs font-semibold">
                            {check.label}
                          </h5>
                          <p className="text-ink-400 truncate text-[11px]">{check.summary}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                        Healthy
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
