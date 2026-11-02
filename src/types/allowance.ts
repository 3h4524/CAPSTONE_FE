/** What a Seller on Free or the Pro trial has used (GET /api/allowances). */
export type AllowanceCode =
  | "full_runs"
  | "design_runs"
  | "design_images"
  | "products"
  | "mockups"
  | "videos"
  | "listings";

export type AllowanceItem = {
  code: AllowanceCode;
  /** Plural noun, e.g. "full runs". */
  label: string;
  used: number;
  limit: number;
};

export type Allowances = {
  /** "free", "trial", or null on a paid plan, which has no allowances. */
  // "plan": a paid plan with a monthly limit, such as Starter's listings per month.
  scope: "free" | "trial" | "plan" | null;
  /** Free: the 1st of next month. Trial: the day it ends (YYYY-MM-DD). */
  resetsOn: string | null;
  /** Mockups one run may make; null when there is no such limit. */
  mockupsPerRun: number | null;
  items: AllowanceItem[];
};
