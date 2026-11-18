import Link from "next/link";
import type { TFunction } from "i18next";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatUsd, timeAgo } from "@/helpers/admin-dashboard";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { BatchJobDto, SupportTicketDto } from "@/types/admin";

type AdminActivityPanelsProps = {
  latestTickets?: SupportTicketDto[];
  recentBatchJobs?: BatchJobDto[];
  /** Every batch job on the platform, so the list can say how much of it is shown. */
  totalBatchJobs?: number;
  /** When "now" is, for the jobs' ages. */
  now?: Date;
};

type Tone = "emerald" | "amber" | "orange" | "rose" | "slate";

const DOT: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  orange: "bg-orange-400",
  rose: "bg-rose-500",
  slate: "bg-ink-400",
};

// The backend sends a tone with each batch job; tickets only have a status.
const toneOf = (value: string, tone?: string): Tone => {
  const status = value.toLowerCase();
  if (tone === "emerald" || status === "resolved" || status === "completed") return "emerald";
  if (tone === "rose" || status === "open" || status === "failed") return "rose";
  if (tone === "orange" || status === "queued") return "orange";
  if (status === "closed") return "slate";
  return "amber";
};

const JOB_STATUS_KEYS: Record<string, string> = {
  queued: "admin.dashboard.activity.jobStatus.queued",
  pending: "admin.dashboard.activity.jobStatus.pending",
  processing: "admin.dashboard.activity.jobStatus.processing",
  running: "admin.dashboard.activity.jobStatus.running",
  paused: "admin.dashboard.activity.jobStatus.paused",
  completed: "admin.dashboard.activity.jobStatus.completed",
  partially_completed: "admin.dashboard.activity.jobStatus.partiallyCompleted",
  failed: "admin.dashboard.activity.jobStatus.failed",
  cancelled: "admin.dashboard.activity.jobStatus.cancelled",
};

const TICKET_STATUS_KEYS: Record<string, string> = {
  open: "admin.dashboard.activity.ticketStatus.open",
  "in progress": "admin.dashboard.activity.ticketStatus.inProgress",
  resolved: "admin.dashboard.activity.ticketStatus.resolved",
  closed: "admin.dashboard.activity.ticketStatus.closed",
};

type TranslationFn = TFunction<"common">;

