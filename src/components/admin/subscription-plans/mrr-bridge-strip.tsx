import { ArrowRight } from "lucide-react";

import { formatDay } from "@/helpers/plan-ai-review";
import { bridgeRows, signedVnd } from "@/helpers/revenue-mrr-movement";
import type { MrrBridgeDto } from "@/types/revenue";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

/**
 * MRR from the start to the end of the AI review's period, from the same figures the review was
 * written from, so the start, each movement and the end always add up.
 */
export function MrrBridgeStrip({
  bridge,
  periodStart,
  periodEnd,
  className,
}: {
  bridge: MrrBridgeDto;
  periodStart: string;
  periodEnd: string;
  className?: string;
}) {
  // All plans together only know the net of moves between plans, which the review calls plan changes.
  const rows = bridgeRows(bridge).map((row) =>
    bridge.planName === null && (row.label === "Expansion" || row.label === "Contraction")
      ? { ...row, label: "Plan changes" }
      : row
  );

  return (
    <div
      aria-label="MRR bridge"
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-600 tabular-nums", className)}
    >
      <Amount label={`MRR ${formatDay(dayBefore(periodStart))}`} value={formatVnd(bridge.start)} />
      {rows.map((row) => (
        <span key={row.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: row.color }} />
          <span>{row.label}</span>
          <span className={cn("font-semibold", row.value >= 0 ? "text-emerald-700" : "text-rose-700")}>
            {signedVnd(row.value)}
          </span>
        </span>
      ))}
      <ArrowRight className="size-3.5 text-slate-400" aria-hidden />
      <Amount label={`MRR ${formatDay(periodEnd)}`} value={formatVnd(bridge.end)} />
    </div>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-slate-500">{label} </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </span>
  );
}

/** The start of a period is MRR at the end of the day before it. */
function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
