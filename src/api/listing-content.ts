import { api } from "@/api/client";
import type { ListingContentResult, ListingSeoFeedback, ListingSeoScoreResult } from "@/types/listing-content";

export const generateListingContent = async (productId: string, seoFeedback?: ListingSeoFeedback) =>
  (await api.post<ListingContentResult>(`/api/products/${productId}/listing-content/generate`, seoFeedback ?? null)).data;

export const getListingContent = async (productId: string) =>
  (await api.get<ListingContentResult>(`/api/products/${productId}/listing-content`)).data;

export const evaluateListingSeo = async (productId: string) =>
  (await api.post<ListingSeoScoreResult>(`/api/products/${productId}/listing-content/seo-score`)).data;
