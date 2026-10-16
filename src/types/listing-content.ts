export type ListingContentTag = {
  value: string;
  type: string | null;
  position: number;
};

export type ListingContentResult = {
  productId: string;
  listingContentId: string;
  title: string;
  description: string;
  tags: ListingContentTag[];
  versionNumber: number;
  model: string;
  createdAt: string | null;
};

export type ListingSeoScoreResult = {
  productId: string;
  listingContentId: string;
  overallScore: number;
  titleScore: number;
  tagsScore: number;
  descriptionScore: number;
  keywordOptimizationScore: number;
  tagRelevanceScore: number;
  keywordDensity: number;
  improvementSuggestions: string[];
  recommendation: "keep" | "review" | "regenerate" | string;
  shouldRegenerate: boolean;
  algorithmVersion: string;
  calculatedAt: string | null;
};

export type ListingSeoFeedback = Pick<ListingSeoScoreResult,
  | "overallScore"
  | "titleScore"
  | "tagsScore"
  | "descriptionScore"
  | "keywordOptimizationScore"
  | "tagRelevanceScore"
  | "keywordDensity"
  | "improvementSuggestions"
  | "recommendation"
  | "shouldRegenerate"
>;
