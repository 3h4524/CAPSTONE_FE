import type { StylePreset } from "@/types/style-presets";

export const toRecommendationLines = (recommendations: string[]) => recommendations.join("\n");

export const fromRecommendationLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const sortPresetList = (presets: StylePreset[]) =>
  [...presets].sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name));
