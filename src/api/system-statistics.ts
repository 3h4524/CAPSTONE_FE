import { api } from "@/api/client";
import type {
  StatisticsFilterDto,
  SystemStatisticsOverviewDto,
} from "@/types/system-statistics";

export const getSystemStatisticsOverview = async (
  params: StatisticsFilterDto
): Promise<SystemStatisticsOverviewDto> =>
  (
    await api.get<SystemStatisticsOverviewDto>("/api/admin/statistics/overview", {
      params,
    })
  ).data;

export const exportSystemStatisticsCsv = async (
  params: StatisticsFilterDto
): Promise<Blob> =>
  (
    await api.get<Blob>("/api/admin/statistics/export", {
      params,
      responseType: "blob",
    })
  ).data;
