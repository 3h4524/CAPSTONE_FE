import { describe, expect, it } from "vitest";

import { dashboardTrendFilter } from "@/helpers/revenue-trend";

const today = new Date(2026, 10, 4);

describe("dashboardTrendFilter", () => {
  it("shows the last 7 or 30 days by day", () => {
    expect(dashboardTrendFilter("Week", today)).toEqual({
      startDate: "2026-10-29",
      endDate: "2026-11-04",
      granularity: "Day",
    });
    expect(dashboardTrendFilter("Month", today)).toEqual({
      startDate: "2026-10-06",
      endDate: "2026-11-04",
      granularity: "Day",
    });
  });

  it("shows the last 6 or 12 months by month, from the first of the month", () => {
    expect(dashboardTrendFilter("HalfYear", today)).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-11-04",
      granularity: "Month",
    });
    expect(dashboardTrendFilter("Year", today)).toEqual({
      startDate: "2025-12-01",
      endDate: "2026-11-04",
      granularity: "Month",
    });
  });
});
