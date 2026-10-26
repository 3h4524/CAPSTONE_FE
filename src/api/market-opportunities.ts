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

export const updateSellerOpportunityState = async (
  id: string,
  state: SellerOpportunity["state"],
) => (await api.patch<SellerOpportunity>("/api/market-opportunities/" + id + "/state", { state })).data;

export const analyzeSellerOpportunity = async (id: string) =>
  (await api.post<OpportunityAnalysis>("/api/market-opportunities/" + id + "/analyze")).data;
