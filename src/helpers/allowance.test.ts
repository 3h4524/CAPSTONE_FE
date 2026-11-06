import { describe, expect, it } from "vitest";

import {
  allowanceBlocksRun,
  allowanceLine,
  allowanceResetLine,
  formatAllowanceDate,
  orderAllowances,
  remaining,
} from "@/helpers/allowance";
import type { AllowanceCode, AllowanceItem, Allowances } from "@/types/allowance";

const item = (code: AllowanceCode, used: number, limit: number): AllowanceItem =>
  ({ code, label: code.replace("_", " "), used, limit }) as AllowanceItem;

const allowances = (overrides: Partial<Allowances> = {}): Allowances =>
  ({ scope: "free", resetsOn: "2026-12-01", mockupsPerRun: null, items: [], ...overrides }) as Allowances;

const needs = { productCount: 2, variationCount: 2, templateCount: 1 };

describe("allowance dates and lines", () => {
  it("formats a date, ignoring any time", () => {
    expect(formatAllowanceDate("2026-12-01T10:00:00Z")).toBe("1 Dec 2026");
  });

  it("never reports less than nothing left", () => {
    expect(remaining(item("products", 12, 10))).toBe(0);
  });

  it("words what is left", () => {
    expect(allowanceLine(item("design_runs", 1, 3))).toBe("2 of 3 design runs left");
  });

  it("orders items the way a run uses them, leaving out unknown codes", () => {
    const ordered = orderAllowances(
      allowances({ items: [item("videos", 0, 1), item("design_runs", 0, 1), item("nope" as AllowanceCode, 0, 1)] })
    );
    expect(ordered.map((x) => x.code)).toEqual(["design_runs", "videos"]);
  });

  it("says a trial ends and a month resets", () => {
    expect(allowanceResetLine(allowances({ scope: "trial" }))).toBe("Trial ends 1 Dec 2026");
    expect(allowanceResetLine(allowances())).toBe("Resets 1 Dec 2026");
    expect(allowanceResetLine(allowances({ resetsOn: null }))).toBeNull();
  });
});

describe("allowanceBlocksRun", () => {
  it("never blocks a plan without allowances", () => {
    expect(allowanceBlocksRun(allowances({ scope: null, items: [item("products", 9, 1)] }), needs)).toBeNull();
  });

  it("lets through a run that fits exactly", () => {
    const fits = allowances({
      items: [item("design_runs", 0, 1), item("products", 8, 10), item("design_images", 6, 10)],
    });
    expect(allowanceBlocksRun(fits, needs)).toBeNull();
  });

  it("skips an allowance the Seller does not have", () => {
    expect(allowanceBlocksRun(allowances(), needs)).toBeNull();
  });

  it("names the first allowance that runs out, with the Free reset date", () => {
    expect(allowanceBlocksRun(allowances({ items: [item("products", 9, 10)] }), needs)).toContain(
      "This run needs 2 products, and Free has 1 of 10 left. They reset on 1 Dec 2026."
    );
  });

  it("multiplies products by variations for design images", () => {
    expect(allowanceBlocksRun(allowances({ items: [item("design_images", 7, 10)] }), needs)).toContain(
      "needs 4 design images"
    );
  });

  it("does not promise a reset to a trial", () => {
    const message = allowanceBlocksRun(allowances({ scope: "trial", items: [item("design_runs", 1, 1)] }), needs);
    expect(message).toContain("Your free trial has 0 of 1 left.");
    expect(message).not.toContain("reset");
  });

  it("speaks of the plan on a paid plan", () => {
    expect(allowanceBlocksRun(allowances({ scope: "plan", items: [item("design_runs", 1, 1)] }), needs)).toContain(
      "Your plan has 0 of 1 left."
    );
  });

  it("limits the mockups a run may make", () => {
    expect(allowanceBlocksRun(allowances({ mockupsPerRun: 7 }), { ...needs, templateCount: 2 })).toContain(
      "Free makes up to 7 mockups per run, and this run would make 8."
    );
    expect(allowanceBlocksRun(allowances({ mockupsPerRun: 8 }), { ...needs, templateCount: 2 })).toBeNull();
  });
});
