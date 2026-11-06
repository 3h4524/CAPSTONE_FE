import { describe, expect, it } from "vitest";

import { customerFlowText, getPlanColor, pickPlanLeaders, usageSignalText } from "@/helpers/revenue-by-plan";
import type { PlanCustomerFlowDto, RevenueByPlanDto } from "@/types/revenue";

const plan = (planName: string, overrides: Partial<RevenueByPlanDto> = {}) =>
  ({ planName, purchaseCount: 0, arpu: null, retentionRate: null, usageSignal: null, ...overrides }) as RevenueByPlanDto;

type Signal = NonNullable<RevenueByPlanDto["usageSignal"]>;
const signal = (overrides: Partial<Signal> = {}) =>
  ({
    left: 10,
    stayed: 20,
    minimumGroup: 5,
    hasSignal: false,
    featureLabel: null,
    stayedRate: null,
    leftRate: null,
    ...overrides,
  }) as Signal;

describe("getPlanColor", () => {
  it("uses the plan's color, else cycles the defaults", () => {
    expect(getPlanColor("Pro")).toBe("#6366f1");
    expect(getPlanColor("Other", 0)).toBe("#1e3a5f");
    expect(getPlanColor("Other", 7)).toBe("#ea580c");
  });
});

describe("pickPlanLeaders", () => {
  it("picks the leader of each column and keeps the first on a tie", () => {
    const leaders = pickPlanLeaders([
      plan("A", { purchaseCount: 5, arpu: 10, retentionRate: 90 }),
      plan("B", { purchaseCount: 9, arpu: 10, retentionRate: 50 }),
    ]);
    expect(leaders).toEqual({ mostPurchased: "B", topArpu: "A", topRetention: "A" });
  });

  it("never picks a plan without a valid value", () => {
    expect(pickPlanLeaders([plan("A")])).toEqual({ mostPurchased: null, topArpu: null, topRetention: null });
    expect(pickPlanLeaders([])).toEqual({ mostPurchased: null, topArpu: null, topRetention: null });
  });
});

describe("usageSignalText", () => {
  it("is null with no signal or nobody gone", () => {
    expect(usageSignalText(plan("Pro"))).toBeNull();
    expect(usageSignalText(plan("Pro", { usageSignal: signal({ left: 0 }) }))).toBeNull();
  });

  it("highlights a feature those who left rarely used", () => {
    const text = usageSignalText(
      plan("Pro", {
        usageSignal: signal({ hasSignal: true, featureLabel: "Video", stayedRate: 80, leftRate: 20 }),
      })
    );
    expect(text?.highlight).toBe(true);
    expect(text?.text).toContain("Pro customers who left rarely used Video: 20% of the 10");
  });

  it("says when too few customers can be compared", () => {
    const text = usageSignalText(plan("Pro", { usageSignal: signal({ left: 2 }) }));
    expect(text?.highlight).toBe(false);
    expect(text?.text).toContain("Not enough customers to compare usage: 2 left and 20 stayed");
  });

  it("says when both groups used the plan alike", () => {
    expect(usageSignalText(plan("Pro", { usageSignal: signal() }))?.text).toBe(
      "The 10 customers who left used every feature about as much as those who stayed."
    );
  });
});

describe("customerFlowText", () => {
  const flow = {
    start: 10,
    stayed: 6,
    switchedOut: 1,
    stoppedPaying: 3,
    new: 2,
    switchedIn: 1,
    end: 9,
  } as PlanCustomerFlowDto;

  it("lists what moved and adds joiners together", () => {
    expect(customerFlowText("Pro", flow).parts).toEqual([
      { text: "−3 stopped", tone: "lost" },
      { text: "−1 switched", tone: "moved" },
      { text: "+3 joined", tone: "gained" },
    ]);
  });

  it("leaves out groups of nobody but still explains the numbers", () => {
    const quiet = {
      start: 5,
      stayed: 5,
      switchedOut: 0,
      stoppedPaying: 0,
      new: 0,
      switchedIn: 0,
      end: 5,
    } as PlanCustomerFlowDto;
    const text = customerFlowText("Pro", quiet);
    expect(text.parts).toEqual([]);
    expect(text.detail).toContain("Start 5: 5 stayed on Pro");
    expect(text.detail).toContain("End 5 = 5 who stayed + 0 new + 0 switched in");
  });
});
