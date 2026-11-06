import type { MrrBridgeDto } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

/** One color per cause of MRR change, shared by the monthly bars and the period bridge. */
export const MRR_MOVEMENT_COLORS = {
  // A step lighter than the 600 shades, so the large bars are easier on the eye.
  new: "#3b82f6",
  expansion: "#93c5fd",
  contraction: "#f59e0b",
  churn: "#f43f5e",
} as const;

/** A signed VND amount, e.g. "+249.750 ₫" or "−1.499.500 ₫". */
export const signedVnd = (value: number) => `${value >= 0 ? "+" : "−"}${formatVnd(Math.abs(value))}`;

export interface BridgeRow {
  label: string;
  /** Positive when it added MRR, negative when it removed it. */
  value: number;
  color: string;
}

/**
 * The causes of change worth listing for one bridge: New and Churn always, the rest only when they
 * moved MRR. A single plan also shows customers who moved in from or out to another plan.
 */
export function bridgeRows(bridge: MrrBridgeDto): BridgeRow[] {
  const isAll = bridge.planName === null;
  const colors = MRR_MOVEMENT_COLORS;
  const rows: (BridgeRow & { always?: boolean })[] = [
    { label: "New", value: bridge.new, color: colors.new, always: true },
    ...(isAll ? [] : [{ label: "Moved in", value: bridge.movedIn, color: colors.expansion }]),
    { label: "Expansion", value: bridge.expansion, color: colors.expansion },
    { label: "Contraction", value: -bridge.contraction, color: colors.contraction },
    ...(isAll ? [] : [{ label: "Moved out", value: -bridge.movedOut, color: colors.contraction }]),
    { label: "Churn", value: -bridge.churn, color: colors.churn, always: true },
  ];
  return rows.filter((row) => row.always || row.value !== 0);
}

/** One sentence on how the bridge's MRR changed and what moved it most each way. */
export function bridgeSummary(bridge: MrrBridgeDto): string {
  const subject = bridge.planName ? `${bridge.planName} MRR` : "Overall MRR";
  const net = bridge.end - bridge.start;
  const pct = bridge.start > 0 && net !== 0 ? ` (${net >= 0 ? "+" : "−"}${Math.abs((net / bridge.start) * 100).toFixed(1)}%)` : "";
  const direction = net > 0 ? "grew" : net < 0 ? "fell" : "held steady";
  const head = `${subject} ${direction}${net === 0 ? "" : ` ${formatVnd(Math.abs(net))}`}${pct}.`;

  const rows = bridgeRows(bridge);
  const biggestLoss = rows.filter((row) => row.value < 0).sort((a, b) => a.value - b.value)[0];
  const biggestGain = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value)[0];
  if (!biggestLoss && !biggestGain) return `${head} Nothing changed in the period.`;
  if (!biggestLoss) return `${head} ${biggestGain.label} added ${formatVnd(biggestGain.value)} and nothing was lost.`;
  if (!biggestGain) return `${head} ${biggestLoss.label} removed ${formatVnd(-biggestLoss.value)} with nothing added.`;
  return `${head} ${biggestLoss.label} removed ${formatVnd(-biggestLoss.value)} while ${biggestGain.label.toLowerCase()} added ${formatVnd(biggestGain.value)}.`;
}
