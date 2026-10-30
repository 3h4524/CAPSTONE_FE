import type { RevenueFilterDto } from "@/types/revenue";

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The window the Dashboard's range picker shows, ending today: the last 7 days by day ("Day"), the
 * last 6 months by month ("Month") or the last 5 years by year ("Year").
 */
export function dashboardTrendFilter(timeRange: string, today = new Date()): RevenueFilterDto {
  const end = isoDate(today);
  if (timeRange === "Day") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: isoDate(start), endDate: end, granularity: "Day" };
  }
  if (timeRange === "Year") {
    return { startDate: `${today.getFullYear() - 4}-01-01`, endDate: end, granularity: "Year" };
  }
  return { startDate: isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1)), endDate: end, granularity: "Month" };
}
