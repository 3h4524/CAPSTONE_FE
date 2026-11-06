import { describe, expect, it } from "vitest";

import {
  adoptionDrop,
  adoptionSummary,
  formatShare,
  isUnderused,
  orderFeatures,
  splitAiLabel,
} from "@/helpers/plan-adoption";

const feature = (label: string, rate: number, includedInPlan = true, extra = {}) => ({
  metric: label,
  label,
  includedInPlan,
  rate,
  ...extra,
});

describe("small rules", () => {
  it("formats a share with one decimal", () => {
    expect(formatShare(69)).toBe("69.0%");
    expect(formatShare(12.34)).toBe("12.3%");
  });

  it("counts exactly the threshold as used", () => {
    expect(isUnderused(19.9, 20)).toBe(true);
    expect(isUnderused(20, 20)).toBe(false);
  });

  it("splits the AI mark from a label", () => {
    expect(splitAiLabel("Lifestyle mockups (AI)")).toEqual({ name: "Lifestyle mockups", ai: true });
    expect(splitAiLabel("Exports")).toEqual({ name: "Exports", ai: false });
  });

  it("orders rows by workflow, unknown ones last in their order", () => {
    const rows = ["z", "exports", "y", "design_images"].map((metric) => ({ metric }));
    expect(orderFeatures(rows).map((x) => x.metric)).toEqual(["design_images", "exports", "z", "y"]);
  });
});

describe("adoptionDrop", () => {
  it("shows a drop of at least five points", () => {
    expect(adoptionDrop(45, 50)).toBe(5);
    expect(adoptionDrop(45.1, 50)).toBeNull();
  });

  it("does not show a rise or a feature new to this plan", () => {
    expect(adoptionDrop(80, 50)).toBeNull();
    expect(adoptionDrop(50, null)).toBeNull();
  });
});

describe("adoptionSummary", () => {
  it("is empty with nothing to point out", () => {
    expect(adoptionSummary([{ name: "Starter", adoption: [feature("Exports", 50)] }], 20)).toEqual([]);
  });

  it("lists drops from the plan before, the largest first", () => {
    const lines = adoptionSummary(
      [
        { name: "Starter", adoption: [feature("Exports", 60), feature("Mockups", 70)] },
        { name: "Pro", adoption: [feature("Exports", 50), feature("Mockups", 40)] },
      ],
      20
    );
    expect(lines).toEqual(["2 features are used less on Pro than on Starter: Mockups (▼30.0), Exports (▼10.0)."]);
  });

  it("words a single drop and AI features apart", () => {
    const drop = (...labels: string[]) =>
      adoptionSummary(
        [
          { name: "Starter", adoption: labels.map((label) => feature(label, 60)) },
          { name: "Pro", adoption: labels.map((label) => feature(label, 50)) },
        ],
        20
      )[0];

    expect(drop("Exports")).toContain("1 feature is used less");
    expect(drop("AI video")).toContain("1 AI feature is used less");
    expect(drop("Lifestyle (AI)", "AI video")).toContain("2 AI features are used less");
  });

  it("ignores a drop against a plan that did not include the feature", () => {
    const lines = adoptionSummary(
      [
        { name: "Starter", adoption: [feature("Video", 60, false)] },
        { name: "Pro", adoption: [feature("Video", 50)] },
      ],
      20
    );
    expect(lines).toEqual([]);
  });

  it("groups underused features across plans", () => {
    const lines = adoptionSummary(
      [
        { name: "Starter", adoption: [feature("Exports", 10), feature("Hidden", 1, false)] },
        { name: "Pro", adoption: [feature("Exports", 12)] },
      ],
      20
    );
    expect(lines).toEqual(["Used by under 20% of Sellers: Exports on Starter and Pro."]);
  });

  it("mentions a daily cap only when someone reached it", () => {
    const lines = adoptionSummary(
      [
        {
          name: "Pro",
          adoption: [
            feature("Video", 50, true, { dailyCap: 10, usersAtDailyCap: 1 }),
            feature("Listing", 50, true, { dailyCap: 10, usersAtDailyCap: 0 }),
            feature("Mockups", 50, true, { dailyCap: null, usersAtDailyCap: 3 }),
          ],
        },
      ],
      20
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("1 Seller on Pro reached the daily video cap (10 a day).");
    expect(lines[0]).not.toContain("Listing");
  });
});
