import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  AI_FAILURE_CRITICAL,
  AI_FAILURE_WARNING,
  aiFeatureLabel,
  aiSummary,
} from "@/helpers/admin-dashboard";
import type { AdminOperationsDto } from "@/types/admin";
import type { FinancialAlertDto } from "@/types/revenue";
import type { IntegrationStatusDto, SystemErrorLogDto } from "@/types/system-statistics";
import { formatVnd } from "@/utils/format-currency";

type AdminAttentionPanelProps = {
  financialAlerts?: FinancialAlertDto[];
  integrationStatus?: IntegrationStatusDto;
  recentErrors?: SystemErrorLogDto[];
  aiUsage?: AdminOperationsDto["aiUsage"];
  pendingTickets: number;
  /** When "now" is, for counting recent errors. */
  now?: Date;
};

export type CheckStatus = "critical" | "warning" | "ok";

export type HealthCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  summary: string;
  /** What is behind the summary, e.g. each revenue alert and the money it puts at risk. */
  details: { key: string; text: string; figure?: string }[];
  href: string;
  action: string;
};

const ORDER: Record<CheckStatus, number> = { critical: 0, warning: 1, ok: 2 };

const STATUS_STYLES: Record<CheckStatus, { dot: string; badge: string }> = {
  critical: { dot: "bg-rose-500", badge: "Critical" },
  warning: { dot: "bg-amber-400", badge: "Warning" },
  ok: { dot: "bg-emerald-500", badge: "OK" },
};

const DAY_MS = 86_400_000;

const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

/** Every area the platform should be watched on, worst first. */
export const healthChecks = ({
  financialAlerts = [],
  integrationStatus,
  recentErrors = [],
  aiUsage = [],
  pendingTickets,
  now = new Date(),
}: AdminAttentionPanelProps): HealthCheck[] => {
  const risks = financialAlerts
    .filter((alert) => alert.type === "danger" || alert.type === "warning")
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "danger" ? -1 : 1));
  const atRisk = risks.reduce((sum, alert) => sum + (alert.amount ?? 0), 0);
  const revenue: HealthCheck = {
    key: "revenue",
    label: "Revenue",
    status: risks.some((alert) => alert.type === "danger")
      ? "critical"
      : risks.length > 0
        ? "warning"
        : "ok",
    summary:
      risks.length === 0
        ? "No revenue at risk"
        : `${plural(risks.length, "risk")}${atRisk > 0 ? ` · ${formatVnd(atRisk)} involved` : ""}`,
    details: risks.map((alert) => ({
      key: alert.id,
      text: alert.count != null ? `${alert.title} (${alert.count.toLocaleString()})` : alert.title,
      figure:
        alert.amount != null
          ? `${formatVnd(alert.amount)}${alert.amountLabel ? ` ${alert.amountLabel}` : ""}`
          : undefined,
    })),
    href: "/admin/revenue",
    action: "Open revenue",
  };

  const support: HealthCheck = {
    key: "support",
    label: "Support queue",
    status: pendingTickets > 0 ? "warning" : "ok",
    summary:
      pendingTickets > 0
        ? `${plural(pendingTickets, "ticket")} awaiting a reply`
        : "No ticket waiting",
    details: [],
    href: "/admin/support-tickets",
    action: "Reply",
  };

  const ai = aiSummary(aiUsage, 0);
  // One feature failing often is as serious as the whole being unreliable.
  const aiRate = Math.max(ai.failureRate, ai.worst?.failureRate ?? 0);
  const aiCheck: HealthCheck = {
    key: "ai",
    label: "AI reliability",
    status:
      aiRate >= AI_FAILURE_CRITICAL ? "critical" : aiRate >= AI_FAILURE_WARNING ? "warning" : "ok",
    summary:
      ai.calls === 0
        ? "No AI calls in this period"
        : `${ai.failureRate.toFixed(1)}% of ${ai.calls.toLocaleString()} calls failed`,
    details: ai.worst
      ? [
          {
            key: ai.worst.feature,
            text: `${aiFeatureLabel(ai.worst.feature)} fails most`,
            figure: `${ai.worst.failureRate.toFixed(1)}% · ${plural(ai.worst.failed, "call")}`,
          },
        ]
      : [],
    href: "/admin/analytics",
    action: "Investigate",
  };

  const failedUploads = integrationStatus?.failedIntegrationsCount ?? 0;
  const uploads =
    (integrationStatus?.etsyTotal ?? 0) +
    (integrationStatus?.printifyTotal ?? 0) +
    (integrationStatus?.socialMediaTotal ?? 0);
  const uploadCheck: HealthCheck = {
    key: "uploads",
    label: "Store uploads",
    status: failedUploads === 0 ? "ok" : failedUploads / uploads >= 0.2 ? "critical" : "warning",
    summary:
      uploads === 0
        ? "No uploads to Etsy, Printify or social media yet"
        : failedUploads > 0
          ? `${plural(failedUploads, "upload")} failed of ${uploads.toLocaleString()}`
          : `All ${uploads.toLocaleString()} uploads succeeded`,
    details: [],
    href: "/admin/analytics",
    action: "Review",
  };

  const lastDay = recentErrors.filter(
    (error) => now.getTime() - new Date(error.timestamp).getTime() < DAY_MS
  );
  const pipeline: HealthCheck = {
    key: "pipeline",
    label: "Pipeline errors",
    status: lastDay.length > 0 ? "warning" : "ok",
    summary:
      lastDay.length > 0
        ? `${plural(lastDay.length, "error")} in the last 24 hours`
        : "No error in the last 24 hours",
    details: lastDay.slice(0, 2).map((error) => ({
      key: error.id,
      text: `${error.errorType}: ${error.message}`,
      figure: new Date(error.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
    href: "/admin/analytics",
    action: "Investigate",
  };

  return [revenue, support, aiCheck, uploadCheck, pipeline].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status]
  );
};

const AdminAttentionPanel = (props: AdminAttentionPanelProps) => {
  const checks = healthChecks(props);
  const issues = checks.filter((check) => check.status !== "ok").length;

  return (
    <section className="flex flex-col rounded-xl border border-ink-200 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-900">Health checks</h3>
        <p className="text-xs text-ink-400">
          {issues > 0 ? `${issues} of ${checks.length} need attention` : "All areas healthy"}
        </p>
      </div>

      <ul className="mt-3 flex-1 divide-y divide-ink-100">
        {checks.map((check) => (
          <li key={check.key} className="py-3 first:pt-1 last:pb-0">
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_STYLES[check.status].dot}`}
                title={STATUS_STYLES[check.status].badge}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-medium text-ink-500">{check.label}</p>
                  {check.status !== "ok" && (
                    <Link
                      href={check.href}
                      className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-ink-700 hover:text-ink-900"
                    >
                      {check.action} <ArrowRight className="size-3" />
                    </Link>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-sm ${check.status === "ok" ? "text-ink-500" : "font-medium text-ink-900"}`}
                >
                  <span className="sr-only">{STATUS_STYLES[check.status].badge}: </span>
                  {check.summary}
                </p>
                {check.details.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {check.details.map((detail) => (
                      <li
                        key={detail.key}
                        className="flex items-baseline justify-between gap-3 text-xs"
                      >
                        <span className="min-w-0 truncate text-ink-500">{detail.text}</span>
                        {detail.figure && (
                          <span className="shrink-0 text-ink-700 tabular-nums">
                            {detail.figure}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export { AdminAttentionPanel };
