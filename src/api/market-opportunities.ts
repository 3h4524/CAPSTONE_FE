import axios from "axios";

import { api } from "@/api/client";

export type SellerResearchProfile = {
  userId: string;
  shopGoal: string | null;
  targetAudiences: string[];
  preferredCategories: string[];
  excludedCategories: string[];
  preferredKeywords: string[];
  minimumPrice: number | null;
  maximumPrice: number | null;
  profileVersion: number;
  updatedAt: string;
};

export type SellerResearchProfileInput = Omit<SellerResearchProfile, "userId" | "profileVersion" | "updatedAt">;

export type SellerOpportunity = {
  id: string;
  opportunityId: string;
  platform: string;
  title: string;
  niche: string;
  category: string | null;
  summary: string | null;
  marketOpportunityScore: number;
  confidence: number;
  sellerFitScore: number;
  finalScore: number;
  rank: number | null;
  state: "new" | "saved" | "ignored" | "acted" | "dismissed";
  fitExplanation: string | null;
  fitBreakdown: Record<string, number>;
  lastEvaluatedAt: string;
  insights: MarketOpportunityInsights;
  nicheMarket?: OpportunityNicheMarket | null;
};

export type MarketOpportunityInsights = {
  evidenceCount: number;
  distinctListingCount: number;
  distinctSellerCount: number;
  medianPrice: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  engagementRate: number | null;
  engagementChangePercent: number | null;
  engagementTrend: "up" | "down" | "flat" | "unknown";
  competitionLevel: "low" | "medium" | "high" | "unknown";
  confidenceLabel: "low" | "medium" | "high";
  evidenceQuality: "insufficient" | "early" | "supported";
  priceLabel: "observed" | "typical";
  observationPeriodCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  dataSource: "real" | "synthetic" | "hybrid" | "unknown";
  realEvidenceCount: number;
  syntheticEvidenceCount: number;
  freshnessLabel: "fresh" | "aging" | "stale" | "unknown";
  freshnessAgeDays: number | null;
  freshnessScore: number;
  marketScoreBreakdown: Record<string, number>;
  evidence: MarketOpportunityEvidence[];
};

export type MarketOpportunityEvidence = {
  title: string;
  sourceUrl: string | null;
  price: number | null;
  currency: string | null;
  favorites: number | null;
  views: number | null;
  observedAt: string;
};

export type SellerMarketInsight = {
  query: string;
  distinctListingCount: number;
  distinctSellerCount: number;
  medianPrice: number | null;
  averageFavorites: number | null;
  averageViews: number | null;
  newListingCount: number;
  observationPeriodCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  listingTrend: "growing" | "reducing" | "stable" | "unknown";
  listingGrowthPercent: number | null;
  engagementTrend: "up" | "down" | "flat" | "unknown";
  engagementChangePercent: number | null;
  demandProxy: "high" | "medium" | "low" | "unknown" | "insufficient";
  competitionLevel: "low" | "medium" | "high" | "unknown";
  evidenceQuality: "insufficient" | "low" | "medium" | "high";
  seasonality: "seasonal" | "stable" | "insufficient";
  topTags: Array<{ tag: string; listingCount: number }>;
  relevanceScore: number;
  insightType: "promising_signal" | "declining_market" | "crowded_market" | "supply_outpacing_demand" | "watch_market" | "insufficient_evidence";
  recommendation: string;
  actionPlan: string[];
  risks: string[];
};

/** Signals from one collection of public listings, normalised per listing. */
export type MarketListingSignals = {
  sampleListingCount: number;
  medianListingAgeDays: number | null;
  medianFavoritesPer30Days: number | null;
  newListingSharePercent: number | null;
  risingNewListingCount: number;
  personalizedSharePercent: number | null;
  priceP25: number | null;
  medianPrice: number | null;
  priceP75: number | null;
  topSellerSharePercent: number | null;
  /** Distinct sellers in the latest top results. */
  sellerCount: number;
  /** Sellers with at least one top listing gaining 3+ favorites per 30 days. */
  strongSellerCount: number;
  risingListings: MarketRisingListing[];
  latestCollectedOn: string | null;
  /** Price against favorites per month for the top listings; filled for the niche, empty per keyword. */
  points: MarketListingPoint[];
  shareTiers: MarketShareTiers | null;
  /** Currency of every price signal; listings priced in other currencies are left out of them. */
  priceCurrency: string | null;
};

export type MarketListingPoint = {
  title: string;
  price: number;
  favoritesPer30Days: number;
  ageDays: number;
  isNew: boolean;
  url: string | null;
};

/** Percent of the top listings held by the 5 largest shops, the next 15, and everyone else. */
export type MarketShareTiers = {
  topFivePercent: number;
  nextFifteenPercent: number;
  restPercent: number;
};

export type MarketSupplyPoint = {
  day: string;
  activeListingCount: number;
};

