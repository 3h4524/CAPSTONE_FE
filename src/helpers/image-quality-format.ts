import { IMAGE_EVAL_SIGNIFICANCE_LEVEL } from "@/constants/image-quality";
import type { ImageEvalMetricResult, ImageEvalSideValue } from "@/types/admin-image-quality";

export type ImageEvalDeltaTone = "better" | "worse" | "same" | "none";

const EMPTY_VALUE = "–";
const PERCENT = 100;
const SMALLEST_SHOWN_P_VALUE = 0.001;
const SMALL_P_VALUE = 0.01;
const COST_DECIMALS = 3;

export const formatImageQualityNumber = (value: number | null, decimals: number): string =>
  value === null ? EMPTY_VALUE : value.toFixed(decimals);

export const formatImageQualityPercent = (value: number | null): string =>
  value === null ? EMPTY_VALUE : `${Math.round(value * PERCENT)}%`;

export const formatImageEvalValue = (
  result: ImageEvalMetricResult,
  side: ImageEvalSideValue
): string => {
  if (side.value === null) {
    return EMPTY_VALUE;
  }
  return result.definition.kind === "rate"
    ? formatImageQualityPercent(side.value)
    : side.value.toFixed(result.definition.decimals);
};

export const formatImageEvalCount = (side: ImageEvalSideValue): string | null =>
  side.yes === null ? null : `${side.yes}/${side.count}`;

const getRoundedDelta = (result: ImageEvalMetricResult): number | null => {
  if (result.delta === null) {
    return null;
  }
  return result.definition.kind === "rate"
    ? Math.round(result.delta * PERCENT)
    : Number(result.delta.toFixed(result.definition.decimals));
};

export const getImageEvalDeltaTone = (result: ImageEvalMetricResult): ImageEvalDeltaTone => {
  const rounded = getRoundedDelta(result);
  if (rounded === null) {
    return "none";
  }
  if (rounded === 0) {
    return "same";
  }
  const isLowerBetter = result.definition.kind === "mean" && result.definition.isLowerBetter;
  return rounded > 0 !== isLowerBetter ? "better" : "worse";
};

export const formatImageEvalDelta = (result: ImageEvalMetricResult): string => {
  const rounded = getRoundedDelta(result);
  if (rounded === null) {
    return EMPTY_VALUE;
  }
  if (rounded === 0) {
    return "no change";
  }
  const sign = rounded > 0 ? "+" : "−";
  const size = Math.abs(rounded);
  return result.definition.kind === "rate"
    ? `${sign}${size} pts`
    : `${sign}${size.toFixed(result.definition.decimals)}`;
};

export const formatImageEvalPValue = (pValue: number | null): string => {
  if (pValue === null) {
    return "";
  }
  if (pValue < SMALLEST_SHOWN_P_VALUE) {
    return "p < 0.001";
  }
  return `p = ${pValue.toFixed(pValue < SMALL_P_VALUE ? 3 : 2)}`;
};

export const isImageEvalSignificant = (pValue: number | null): boolean =>
  pValue !== null && pValue < IMAGE_EVAL_SIGNIFICANCE_LEVEL;

export const formatImageQualityUsd = (value: number | null): string =>
  value === null ? EMPTY_VALUE : `$${value.toFixed(COST_DECIMALS)}`;

export const formatImageQualitySeconds = (value: number | null): string =>
  value === null ? EMPTY_VALUE : `${value.toFixed(1)} s`;

export const formatImageQualityDate = (value: string | null): string =>
  value === null
    ? "the start"
    : new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
