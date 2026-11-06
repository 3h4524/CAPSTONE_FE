import type { RevenueFilterDto } from "@/types/revenue";

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The window the Dashboard's range picker shows, ending today: the last 7 ("Week") or 30 days
 * ("Month") by day, or the last 6 ("HalfYear") or 12 months ("Year") by month.
 */
export function dashboardTrendFilter(timeRange: string, today = new Date()): RevenueFilterDto {
  const end = isoDate(today);
  if (timeRange === "HalfYear" || timeRange === "Year") {
    const months = timeRange === "Year" ? 12 : 6;
    return {
      startDate: isoDate(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)),
      endDate: end,
      granularity: "Month",
    };
  }
  const start = new Date(today);
  start.setDate(start.getDate() - (timeRange === "Week" ? 6 : 29));
  return { startDate: isoDate(start), endDate: end, granularity: "Day" };
}
