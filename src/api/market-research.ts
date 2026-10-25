import { api } from "@/api/client";

export type RetrieveMarketResearchRequest = {
  platform: number;
  queries: string[];
  limitPerQuery: number;
  minimumViralScore: number;
  topN: number;
};

export type MarketResearchItem = {
  externalListingId: string;
  title: string;
  viralScore: number;
  favorites: number | null;
  views: number | null;
  ragDocumentId: string;
  url: string | null;
  matchedQuery: string | null;
  scoreBreakdown: {
    favoritesScore: number | null;
    viewsScore: number | null;
    favoritesWeight: number;
    viewsWeight: number;
  };
};

export type MarketResearchSchedule = {
  enabled: boolean;
  platform: number;
  queries: string[];
  limitPerQuery: number;
  minimumViralScore: number;
  topN: number;
  intervalMinutes: number;
  lastRunAtUtc: string | null;
  nextRunAtUtc: string | null;
};

export type MarketResearchResponse = {
  platform: number;
  retrievedCount: number;
  selectedCount: number;
  items: MarketResearchItem[];
};

export const retrieveAndIngestMarketResearch = async (payload: RetrieveMarketResearchRequest) => {
  const { data } = await api.post<MarketResearchResponse>(
    "/api/market-research/retrieve-and-ingest",
    payload
  );
  return data;
};

export const getMarketResearchSchedule = async () => {
  const { data } = await api.get<MarketResearchSchedule>("/api/market-research/schedule");
  return data;
};

export const updateMarketResearchSchedule = async (
  payload: Omit<MarketResearchSchedule, "lastRunAtUtc" | "nextRunAtUtc">
) => {
  const { data } = await api.put<MarketResearchSchedule>("/api/market-research/schedule", payload);
  return data;
};
