import { api } from "@/api/client";
import type { StylePreset } from "@/types/style-presets";

export const stylePresetKeys = {
  all: ["style-art-presets"] as const,
  list: () => [...stylePresetKeys.all, "list"] as const,
};

export const listStyleArtPresets = async (signal?: AbortSignal): Promise<StylePreset[]> =>
  (await api.get<StylePreset[]>("/api/style-art-presets", { signal })).data;

export type SaveStylePresetInput = {
  name: string;
  description: string;
  styleModifiers: string;
  recommendations: string[];
  preview: File | null;
  deletePreview?: boolean;
};

const toPresetForm = (input: SaveStylePresetInput) => {
  const form = new FormData();
  form.append("name", input.name);
  form.append("description", input.description);
  form.append("styleModifiers", input.styleModifiers);
  form.append("recommendationsJson", JSON.stringify(input.recommendations));
  if (input.preview) form.append("preview", input.preview);
  if (input.deletePreview) form.append("deletePreview", "true");
  return form;
};

export const createStylePreset = async (input: SaveStylePresetInput): Promise<StylePreset> =>
  (await api.post<StylePreset>("/api/style-art-presets", toPresetForm(input))).data;

export const updateStylePreset = async (id: string, input: SaveStylePresetInput): Promise<StylePreset> =>
  (await api.put<StylePreset>(`/api/style-art-presets/${id}`, toPresetForm(input))).data;

export const deleteStylePreset = async (id: string) => {
  await api.delete(`/api/style-art-presets/${id}`);
};
