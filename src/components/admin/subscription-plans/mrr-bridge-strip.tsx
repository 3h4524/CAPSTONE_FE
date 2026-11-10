import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { formatDay } from "@/helpers/plan-ai-review";
import { bridgeRows, signedVnd } from "@/helpers/revenue-mrr-movement";
import type { MrrBridgeDto } from "@/types/revenue";
import { cn } from "@/utils/cn";
import { formatCompactVndAmount, formatVnd } from "@/utils/format-currency";

// What came in is blue (new customers) or aqua (moves between plans); what went out is red (churn)
// or yellow (moves and downgrades). Checked to tell apart, also with colour blindness; every card
// also names its movement, so colour is never the only cue.
const MOVEMENT_COLOR: Record<string, string> = {
  New: "#2a78d6",
  "Moved in": "#1baf7a",
  Expansion: "#1baf7a",
  "Plan changes": "#1baf7a",
  Churn: "#e34948",
  "Moved out": "#eda100",
  Contraction: "#eda100",
};

/**
 * MRR over the AI review's period, from the same figures the review was written from: MRR at the
 * start and at the end with the change between them, then a ledger of what came in and what went
 * out, each with a bar against the largest movement.
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
  // What came in first, then what went out.
  const movements = [...rows.filter((row) => row.value >= 0), ...rows.filter((row) => row.value < 0)];
  const largest = Math.max(1, ...movements.map((row) => Math.abs(row.value)));
  const net = bridge.end - bridge.start;
  const pct = bridge.start > 0 ? (net / bridge.start) * 100 : null;
  const Trend = net > 0 ? ArrowUpRight : net < 0 ? ArrowDownRight : ArrowRight;

  return (
    <div aria-label="MRR bridge" className={cn("text-xs tabular-nums", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <Total label={`MRR ${formatDay(dayBefore(periodStart))}`} value={bridge.start} muted />
        <ArrowRight className="text-ink-300 size-4" aria-hidden="true" />
        <Total label={`MRR ${formatDay(periodEnd)}`} value={bridge.end} />
      </div>

      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          net >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
        )}
      >
        <Trend className="size-3.5" />
        {net >= 0 ? "+" : "−"}
        {formatCompactVndAmount(Math.abs(net))}
        {pct !== null && (
          <span className="font-medium opacity-80">
            {" "}
            · {pct >= 0 ? "+" : "−"}
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </p>

      {movements.length > 0 && (
        <ul className="divide-ink-100 border-ink-100 mt-5 divide-y border-t">
          {movements.map((row) => {
            const color = MOVEMENT_COLOR[row.label] ?? "var(--ink-400)";
            const share = bridge.start > 0 ? Math.round((Math.abs(row.value) / bridge.start) * 100) : null;
            return (
              <li key={row.label} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4 py-3">
                <div>
                  <p className="text-ink-700 flex items-center gap-1.5 font-medium">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    {row.label}
                  </p>
                  {share !== null && <p className="text-ink-400 mt-0.5 pl-3.5 text-[11px]">{share}% of start</p>}
                </div>
                <div className="bg-ink-100 h-2 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max((Math.abs(row.value) / largest) * 100, 2)}%`, backgroundColor: color }}
                  />
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", row.value >= 0 ? "text-ink-900" : "text-rose-700 dark:text-rose-300")}>
                    {row.value >= 0 ? "+" : "−"}
                    {formatCompactVndAmount(Math.abs(row.value))}
                  </p>
                  <p className="text-ink-400 text-[11px]">{signedVnd(row.value)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Total({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-ink-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", muted ? "text-ink-500" : "text-ink-900")}>
        {formatCompactVndAmount(value)}
      </p>
      <p className="text-ink-400 text-[11px]">{formatVnd(value)}</p>
    </div>
  );
}

/** The start of a period is MRR at the end of the day before it. */
function dayBefore(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
