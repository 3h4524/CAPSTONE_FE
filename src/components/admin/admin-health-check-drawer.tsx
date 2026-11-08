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
        <SheetHeader className="border-b border-ink-200/80 bg-ink-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4.5 text-ink-700" />
            <SheetTitle className="text-base font-bold text-ink-900">
              Platform health checks
            </SheetTitle>
          </div>
          <SheetDescription className="mt-0.5 text-xs text-ink-500">
            {issues.length > 0
              ? `${issues.length} of ${healthChecks.length} areas need attention`
              : "All system areas are currently operational and healthy"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-ink-50/30 p-5">
          {/* Summary Banner */}
          {issues.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-300 shadow-2xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
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
            <div className="flex items-center gap-3 rounded-xl border border-amber-200/90 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-300 shadow-2xs">
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
              <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
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
                    className={`rounded-xl border bg-card p-4 shadow-2xs transition-all hover:shadow-xs ${cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isCritical
                              ? "bg-rose-100/70 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : "bg-amber-100/70 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          <AreaIcon className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-ink-900">{check.label}</h4>
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
                            ? "border-rose-200/60 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10 text-rose-950 dark:text-rose-300"
                            : "border-amber-200/60 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 text-amber-950 dark:text-amber-300"
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
                                    ? "bg-rose-200/70 dark:bg-rose-500/25 text-rose-900 dark:text-rose-300"
                                    : "bg-amber-200/70 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300"
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3.5 py-1.5 text-xs font-semibold text-card shadow-2xs transition-all hover:scale-[1.02] hover:bg-ink-800 active:scale-95"
                      >
                        <span>{check.action}</span>
                        <ArrowRight className="size-3 text-ink-300" />
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
              <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">
                Operating normally ({healthy.length})
              </p>
              <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200/80 bg-card shadow-2xs">
                {healthy.map((check) => {
                  const AreaIcon = AREA_ICONS[check.key] || Activity;
                  return (
                    <div
                      key={check.key}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-ink-50/60"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
                          <AreaIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="truncate text-xs font-semibold text-ink-800">
                            {check.label}
                          </h5>
                          <p className="truncate text-[11px] text-ink-400">{check.summary}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
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
