import { api } from "@/api/client";
import type { StylePreset } from "@/types/style-presets";

export const stylePresetKeys = {
  all: ["style-art-presets"] as const,
  list: () => [...stylePresetKeys.all, "list"] as const,
};

export const listStyleArtPresets = async (signal?: AbortSignal): Promise<StylePreset[]> =>
  (await api.get<StylePreset[]>("/api/style-art-presets", { signal })).data;
