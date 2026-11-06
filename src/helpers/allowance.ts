import type { AllowanceCode, AllowanceItem, Allowances } from "@/types/allowance";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1 Dec 2026" from "2026-12-01". */
export const formatAllowanceDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

export const remaining = (item: AllowanceItem) => Math.max(0, item.limit - item.used);

/** The allowances that decide whether a workflow can run, in the order a run uses them. */
export const ALLOWANCE_RUN_ORDER: AllowanceCode[] = ["full_runs", "design_runs", "products", "design_images", "mockups", "videos", "listings"];

/** The allowances in the order a run uses them, so every page lists them alike. */
export const orderAllowances = (allowances: Allowances) =>
  ALLOWANCE_RUN_ORDER.flatMap((code) => allowances.items.filter((item) => item.code === code));

const find = (allowances: Allowances, code: AllowanceCode) => allowances.items.find((item) => item.code === code);

/** When the allowances start again, in the words the page shows. */
export const allowanceResetLine = (allowances: Allowances): string | null => {
  if (!allowances.resetsOn) return null;
  const date = formatAllowanceDate(allowances.resetsOn);
  return allowances.scope === "trial" ? `Trial ends ${date}` : `Resets ${date}`;
};

/** "1 of 2 full runs left". */
export const allowanceLine = (item: AllowanceItem) => `${remaining(item)} of ${item.limit} ${item.label} left`;

export type RunNeeds = {
  productCount: number;
  variationCount: number;
  /** Mock-up templates chosen for the run; each makes at least one mockup per design. */
  templateCount: number;
};

/**
 * Why Free's or the trial's allowances cannot cover this design run, or null when they can. Mirrors
 * the backend, which refuses the same requests.
 */
export const allowanceBlocksRun = (allowances: Allowances, needs: RunNeeds): string | null => {
  if (allowances.scope === null) return null;
  const where = allowances.scope === "trial" ? "Your free trial" : allowances.scope === "plan" ? "Your plan" : "Free";
  const reset = allowances.scope !== "trial" && allowances.resetsOn ? ` They reset on ${formatAllowanceDate(allowances.resetsOn)}.` : "";

  const check = (code: AllowanceCode, requested: number): string | null => {
    const item = find(allowances, code);
    if (!item || remaining(item) >= requested) return null;
    return `This run needs ${requested} ${item.label}, and ${where} has ${remaining(item)} of ${item.limit} left.${reset}`;
  };

  const blocked =
    check("design_runs", 1) ??
    check("products", needs.productCount) ??
    check("design_images", needs.productCount * needs.variationCount);
  if (blocked) return blocked;

  const mockups = needs.productCount * needs.variationCount * needs.templateCount;
  if (allowances.mockupsPerRun !== null && mockups > allowances.mockupsPerRun) {
    return `Free makes up to ${allowances.mockupsPerRun} mockups per run, and this run would make ${mockups}. Choose fewer mock-up templates.`;
  }
  return null;
};
