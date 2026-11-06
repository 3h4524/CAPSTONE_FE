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
        <SheetHeader className="border-b border-slate-200/80 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="size-4.5 text-slate-700" />
            <SheetTitle className="text-base font-bold text-slate-900">
              Platform health checks
            </SheetTitle>
          </div>
          <SheetDescription className="mt-0.5 text-xs text-slate-500">
            {issues.length > 0
              ? `${issues.length} of ${healthChecks.length} areas need attention`
              : "All system areas are currently operational and healthy"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/30 p-5">
          {/* Summary Banner */}
          {issues.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-2xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">All systems operational</p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  All services, revenue pipelines, and AI models are running smoothly.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
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
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Needs attention ({issues.length})
              </p>
              {issues.map((check) => {
                const AreaIcon = AREA_ICONS[check.key] || Activity;
                const isCritical = check.status === "critical";
                const StatusIcon = isCritical ? AlertOctagon : AlertCircle;
                const badgeColor = isCritical
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-amber-200 bg-amber-50 text-amber-800";
                const cardBorder = isCritical
                  ? "border-rose-200/80 hover:border-rose-300"
                  : "border-amber-200/80 hover:border-amber-300";

                return (
                  <div
                    key={check.key}
                    className={`rounded-xl border bg-white p-4 shadow-2xs transition-all hover:shadow-xs ${cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isCritical
                              ? "bg-rose-100/70 text-rose-700"
                              : "bg-amber-100/70 text-amber-800"
                          }`}
                        >
                          <AreaIcon className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{check.label}</h4>
                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              isCritical ? "text-rose-700" : "text-amber-800"
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
                            ? "border-rose-200/60 bg-rose-50/50 text-rose-950"
                            : "border-amber-200/60 bg-amber-50/50 text-amber-950"
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
                                    ? "bg-rose-200/70 text-rose-900"
                                    : "bg-amber-200/70 text-amber-900"
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] hover:bg-slate-800 active:scale-95"
                      >
                        <span>{check.action}</span>
                        <ArrowRight className="size-3 text-slate-300" />
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
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Operating normally ({healthy.length})
              </p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                {healthy.map((check) => {
                  const AreaIcon = AREA_ICONS[check.key] || Activity;
                  return (
                    <div
                      key={check.key}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/60"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <AreaIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="truncate text-xs font-semibold text-slate-800">
                            {check.label}
                          </h5>
                          <p className="truncate text-[11px] text-slate-400">{check.summary}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="size-2.5 text-emerald-600" />
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
