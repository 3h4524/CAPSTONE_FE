import { getCurrentLocale, i18n } from "@/i18n/client";
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

const BRIDGE_SUMMARY_LABEL_KEYS: Record<string, string> = {
  New: "admin.revenue.mrrMovement.causes.new",
  "Moved in": "admin.revenue.mrrMovement.causes.movedIn",
  Expansion: "admin.revenue.mrrMovement.causes.expansion",
  Contraction: "admin.revenue.mrrMovement.causes.contraction",
  "Moved out": "admin.revenue.mrrMovement.causes.movedOut",
  Churn: "admin.revenue.mrrMovement.causes.churn",
};

/** One sentence on how the bridge's MRR changed and what moved it most each way. */
export function bridgeSummary(bridge: MrrBridgeDto): string {
  const t = i18n.t.bind(i18n);
  const summaryLabel = (label: string) => {
    const key = BRIDGE_SUMMARY_LABEL_KEYS[label];
    return key ? t(key) : label;
  };
  const subject = bridge.planName
    ? t("admin.revenue.mrrMovement.summary.subjectPlan", { name: bridge.planName })
    : t("admin.revenue.mrrMovement.summary.subjectOverall");
  const net = bridge.end - bridge.start;
  const pct = bridge.start > 0 && net !== 0 ? ` (${net >= 0 ? "+" : "−"}${Math.abs((net / bridge.start) * 100).toFixed(1)}%)` : "";
  const direction = net > 0
    ? t("admin.revenue.mrrMovement.summary.grew")
    : net < 0
      ? t("admin.revenue.mrrMovement.summary.fell")
      : t("admin.revenue.mrrMovement.summary.heldSteady");
  const head = `${subject} ${direction}${net === 0 ? "" : ` ${formatVnd(Math.abs(net))}`}${pct}.`;

  const rows = bridgeRows(bridge);
  const biggestLoss = rows.filter((row) => row.value < 0).sort((a, b) => a.value - b.value)[0];
  const biggestGain = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value)[0];
  if (!biggestLoss && !biggestGain) return `${head} ${t("admin.revenue.mrrMovement.summary.nothingChanged")}`;
  if (!biggestLoss)
    return `${head} ${t("admin.revenue.mrrMovement.summary.gainOnly", { label: summaryLabel(biggestGain.label), amount: formatVnd(biggestGain.value) })}`;
  if (!biggestGain)
    return `${head} ${t("admin.revenue.mrrMovement.summary.lossOnly", { label: summaryLabel(biggestLoss.label), amount: formatVnd(-biggestLoss.value) })}`;
  const gainLabel = getCurrentLocale() === "vi" ? summaryLabel(biggestGain.label) : summaryLabel(biggestGain.label).toLowerCase();
  return `${head} ${t("admin.revenue.mrrMovement.summary.bothJoined", {
    lossLabel: summaryLabel(biggestLoss.label),
    lossAmount: formatVnd(-biggestLoss.value),
    gainLabel,
    gainAmount: formatVnd(biggestGain.value),
  })}`;
}
