import type {
  ImageEvalMetricDefinition,
  ImageEvalMetricGroup,
  ImageEvalPhase,
} from "@/types/admin-image-quality";

export const IMAGE_EVAL_SIGNIFICANCE_LEVEL = 0.05;

export const IMAGE_EVAL_GROUP_LABELS: Record<ImageEvalMetricGroup, string> = {
  text: "Text",
  layout: "Layout",
  adherence: "Follows the Seller's description",
  quality: "Technical quality",
};

export const IMAGE_EVAL_PHASE_LABELS: Record<ImageEvalPhase, string> = {
  before: "Before",
  after: "After",
  trial: "Dropped trial",
};

export const IMAGE_QUALITY_LIVE_RANGES = [
  { value: "all", label: "All time", days: null },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "30d", label: "Last 30 days", days: 30 },
] as const;

export const IMAGE_EVAL_METRICS: ReadonlyArray<ImageEvalMetricDefinition> = [
  {
    group: "text",
    kind: "rate",
    field: "textOk",
    label: "Text fully correct",
    hint: "Every word present, spelled right, nothing extra. OCR plus a check by eye.",
  },
  {
    group: "text",
    kind: "rate",
    field: "textOkOcr",
    label: "Text correct by OCR alone",
    hint: "PaddleOCR only, no manual fixes.",
  },
  {
    group: "text",
    kind: "mean",
    field: "cer",
    decimals: 2,
    isLowerBetter: true,
    label: "Character error rate (CER)",
    hint: "Edit distance between the text OCR read and the requested phrase, divided by its length.",
  },
  {
    group: "text",
    kind: "rate",
    field: "textClear",
    label: "Lettering not covered",
    hint: "No illustration lies over the letters, checked by eye.",
  },
  {
    group: "layout",
    kind: "rate",
    field: "layoutOk",
    label: "Layout passes all three checks",
    hint: "Not cut at the edge, centred and large enough.",
  },
  {
    group: "layout",
    kind: "rate",
    field: "notCut",
    label: "Not cut at the edge",
    hint: "The artwork stays at least 1.5% of the canvas away from every edge.",
  },
  {
    group: "layout",
    kind: "rate",
    field: "centred",
    label: "Centred",
    hint: "The artwork centre is within 8% of the canvas centre.",
  },
  {
    group: "layout",
    kind: "rate",
    field: "sizeOk",
    label: "Large enough",
    hint: "The longest side of the artwork covers at least 55% of the canvas.",
  },
  {
    group: "adherence",
    kind: "mean",
    field: "clipOverall",
    decimals: 1,
    isLowerBetter: false,
    label: "CLIPScore · whole description",
    hint: "ViT-B/32, 100 × cosine(image, Seller description + phrase). Usually 20–35.",
  },
  {
    group: "adherence",
    kind: "mean",
    field: "clipElements",
    decimals: 1,
    isLowerBetter: false,
    label: "CLIPScore · each object",
    hint: "Mean score of every object the description names.",
  },
  {
    group: "quality",
    kind: "mean",
    field: "musiq",
    decimals: 1,
    isLowerBetter: false,
    label: "MUSIQ",
    hint: "Sharpness, noise and artefacts. Scale 0–100.",
  },
  {
    group: "quality",
    kind: "mean",
    field: "topiqNr",
    decimals: 3,
    isLowerBetter: false,
    label: "TOPIQ",
    hint: "Overall quality. Scale 0–1.",
  },
  {
    group: "quality",
    kind: "mean",
    field: "clipIqaPlus",
    decimals: 3,
    isLowerBetter: false,
    label: "CLIP-IQA+",
    hint: "Quality as CLIP judges it. Scale 0–1.",
  },
  {
    group: "quality",
    kind: "mean",
    field: "liqe",
    decimals: 2,
    isLowerBetter: false,
    label: "LIQE",
    hint: "Overall quality. Scale 1–5.",
  },
  {
    group: "quality",
    kind: "mean",
    field: "laionAes",
    decimals: 2,
    isLowerBetter: false,
    label: "LAION aesthetic",
    hint: "General visual appeal, regardless of the prompt. Scale 1–10.",
  },
];
