import { ArrowUpRight } from "lucide-react";

import type { BatchJobDto, SupportTicketDto } from "@/types/admin";

type AdminActivityPanelsProps = {
  latestTickets?: SupportTicketDto[];
  recentBatchJobs?: BatchJobDto[];
};

const AdminActivityPanels = ({ latestTickets = [], recentBatchJobs = [] }: AdminActivityPanelsProps) => (
  <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <PanelHeading
        title="Latest Support Tickets"
        subtitle="Top recent inquiries requiring attention"
        action={`View all (${latestTickets.length})`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead className="border-y border-slate-100 bg-slate-50/70 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-3 py-3">Issue</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {latestTickets.length === 0 && (
              <tr>
                <td colSpan={4} className="p-5 text-center text-xs text-slate-400">
                  No tickets found.
                </td>
              </tr>
            )}
            {latestTickets.map((ticket) => (
              <tr className="border-b border-slate-100 last:border-0" key={ticket.issue}>
                <td className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-slate-800">{ticket.userName}</p>
                  <p className="text-[9px] text-slate-400">{ticket.userEmail}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-[150px] truncate text-[10px] text-slate-600">{ticket.issue}</p>
                  {ticket.priority && (
                    <span className="text-[8px] font-bold text-rose-500">{ticket.priority}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <StatusPill value={ticket.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    className="text-[9px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    {ticket.status.toLowerCase() === "resolved" ? "View" : "Reply"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <PanelHeading
        title="Recent Batch Production"
        subtitle="Top 5 background generation workloads"
        action={`Monitor (${recentBatchJobs.length})`}
      />
      <div className="mt-2 space-y-2">
        {recentBatchJobs.length === 0 && (
          <div className="p-5 text-center text-xs text-slate-400">No recent batch jobs.</div>
        )}
        {recentBatchJobs.map((job) => (
          <div className="rounded-md border border-slate-100 p-3" key={job.name}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[10px] font-semibold text-slate-800">
                {job.name} <span className="font-normal text-slate-400">({job.itemCount} items)</span>
              </p>
              <StatusPill value={job.status} tone={job.tone} />
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${job.tone === "emerald" ? "bg-emerald-500" : job.tone === "rose" ? "bg-rose-400" : job.tone === "orange" ? "bg-orange-400" : "bg-amber-400"}`}
                style={{ width: job.progressPercentage }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[8px] text-slate-400">
              <span>By: {job.userName}</span>
              <span>
                {job.status.toLowerCase() === "completed"
                  ? "Published to Etsy Drafts"
                  : job.status.toLowerCase() === "running"
                    ? `ID: ${job.name.substring(0, 5)} · running`
                    : job.status.toLowerCase() === "queued"
                      ? "waiting GPU"
                      : "Retry Worker"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const PanelHeading = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action: string;
}) => (
  <div className="flex items-start justify-between gap-4 p-5">
    <div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-[10px] text-slate-400">{subtitle}</p>
    </div>
    <button
      type="button"
      className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-slate-700 hover:text-slate-950"
    >
      {action}
      <ArrowUpRight className="size-3" />
    </button>
  </div>
);
const StatusPill = ({ value, tone }: { value: string; tone?: string }) => {
  const normalizedValue = value.toLowerCase();
  const isEmerald = tone === "emerald" || normalizedValue === "resolved" || normalizedValue === "completed";
  const isRose = tone === "rose" || normalizedValue === "open" || normalizedValue === "failed";
  const isOrange = tone === "orange" || normalizedValue === "queued";

  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold capitalize ${isEmerald ? "bg-emerald-50 text-emerald-600" : isRose ? "bg-rose-50 text-rose-500" : isOrange ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-600"}`}
    >
      {value}
    </span>
  );
};

export { AdminActivityPanels };
