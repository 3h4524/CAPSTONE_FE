import { ArrowUpRight } from "lucide-react";

const tickets = [
  ["Maya Chen", "#TK-0853 · Batch stuck", "Open", "Urgent"],
  ["Liam Vance", "#TK-0852 · Etsy Token...", "In Progress", ""],
  ["Sarah Jenkins", "#TK-0851 · Plan Upgrade", "Open", ""],
  ["Kenji Sato", "#TK-0850 · Mockup ali...", "Resolved", ""],
  ["David Pham", "#TK-0849 · Printify We...", "Resolved", ""],
];

const batches = [
  ["Summer Botanical Tees", "24 items", "Rendering", "72%", "Maya Chen (Pro)", "amber"],
  ["Retro Coffee Mug Graphics", "50 items", "Queued", "0%", "Studio North (Business)", "orange"],
  ["Cyberpunk Hoodies Video Clips", "12 items", "Completed", "100%", "Liam Vance (Pro)", "emerald"],
  ["Aesthetic Phone Cases", "40 items", "Rate Limited", "35%", "Sarah Jenkins (Business)", "rose"],
];

const AdminActivityPanels = () => (
  <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
      <PanelHeading
        title="Latest Support Tickets"
        subtitle="Top recent inquiries requiring attention"
        action="View all (7)"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead className="border-y border-slate-100 bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-3 py-3">Issue</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(([user, issue, status, priority]) => (
              <tr className="border-b border-slate-100 last:border-0" key={user}>
                <td className="px-5 py-3">
                  <p className="text-[10px] font-semibold text-slate-800">{user}</p>
                  <p className="text-[9px] text-slate-400">
                    {user.toLowerCase().replace(" ", ".")}@mail.com
                  </p>
                </td>
                <td className="px-3 py-3">
                  <p className="max-w-[150px] truncate text-[10px] text-slate-600">{issue}</p>
                  {priority && (
                    <span className="text-[8px] font-bold text-rose-500">{priority}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <StatusPill value={status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    className="text-[9px] font-semibold text-slate-500 hover:text-slate-900"
                  >
                    {status === "Resolved" ? "View" : "Reply"}
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
        action="Monitor (24)"
      />
      <div className="mt-2 space-y-2">
        {batches.map(([name, count, status, progress, owner, tone]) => (
          <div className="rounded-md border border-slate-100 p-3" key={name}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[10px] font-semibold text-slate-800">
                {name} <span className="font-normal text-slate-400">({count})</span>
              </p>
              <StatusPill value={status} tone={tone} />
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : tone === "rose" ? "bg-rose-400" : tone === "orange" ? "bg-orange-400" : "bg-amber-400"}`}
                style={{ width: progress }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[8px] text-slate-400">
              <span>By: {owner}</span>
              <span>
                {status === "Completed"
                  ? "Published to Etsy Drafts"
                  : status === "Rendering"
                    ? "ID: b_5921 · ~4m left"
                    : status === "Queued"
                      ? "ID: b_9120 · waiting GPU"
                      : "Retry Worker 3"}
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
const StatusPill = ({ value, tone }: { value: string; tone?: string }) => (
  <span
    className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold ${tone === "emerald" || value === "Resolved" ? "bg-emerald-50 text-emerald-600" : tone === "rose" || value === "Open" ? "bg-rose-50 text-rose-500" : tone === "orange" || value === "Queued" ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-600"}`}
  >
    {value}
  </span>
);

export { AdminActivityPanels };
