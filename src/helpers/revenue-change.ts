/** Whether a rising value is good news (revenue) or bad news (refunds, churn). */
export type ChangePolarity = "higher-is-better" | "lower-is-better";

export type ChangeTone = "good" | "bad" | "neutral";

/**
 * Formats a period-over-period change. The API sends `null` when the previous period was zero,
 * because a change from nothing has no meaningful percentage: that shows as "New" when something
 * happened this period and "—" when both periods are empty. A rate (churn) changes in percentage
 * points, shown with the "pp" unit.
 */
export function formatChange(
  percentageChange: number | null | undefined,
  current: number,
  unit: "%" | " pp" = "%"
): string {
  if (percentageChange === null || percentageChange === undefined) {
    return current !== 0 ? "New" : "—";
  }
  if (percentageChange === 0) return `0${unit}`;
  const rounded = Math.round(percentageChange * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

/** Colors a change by what it means for the business, not by its direction alone. */
export function changeTone(
  percentageChange: number | null | undefined,
  polarity: ChangePolarity = "higher-is-better"
): ChangeTone {
  if (percentageChange === null || percentageChange === undefined || percentageChange === 0) {
    return "neutral";
  }
  const rose = percentageChange > 0;
  return rose === (polarity === "higher-is-better") ? "good" : "bad";
}

export const CHANGE_TONE_CLASS: Record<ChangeTone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-400 dark:text-slate-500",
};
