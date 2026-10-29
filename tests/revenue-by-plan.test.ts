import assert from "node:assert/strict";
import { test } from "node:test";

import { pickPlanLeaders } from "@/helpers/revenue-by-plan";
import type { RevenueByPlanDto } from "@/types/revenue";

const plan = (overrides: Partial<RevenueByPlanDto> & { planName: string }): RevenueByPlanDto => ({
  amount: 0,
  percentage: 0,
  purchaseCount: 0,
  uniqueCustomers: 0,
  arpu: null,
  retentionBase: 0,
  retentionRate: null,
  previousAmount: 0,
  percentageChange: null,
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
