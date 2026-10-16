import { getRevenueCharts, getRevenueInvoices,getRevenueMetrics } from "@/api/revenue";
import type { RevenueFilterDto } from "@/types/revenue";
import { useQuery } from "@tanstack/react-query";

export const revenueKeys = {
  all: ["revenues"] as const,
  metrics: (filter: RevenueFilterDto) => [...revenueKeys.all, "metrics", filter] as const,
  charts: (filter: RevenueFilterDto) => [...revenueKeys.all, "charts", filter] as const,
  invoices: (filter: RevenueFilterDto) => [...revenueKeys.all, "invoices", filter] as const,
};

export function useRevenueMetrics(filter: RevenueFilterDto) {
  return useQuery({
    queryKey: revenueKeys.metrics(filter),
    queryFn: () => getRevenueMetrics(filter),
  });
}

export function useRevenueCharts(filter: RevenueFilterDto) {
  return useQuery({
    queryKey: revenueKeys.charts(filter),
    queryFn: () => getRevenueCharts(filter),
  });
}

export function useRevenueInvoices(filter: RevenueFilterDto) {
  return useQuery({
    queryKey: revenueKeys.invoices(filter),
    queryFn: () => getRevenueInvoices(filter),
  });
}
