import { api } from "@/api/client";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

export const adminStyleArtPresetKeys = {
  all: ["admin", "style-art-presets"] as const,
  list: () => [...adminStyleArtPresetKeys.all, "list"] as const,
};

export const getAdminStyleArtPresets = async (signal?: AbortSignal): Promise<AdminStyleArtPreset[]> =>
  (await api.get<AdminStyleArtPreset[]>("/api/admin/style-art-presets", { signal })).data;

export type SaveAdminStyleArtPresetInput = {
  name: string;
  description: string;
  styleModifiers: string;
  recommendations: string[];
  preview: File | null;
  deletePreview?: boolean;
  isActive: boolean;
  vi: {
    name: string;
    description: string;
    recommendations: string[];
  } | null;
};

const toPresetForm = (input: SaveAdminStyleArtPresetInput) => {
  const form = new FormData();
  form.append("name", input.name);
  form.append("description", input.description);
  form.append("styleModifiers", input.styleModifiers);
  form.append("recommendationsJson", JSON.stringify(input.recommendations));
  form.append("isActive", String(input.isActive));
  if (input.preview) form.append("preview", input.preview);
  if (input.deletePreview) form.append("deletePreview", "true");
  if (input.vi) {
    form.append("viName", input.vi.name);
    form.append("viDescription", input.vi.description);
    form.append("viRecommendationsJson", JSON.stringify(input.vi.recommendations));
  }
  return form;
};

export const createAdminStyleArtPreset = async (input: SaveAdminStyleArtPresetInput): Promise<AdminStyleArtPreset> =>
  (await api.post<AdminStyleArtPreset>("/api/admin/style-art-presets", toPresetForm(input))).data;

export const updateAdminStyleArtPreset = async (id: string, input: SaveAdminStyleArtPresetInput): Promise<AdminStyleArtPreset> =>
  (await api.put<AdminStyleArtPreset>(`/api/admin/style-art-presets/${id}`, toPresetForm(input))).data;

export const deleteAdminStyleArtPreset = async (id: string) => {
  await api.delete(`/api/admin/style-art-presets/${id}`);
};
