import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatUsd, timeAgo } from "@/helpers/admin-dashboard";
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
  slate: "bg-slate-400",
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

const formatTicketStatus = (status: string) => {
  const s = status.toLowerCase().replace(/_/g, " ");
  switch (s) {
    case "open":
      return "Open";
    case "in progress":
      return "In progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

const AdminActivityPanels = ({
  latestTickets = [],
  recentBatchJobs = [],
  totalBatchJobs,
  now,
}: AdminActivityPanelsProps) => (
  <div className="grid gap-4.5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
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
}) => (
  <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="p-5 pb-3">
      <PanelHeading
        title="Latest batch jobs"
        subtitle={
          totalJobs !== undefined
            ? `${jobs.length} most recent of ${totalJobs.toLocaleString()}`
            : "The most recent generation runs"
        }
        action={<PanelLink href="/admin/analytics" label="System statistics" />}
      />
    </div>
    <div className="flex-1 overflow-x-auto">
      <table className="w-full min-w-[620px] table-fixed text-left text-sm">
        <thead className="border-y border-slate-100 bg-slate-50/60 text-xs text-slate-500">
          <tr>
            <th className="w-[43%] px-5 py-2 font-medium">Batch</th>
            <th className="w-[19%] px-4 py-2 font-medium whitespace-nowrap">Seller</th>
            <th className="w-[11%] px-4 py-2 text-left font-medium whitespace-nowrap">Products</th>
            <th className="w-[12%] px-4 py-2 text-left font-medium whitespace-nowrap">AI cost</th>
            <th className="w-[15%] px-5 py-2 font-medium whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                No batch jobs yet.
              </td>
            </tr>
          )}
          {jobs.map((job, index) => {
            const tone = toneOf(job.status, job.tone);
            const finished = job.progressPercentage === "100%";
            return (
              <tr key={`${job.name}-${index}`} className="hover:bg-slate-50/60">
                <td className="px-5 py-2.5">
                  <p className="truncate font-medium text-slate-900" title={job.batchName ?? job.name}>
                    {job.batchName ?? job.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {job.batchName ? job.name : "Batch job"}
                    {job.createdAt && ` · ${timeAgo(job.createdAt, now)}`}
                  </p>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{job.userName}</td>
                <td className="px-4 py-2.5 text-left whitespace-nowrap text-slate-700 tabular-nums">
                  {job.itemCount.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-left whitespace-nowrap text-slate-700 tabular-nums">
                  {job.aiCostUsd ? formatUsd(job.aiCostUsd) : "—"}
                </td>
                <td className="px-5 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 capitalize">
                    <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
                    {job.status.toLowerCase()}
                    {!finished && tone !== "rose" && (
                      <span className="text-xs text-slate-400 tabular-nums">
                        {job.progressPercentage}
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);

const TicketsPanel = ({ tickets }: { tickets: SupportTicketDto[] }) => {
  const openCount = tickets.filter(
    (ticket) => !["resolved", "closed"].includes(ticket.status.toLowerCase())
  ).length;

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <PanelHeading
        title="Latest support tickets"
        subtitle={
          tickets.length > 0 ? `${openCount} of ${tickets.length} awaiting a reply` : "Nothing yet"
        }
        action={<PanelLink href="/admin/support-tickets" label="All tickets" />}
      />
      <ul className="mt-3 flex-1 divide-y divide-slate-100">
        {tickets.length === 0 && (
          <li className="py-6 text-center text-xs text-slate-400">No tickets found.</li>
        )}
        {tickets.map((ticket) => {
          const tone = toneOf(ticket.status);
          const isDone = ["resolved", "closed"].includes(ticket.status.toLowerCase());
          return (
            <li key={ticket.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900" title={ticket.issue}>
                  {ticket.issue}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {ticket.userName}
                  {ticket.priority && ` · ${ticket.priority} priority`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="inline-flex w-24 items-center gap-1.5 text-xs text-slate-600">
                  <span className={`size-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />
                  {formatTicketStatus(ticket.status)}
                </span>
                <Link
                  href={`/admin/support-tickets?ticketId=${ticket.id}`}
                  className={`inline-flex h-7 min-w-[54px] items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition-all ${
                    isDone
                      ? "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                      : "border-sky-200 bg-sky-50/70 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-900"
                  }`}
                >
                  {isDone ? "View" : "Reply"}
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
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
    </div>
    {action}
  </div>
);

const PanelLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-900"
  >
    {label}
    <ArrowUpRight className="size-3" />
  </Link>
);

export { AdminActivityPanels };
