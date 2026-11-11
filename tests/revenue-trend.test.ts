import assert from "node:assert/strict";
import { test } from "node:test";

import { dashboardTrendFilter } from "@/helpers/revenue-trend";

const today = new Date(2026, 9, 28); // Oct 28, 2026

test("the Dashboard's ranges end today: 7 and 30 days by day, 6 and 12 months from the 1st by month", () => {
  assert.deepEqual(dashboardTrendFilter("Week", today), { startDate: "2026-10-22", endDate: "2026-10-28", granularity: "Day" });
  assert.deepEqual(dashboardTrendFilter("Month", today), { startDate: "2026-09-29", endDate: "2026-10-28", granularity: "Day" });
  assert.deepEqual(dashboardTrendFilter("HalfYear", today), { startDate: "2026-05-01", endDate: "2026-10-28", granularity: "Month" });
  assert.deepEqual(dashboardTrendFilter("Year", today), { startDate: "2025-11-01", endDate: "2026-10-28", granularity: "Month" });
});

test("6 months back crosses the year boundary", () => {
  assert.equal(dashboardTrendFilter("HalfYear", new Date(2026, 1, 10)).startDate, "2025-09-01");
});