/** A public listing under 90 days old that already gains favorites quickly. */
export type MarketRisingListing = {
  title: string;
  url: string | null;
  ageDays: number;
  favoritesPer30Days: number;
  price: number | null;
  currency: string | null;
};

/** Supply from Etsy's own active-listing count; comparable across days, unlike the sample. */
export type MarketSupplySignal = {
  activeListingCount: number | null;
  trend: "growing" | "reducing" | "stable" | "unknown";
  changePercent: number | null;
  observationDayCount: number;
  latestObservedOn: string | null;
  /** Rank of the market size among tracked niches, 0–100; null until enough niches are collected. */
  sizePercentile: number | null;
  history: MarketSupplyPoint[] | null;
};

/** Market signals of the niche an opportunity belongs to. */
export type OpportunityNicheMarket = {
  keyword: string;
  activeListingCount: number | null;
  sizePercentile: number | null;
  competitionLevel: "low" | "medium" | "high" | "unknown";
  demandProxy: DemandProxy;
  medianFavoritesPer30Days: number | null;
  sellerCount: number;
  strongSellerCount: number;
  risingNewListingCount: number;
  latestObservedOn: string | null;
};

type DemandProxy = "high" | "medium" | "low" | "insufficient";

export type SellerNicheMarketInsight = {
  niche: string;
  matchedQueries: string[];
  verdict: "worth_following" | "avoid_for_now" | "watch_and_differentiate" | "watch_market" | "insufficient_evidence";
  conclusion: string;
  competitorCount: number;
  competitionLevel: "low" | "medium" | "high" | "unknown";
  competitorTrend: "growing" | "reducing" | "stable" | "unknown";
  competitorGrowthPercent: number | null;
  listingTrend: "growing" | "reducing" | "stable" | "unknown";
  listingGrowthPercent: number | null;
  demandTrend: "up" | "down" | "flat" | "unknown";
  evidenceQuality: "insufficient" | "low" | "medium" | "high";
  observationPeriodCount: number;
  relevanceScore: number;
  demandProxy: DemandProxy;
  marketSupply: MarketSupplySignal;
  signals: MarketListingSignals;
  recommendation: string;
  actionPlan: string[];
  risks: string[];
  highlights: string[];
  competitors: Array<{
    sellerId: string;
    listingCount: number;
    listingTrend: "growing" | "reducing" | "stable" | "unknown";
    listingGrowthPercent: number | null;
    representativeListingTitle: string;
    representativeListingUrl: string | null;
    representativePrice: number | null;
  }>;
  keywords: Array<{
    keyword: string;
    demandProxyValue: number;
    competitorCount: number;
    competitionLevel: "low" | "medium" | "high" | "unknown";
    keywordScore: number;
    profileMatchScore: number;
    matchedProfileTerms: string[];
    marketTrendScore: number | null;
    trend: "growing" | "reducing" | "stable" | "unknown";
    trendChangePercent: number | null;
    evidenceQuality: "insufficient" | "low" | "medium" | "high";
    demandProxy: DemandProxy;
    activeListingCount: number | null;
    signals: MarketListingSignals;
    sizePercentile: number | null;
  }>;
};

export type OpportunityAnalysis = {
  runId: string;
  sellerOpportunityId: string;
  status: string;
  provider: string;
  model: string;
  summary: string;
  recommendation: string;
  supportingPoints: string[];
  risks: string[];
  actionPlan: string[];
  confidenceNote: string;
};

export const getSellerResearchProfile = async () =>
  (await api.get<SellerResearchProfile>("/api/market-opportunities/profile")).data;

export const saveSellerResearchProfile = async (input: SellerResearchProfileInput) =>
  (await api.put<SellerResearchProfile>("/api/market-opportunities/profile", input)).data;

export const listSellerOpportunities = async (state?: string) =>
  (await api.get<SellerOpportunity[]>("/api/market-opportunities", { params: state ? { state } : undefined })).data;

export const refreshSellerOpportunities = async () =>
  (await api.post<SellerOpportunity[]>("/api/market-opportunities/refresh")).data;

export const listSellerMarketInsights = async (limit = 12) =>
  (await api.get<SellerNicheMarketInsight[]>("/api/market-opportunities/insights", { params: { limit } })).data;

export const updateSellerOpportunityState = async (
  id: string,
  state: SellerOpportunity["state"],
) => (await api.patch<SellerOpportunity>("/api/market-opportunities/" + id + "/state", { state })).data;

export const analyzeSellerOpportunity = async (id: string) =>
  (await api.post<OpportunityAnalysis>("/api/market-opportunities/" + id + "/analyze")).data;

export const getLatestSellerOpportunityAnalysis = async (id: string): Promise<OpportunityAnalysis | null> => {
  try {
    return (await api.get<OpportunityAnalysis>(`/api/market-opportunities/${id}/analysis/latest`)).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};
