import { api } from "@/api/client";

export type MarketTagMetric = {
  tag: string;
  listingCount: number;
};

export type MarketQueryMetrics = {
  query: string;
  rawSnapshotCount: number;
  eligibleSnapshotCount: number;
  rejectedSnapshotCount: number;
  observationPeriodCount: number;
  distinctListingCount: number;
  distinctSellerCount: number;
  medianPrice: number | null;
  averageFavorites: number | null;
  averageViews: number | null;
  newListingCount: number;
  topTags: MarketTagMetric[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  confidence: "low" | "medium" | "high";
  rejectionReasons: Record<string, number>;
};

export type MarketInsightCollectionJob = {
  jobId: string;
  query: string;
  status: "queued" | "running" | "completed" | "failed";
  retrievedCount: number;
  selectedCount: number;
  errorMessage: string | null;
  createdAtUtc: string;
  completedAtUtc: string | null;
};

export type MarketInsightSchedule = {
  enabled: boolean;
  platform: number;
  queries: string[];
  limitPerQuery: number;
  minimumViralScore: number;
  topN: number;
  intervalMinutes: number;
  lastRunAtUtc: string | null;
  nextRunAtUtc: string | null;
  lastJobId: string | null;
};

export type UpdateMarketInsightScheduleInput = {
  enabled: boolean;
  query: string;
  intervalMinutes: number;
};

export const getMarketQueryMetrics = async (query: string) => {
  const { data } = await api.get<MarketQueryMetrics>(
    `/api/market-insights/${encodeURIComponent(query.trim())}`,
  );
  return data;
};

export const collectMarketQuery = async (query: string) => {
  const { data } = await api.post<MarketInsightCollectionJob>(
    "/api/market-insights/collect",
    { query: query.trim() },
  );
  return data;
};

export const getMarketQueryCollectionJob = async (jobId: string) => {
  const { data } = await api.get<MarketInsightCollectionJob>(
    `/api/market-insights/collect/${jobId}`,
  );
  return data;
};

export const getMarketInsightSchedule = async () => {
  const { data } = await api.get<MarketInsightSchedule>("/api/market-insights/schedule");
  return data;
};

export const updateMarketInsightSchedule = async (payload: UpdateMarketInsightScheduleInput) => {
  const { data } = await api.put<MarketInsightSchedule>(
    "/api/market-insights/schedule",
    payload,
  );
  return data;
};
