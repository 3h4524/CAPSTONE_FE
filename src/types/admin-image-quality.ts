export type ImageQualityProvider = "gemini" | "ideogram";

export type ImageEvalPhase = "before" | "after" | "trial";

export interface ImageEvalVersion {
  key: string;
  label: string;
  provider: ImageQualityProvider;
  phase: ImageEvalPhase;
  order: number;
  imageCount: number;
}

export interface ImageEvalImage {
  id: string;
  version: string;
  product: string;
  productType: string | null;
  expectedText: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  ocrText: string;
  textOk: boolean | null;
  textOkOcr: boolean | null;
  textClear: boolean | null;
  note: string;
  cer: number | null;
  layoutOk: boolean | null;
  notCut: boolean | null;
  centred: boolean | null;
  sizeOk: boolean | null;
  musiq: number | null;
  topiqNr: number | null;
  clipIqaPlus: number | null;
  liqe: number | null;
  laionAes: number | null;
  clipOverall: number | null;
  clipElements: number | null;
}

export interface ImageEvalRunSummary {
  id: string;
  name: string;
  notes: string | null;
  createdAtUtc: string;
  uploadedBy: string | null;
  imageCount: number;
  productCount: number;
  versions: ImageEvalVersion[];
}

export interface ImageEvalRunDetail extends ImageEvalRunSummary {
  images: ImageEvalImage[];
}

export type ImageEvalBooleanField =
  | "textOk"
  | "textOkOcr"
  | "textClear"
  | "layoutOk"
  | "notCut"
  | "centred"
  | "sizeOk";

export type ImageEvalNumberField =
  | "cer"
  | "clipOverall"
  | "clipElements"
  | "musiq"
  | "topiqNr"
  | "clipIqaPlus"
  | "liqe"
  | "laionAes";

export type ImageEvalMetricGroup = "text" | "layout" | "adherence" | "quality";

export type ImageEvalMetricDefinition = {
  group: ImageEvalMetricGroup;
  label: string;
  hint: string;
} & (
  | { kind: "rate"; field: ImageEvalBooleanField }
  | {
      kind: "mean";
      field: ImageEvalNumberField;
      decimals: number;
      isLowerBetter: boolean;
    }
);

export interface ImageEvalSelection {
  before: string[];
  after: string[];
  isSameProductsOnly: boolean;
  isNewestPerProduct: boolean;
}

export interface ImageEvalSideValue {
  value: number | null;
  yes: number | null;
  count: number;
}

export interface ImageEvalMetricResult {
  definition: ImageEvalMetricDefinition;
  before: ImageEvalSideValue;
  after: ImageEvalSideValue;
  delta: number | null;
  pValue: number | null;
}

export interface ImageEvalMetricGroupRows {
  group: ImageEvalMetricGroup;
  label: string;
  metrics: ImageEvalMetricResult[];
}

export interface ImageEvalComparison {
  products: string[];
  beforeImages: ImageEvalImage[];
  afterImages: ImageEvalImage[];
  metrics: ImageEvalMetricResult[];
}

export interface ImageEvalPreset {
  key: string;
  label: string;
  selection: ImageEvalSelection;
}

export interface ImageEvalProductLanes {
  product: string;
  expectedText: string | null;
  before: ImageEvalImage[];
  after: ImageEvalImage[];
}

export interface ImageEvalVersionStats {
  version: ImageEvalVersion;
  letteredCount: number;
  textOk: number | null;
  textClear: number | null;
  layoutOk: number | null;
  clipOverall: number | null;
  musiq: number | null;
}

export interface ImageQualityLiveFilter {
  fromUtc?: string;
  toUtc?: string;
}

export interface ImageQualityLiveVersion {
  key: string;
  label: string;
  provider: ImageQualityProvider;
  sinceUtc: string | null;
  untilUtc: string | null;
  images: number;
  labeledImages: number;
  products: number;
  jobs: number;
  reviewedImages: number;
  approvedImages: number;
  rejectedImages: number;
  approvalRate: number | null;
  regenerateRequests: number;
  regenerateRate: number | null;
  failedAttempts: number;
  blockedAttempts: number;
  failureRate: number | null;
  averageGenerationSeconds: number | null;
  averageCostUsd: number | null;
  totalCostUsd: number;
  /** Images whose text the OCR check read when they were made. */
  textCheckedImages?: number;
  /** Checked images whose text was exactly the phrase, with no other words. */
  textOkImages?: number;
  textOkRate?: number | null;
  /** Mean character error rate of the checked images that print a phrase. */
  averageCharacterErrorRate?: number | null;
}

export type ImageQualityLiveRange = "all" | "90d" | "30d";

export interface ImageQualityLiveCard {
  label: string;
  value: string;
  baseline: string | null;
  note: string;
}

export interface ImageQualityLiveHighlights {
  current: ImageQualityLiveVersion;
  baseline: ImageQualityLiveVersion | null;
  cards: ImageQualityLiveCard[];
}

export interface ImageQualityLiveStats {
  generatedAtUtc: string;
  versions: ImageQualityLiveVersion[];
}
