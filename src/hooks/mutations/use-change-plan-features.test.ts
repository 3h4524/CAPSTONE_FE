import { describe, expect, it } from "vitest";

import { describeChanges, undoActions } from "@/hooks/mutations/use-change-plan-features";
import type { PlanFeatureChange, PlanFeatureChanges } from "@/types/admin-subscription-plan";

const result = (changes: PlanFeatureChange[]): PlanFeatureChanges => ({ planId: "p1", planName: "Pro", changes });

const change = (overrides: Partial<PlanFeatureChange>): PlanFeatureChange => ({
  code: "ai_video",
  label: "AI video",
  kind: "flag",
  before: { isEnabled: true, limitValue: null },
  after: { isEnabled: false, limitValue: null },
  keptBy: 0,
  keptUntil: null,
  ...overrides,
});

describe("undoActions", () => {
  it("adds back a removed feature and removes an added one", () => {
    expect(
      undoActions(
        result([
          change({ keptBy: 3, keptUntil: "2026-11-30" }),
          change({ code: "auto_approval", before: { isEnabled: false, limitValue: null }, after: { isEnabled: true, limitValue: null } }),
        ])
      )
    ).toEqual([
      { type: "add", planId: "p1", features: [{ code: "ai_video" }] },
      { type: "remove", planId: "p1", code: "auto_approval" },
    ]);
  });

  it("puts a limit back and skips what did not change", () => {
    expect(
      undoActions(
        result([
          change({
            code: "design_variations",
            kind: "limit",
            before: { isEnabled: true, limitValue: null },
            after: { isEnabled: true, limitValue: 2 },
          }),
          change({ code: "auto_approval", after: { isEnabled: true, limitValue: null } }),
        ])
      )
    ).toEqual([{ type: "limit", planId: "p1", code: "design_variations", limitValue: null }]);
  });
});

describe("describeChanges", () => {
  it("says who keeps a removed feature and until when", () => {
    const message = describeChanges(result([change({ keptBy: 3, keptUntil: "2026-11-30" })]), {
      type: "remove",
      planId: "p1",
      code: "ai_video",
    });

    expect(message).toBe(
      "AI video removed from Pro. 3 current subscribers keep the old setting until their period ends (latest 30 Nov 2026)."
    );
  });

  it("names a new limit", () => {
    const message = describeChanges(
      result([
        change({
          code: "daily_mockup_cap",
          label: "Daily mockup cap",
          kind: "limit",
          before: { isEnabled: true, limitValue: 300 },
          after: { isEnabled: true, limitValue: null },
        }),
      ]),
      { type: "limit", planId: "p1", code: "daily_mockup_cap", limitValue: null }
    );

    expect(message).toBe("Daily mockup cap on Pro set to no limit.");
  });
});