// A status with no translation still reads as words: "partially_completed" shows "Partially completed".
const readableStatus = (status: string) => {
  const words = status.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const ticketStatusLabel = (status: string, t: TranslationFn) => {
  const normalized = status.toLowerCase().replace(/_/g, " ");
  const labelKey = TICKET_STATUS_KEYS[normalized];
  return labelKey ? t(labelKey) : readableStatus(status);
};

// A phone lists only the latest few: the links beside each heading lead to the rest.
const PHONE_LATEST_ITEMS = 3;

const JobStatus = ({ job }: { job: BatchJobDto }) => {
  const { t } = useTranslation("common");
  const tone = toneOf(job.status, job.tone);
  const finished = job.progressPercentage === "100%";
  const statusKey = job.status.toLowerCase();
  const labelKey = JOB_STATUS_KEYS[statusKey];
  return (
    <span className="text-ink-700 inline-flex items-center gap-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      {labelKey ? t(labelKey) : readableStatus(job.status)}
      {!finished && tone !== "rose" && (
        <span className="text-ink-400 text-xs tabular-nums">{job.progressPercentage}</span>
      )}
    </span>
  );
};

const BatchJobCard = ({ job, now }: { job: BatchJobDto; now?: Date }) => {
  const { t } = useTranslation("common");

  return (
  <li className="space-y-0.5 py-2.5 text-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="text-ink-900 min-w-0 truncate font-medium">{job.batchName ?? job.name}</p>
      <span className="shrink-0 text-xs">
        <JobStatus job={job} />
      </span>
    </div>
    <p className="text-ink-400 truncate text-xs">
      {job.batchName ? job.name : t("admin.dashboard.activity.batchJobFallback")}
      {job.createdAt && ` · ${timeAgo(job.createdAt, now)}`}
    </p>
    <p className="text-ink-600 flex justify-between gap-3 text-xs">
      <span className="min-w-0 truncate">{job.userName}</span>
      <span className="shrink-0 tabular-nums">
        {t("admin.dashboard.activity.productsLine", { products: job.itemCount.toLocaleString() })}
        {job.aiCostUsd ? ` · ${formatUsd(job.aiCostUsd)}` : ""}
      </span>
    </p>
  </li>
  );
};

const AdminActivityPanels = ({
  latestTickets = [],
  recentBatchJobs = [],
  totalBatchJobs,
  now,
}: AdminActivityPanelsProps) => (
  <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
    <BatchJobsPanel jobs={recentBatchJobs} totalJobs={totalBatchJobs} now={now} />
    <TicketsPanel tickets={latestTickets} />
  </div>
);

const BatchJobsPanel = ({
  jobs,
  totalJobs,
  now,
}: {
  jobs: BatchJobDto[];
  totalJobs?: number;
  now?: Date;
}) => {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const shown = isPhone ? jobs.slice(0, PHONE_LATEST_ITEMS) : jobs;

  return (
  <section className="border-ink-200 bg-card flex flex-col overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="p-5 pb-3 max-md:p-4 max-md:pb-2">
      <PanelHeading
        title={t("admin.dashboard.activity.latestBatchJobs")}
        subtitle={
          totalJobs !== undefined
            ? t("admin.dashboard.activity.batchJobsSubtitleTotal", {
                shown: shown.length,
                total: totalJobs.toLocaleString(),
              })
            : t("admin.dashboard.activity.batchJobsSubtitleDefault")
        }
        action={<PanelLink href="/admin/analytics" label={t("admin.dashboard.activity.systemStatistics")} />}
      />
    </div>
    {isPhone ? (
      <ul className="divide-ink-100 divide-y px-4 pb-1.5">
        {shown.length === 0 && <li className="text-ink-400 py-6 text-center text-xs">{t("admin.dashboard.activity.noBatchJobs")}</li>}
        {shown.map((job, index) => (
          <BatchJobCard key={`${job.name}-${index}`} job={job} now={now} />
        ))}
      </ul>
    ) : (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full min-w-[620px] table-fixed text-left text-sm">
        <thead className="border-ink-100 bg-ink-50/60 text-ink-500 border-y text-xs">
          <tr>
            {/* Status gets the room for "Partially completed"; every cell stays inside its column, so the
                fixed-layout table never grows a sideways scrollbar on a desktop. */}
            <th className="w-[38%] px-5 py-2 font-medium">{t("admin.dashboard.activity.batch")}</th>
            <th className="w-[18%] px-4 py-2 font-medium whitespace-nowrap">{t("admin.dashboard.activity.seller")}</th>
            <th className="w-[10%] px-4 py-2 text-left font-medium whitespace-nowrap">{t("admin.dashboard.activity.products")}</th>
            <th className="w-[12%] px-4 py-2 text-left font-medium whitespace-nowrap">{t("admin.dashboard.activity.aiCost")}</th>
            <th className="w-[22%] px-5 py-2 font-medium whitespace-nowrap">{t("admin.dashboard.activity.status")}</th>
          </tr>
        </thead>
        <tbody className="divide-ink-100 divide-y">
          {jobs.length === 0 && (
            <tr>
              <td colSpan={5} className="text-ink-400 p-6 text-center text-xs">
                {t("admin.dashboard.activity.noBatchJobs")}
              </td>
            </tr>
          )}
          {jobs.map((job, index) => {
            return (
              <tr key={`${job.name}-${index}`} className="hover:bg-ink-50/60">
                <td className="px-5 py-2.5">
                  <p className="text-ink-900 truncate font-medium" title={job.batchName ?? job.name}>
                    {job.batchName ?? job.name}
                  </p>
                  <p className="text-ink-400 truncate text-xs">
                    {job.batchName ? job.name : t("admin.dashboard.activity.batchJobFallback")}
                    {job.createdAt && ` · ${timeAgo(job.createdAt, now)}`}
                  </p>
                </td>
                <td className="text-ink-600 truncate px-4 py-2.5" title={job.userName}>{job.userName}</td>
                <td className="text-ink-700 px-4 py-2.5 text-left whitespace-nowrap tabular-nums">
                  {job.itemCount.toLocaleString()}
                </td>
                <td className="text-ink-700 px-4 py-2.5 text-left whitespace-nowrap tabular-nums">
                  {job.aiCostUsd ? formatUsd(job.aiCostUsd) : "—"}
                </td>
                <td className="px-5 py-2.5">
                  <JobStatus job={job} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    )}
  </section>
  );
};

const TicketsPanel = ({ tickets }: { tickets: SupportTicketDto[] }) => {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const shown = isPhone ? tickets.slice(0, PHONE_LATEST_ITEMS) : tickets;
  const openCount = tickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status.toLowerCase())
  ).length;

  return (
    <section className="border-ink-200 bg-card flex flex-col rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-md:p-4">
      <PanelHeading
        title={t("admin.dashboard.activity.latestTickets")}
        subtitle={
          tickets.length > 0
            ? t("admin.dashboard.activity.ticketsSubtitleOpen", { open: openCount, total: tickets.length })
            : t("admin.dashboard.activity.nothingYet")
        }
        action={<PanelLink href="/admin/support-tickets" label={t("admin.dashboard.activity.allTickets")} />}
      />
      <ul className="divide-ink-100 mt-3 flex-1 divide-y">
        {tickets.length === 0 && (
          <li className="text-ink-400 py-6 text-center text-xs">{t("admin.dashboard.activity.noTickets")}</li>
        )}
        {shown.map((ticket) => {
          const tone = toneOf(ticket.status);
          const isDone = ["resolved", "closed"].includes(ticket.status.toLowerCase());
          return (
            <li key={ticket.id} className="flex items-center justify-between gap-3 py-2.5 max-md:flex-wrap max-md:gap-2">
              <div className="min-w-0 flex-1 max-md:basis-full">
                <p className="text-ink-900 truncate text-sm font-medium" title={ticket.issue}>
                  {ticket.issue}
                </p>
                <p className="text-ink-400 mt-0.5 truncate text-xs">
                  {ticket.userName}
                  {ticket.priority && ` · ${t("admin.dashboard.activity.priority", { priority: ticket.priority })}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 max-md:w-full max-md:justify-between">
                <span className="text-ink-600 inline-flex w-24 items-center gap-1.5 text-xs">
                  <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
                  {ticketStatusLabel(ticket.status, t)}
                </span>
                <Link
                  href={`/admin/support-tickets?ticketId=${ticket.id}`}
                  className={`inline-flex h-7 min-w-[54px] items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-all max-md:h-9 max-md:min-w-16 ${
                    isDone
                      ? "border-ink-200 bg-ink-50/70 text-ink-600 hover:border-ink-300 hover:bg-ink-100 hover:text-ink-900"
                      : "border-sky-200 bg-sky-50/70 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/15 dark:hover:text-sky-300"
                  }`}
                >
                  {isDone ? t("admin.dashboard.activity.view") : t("admin.dashboard.activity.reply")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const PanelHeading = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-ink-900 text-sm font-semibold">{title}</h3>
      <p className="text-ink-400 mt-0.5 text-xs">{subtitle}</p>
    </div>
    {action}
  </div>
);

const PanelLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="text-ink-500 hover:text-ink-900 flex shrink-0 items-center gap-0.5 text-xs font-medium"
  >
    {label}
    <ArrowUpRight className="size-3" />
  </Link>
);

export { AdminActivityPanels };
