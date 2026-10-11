import { api } from "@/api/client";
import type {
  RevenueChartDto,
  RevenueFilterDto,
  RevenueInvoiceDto,
  RevenueMetricsDto} from "@/types/revenue";

export const getRevenueMetrics = async (params: RevenueFilterDto): Promise<RevenueMetricsDto> =>
  (await api.get<RevenueMetricsDto>("/api/admin/revenues/metrics", { params })).data;

export const getRevenueCharts = async (params: RevenueFilterDto): Promise<RevenueChartDto> =>
  (await api.get<RevenueChartDto>("/api/admin/revenues/charts", { params })).data;

export const getRevenueInvoices = async (
  params: RevenueFilterDto
): Promise<{ items: RevenueInvoiceDto[]; totalCount: number; pageNumber: number; pageSize: number }> =>
  (
    await api.get<{
      items: RevenueInvoiceDto[];
      totalCount: number;
      pageNumber: number;
      pageSize: number;
    }>("/api/admin/revenues/invoices", { params })
  ).data;
