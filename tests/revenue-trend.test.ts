import assert from "node:assert/strict";
import { test } from "node:test";

import { dashboardTrendFilter } from "@/helpers/revenue-trend";

const today = new Date(2026, 9, 28); // Oct 28, 2026

test("the Dashboard's ranges end today: 7 days, 6 months from the 1st, 5 years from Jan 1", () => {
  assert.deepEqual(dashboardTrendFilter("Day", today), { startDate: "2026-10-22", endDate: "2026-10-28", granularity: "Day" });
  assert.deepEqual(dashboardTrendFilter("Month", today), { startDate: "2026-05-01", endDate: "2026-10-28", granularity: "Month" });
  assert.deepEqual(dashboardTrendFilter("Year", today), { startDate: "2022-01-01", endDate: "2026-10-28", granularity: "Year" });
});

test("6 months back crosses the year boundary", () => {
  assert.equal(dashboardTrendFilter("Month", new Date(2026, 1, 10)).startDate, "2025-09-01");
});
