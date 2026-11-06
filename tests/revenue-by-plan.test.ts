import assert from "node:assert/strict";
import { test } from "node:test";

import { customerFlowText, pickPlanLeaders, usageSignalText } from "@/helpers/revenue-by-plan";
import type { RevenueByPlanDto } from "@/types/revenue";

const plan = (overrides: Partial<RevenueByPlanDto> & { planName: string }): RevenueByPlanDto => ({
  amount: 0,
  percentage: 0,
  purchaseCount: 0,
  uniqueCustomers: 0,
  arpu: null,
  customers: { start: 0, stayed: 0, switchedOut: 0, stoppedPaying: 0, new: 0, switchedIn: 0, end: 0 },
  retentionRate: null,
  previousAmount: 0,
  percentageChange: null,
  mrrStart: 0,
  mrrEnd: 0,
  mrrChangePercent: null,
  usageSignal: { stayed: 0, left: 0, minimumGroup: 10, hasSignal: false, feature: null, featureLabel: null, stayedRate: null, leftRate: null },
  ...overrides,
});

test("each column's leader is the plan with the highest valid value", () => {
  const leaders = pickPlanLeaders([
    plan({ planName: "Pro", purchaseCount: 3, arpu: 50, retentionRate: 70 }),
    plan({ planName: "Studio", purchaseCount: 5, arpu: 80, retentionRate: null }),
    plan({ planName: "Starter", purchaseCount: 1, arpu: 10, retentionRate: 90 }),
  ]);

  assert.deepEqual(leaders, { mostPurchased: "Studio", topArpu: "Studio", topRetention: "Starter" });
});

test("plans without valid data are never marked", () => {
  const leaders = pickPlanLeaders([plan({ planName: "Pro" }), plan({ planName: "Basic" })]);

  assert.deepEqual(leaders, { mostPurchased: null, topArpu: null, topRetention: null });
});

test("fields missing from an older API response never earn a star", () => {
  const legacy = { planName: "Creator", amount: 629.97, percentage: 76.83, purchaseCount: 3 } as RevenueByPlanDto;

  assert.deepEqual(pickPlanLeaders([legacy]), { mostPurchased: "Creator", topArpu: null, topRetention: null });
});

test("a single plan with data leads only where its data is valid", () => {
  const leaders = pickPlanLeaders([
    plan({ planName: "Pro", purchaseCount: 2, arpu: 40, retentionRate: null }),
    plan({ planName: "Basic" }),
  ]);

  assert.deepEqual(leaders, { mostPurchased: "Pro", topArpu: "Pro", topRetention: null });
});

const signal = (overrides: Partial<RevenueByPlanDto["usageSignal"]>): RevenueByPlanDto["usageSignal"] => ({
  stayed: 44,
  left: 12,
  minimumGroup: 10,
  hasSignal: false,
  feature: null,
  featureLabel: null,
  stayedRate: null,
  leftRate: null,
  ...overrides,
});

test("the usage line names the feature the customers who left skipped", () => {
  const line = usageSignalText(
    plan({
      planName: "Pro",
      usageSignal: signal({ hasSignal: true, feature: "lifestyle_mockups", featureLabel: "Lifestyle mockups", stayedRate: 72.7, leftRate: 16.7 }),
    })
  );

  assert.deepEqual(line, {
    highlight: true,
    text: "Pro customers who left rarely used Lifestyle mockups: 16.7% of the 12 who left, against 72.7% of the 44 who stayed. Customers who never find it tend to leave.",
  });
});

test("the usage line asks for a longer period when too few customers left, and is absent when none did", () => {
  const tooFew = usageSignalText(plan({ planName: "Starter", usageSignal: signal({ stayed: 105, left: 9 }) }));
  assert.equal(tooFew?.highlight, false);
  assert.match(tooFew!.text, /9 left and 105 stayed, at least 10 of each needed/);

  assert.equal(usageSignalText(plan({ planName: "Starter", usageSignal: signal({ left: 0 }) })), null);
  assert.equal(usageSignalText({ planName: "Legacy" } as RevenueByPlanDto), null, "an older API sends no signal");
});

test("the customer flow keeps stopped and switched apart so start minus stopped is still paying", () => {
  // Starter this year on the demo data.
  const starter = { start: 43, stayed: 13, switchedOut: 1, stoppedPaying: 29, new: 106, switchedIn: 0, end: 119 };
  const flow = customerFlowText("Starter", starter);

  assert.deepEqual(flow.parts, [
    { text: "−29 stopped", tone: "lost" },
    { text: "−1 switched", tone: "moved" },
    { text: "+106 joined", tone: "gained" },
  ]);
  assert.equal(starter.start - starter.stoppedPaying, 14, "the 14 of 43 the retention column shows");
  assert.equal(starter.start - starter.stoppedPaying - starter.switchedOut + starter.new + starter.switchedIn, starter.end);
  assert.equal(
    flow.detail,
    "Start 43: 13 stayed on Starter, 1 switched to another plan, 29 stopped paying. End 119 = 13 who stayed + 106 new + 0 switched in from another plan."
  );
});

test("the customer flow leaves out groups that are empty", () => {
  const flow = customerFlowText("Pro", { start: 5, stayed: 5, switchedOut: 0, stoppedPaying: 0, new: 0, switchedIn: 0, end: 5 });

  assert.deepEqual(flow.parts, []);
});
