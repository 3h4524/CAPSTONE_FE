import { api } from "@/api/client";
import type { SellerOpportunity } from "@/api/market-opportunities";
import type {
  DashboardActionItems,
  DashboardPeriod,
  DashboardSummary,
} from "@/types/seller-dashboard";

export const getDashboardSummary = async (days: DashboardPeriod): Promise<DashboardSummary> =>
  (await api.get<DashboardSummary>(`/api/dashboard/summary?days=${days}`)).data;

export const getDashboardActionItems = async (): Promise<DashboardActionItems> =>
  (await api.get<DashboardActionItems>("/api/dashboard/action-items")).data;

/** The Seller's best-ranked Market Radar niches they have not acted on yet. */
export const getDashboardOpportunities = async (limit: number): Promise<SellerOpportunity[]> =>
  (
    await api.get<SellerOpportunity[]>("/api/market-opportunities", {
      params: { state: "new", limit },
    })
  ).data;
