import { api } from "@/api/client";
import type { AdminFeature, UpdateFeatureInput } from "@/types/feature-catalog";

export const adminFeatureKeys = {
  all: ["admin", "features"] as const,
};

export const getAdminFeatures = async (): Promise<AdminFeature[]> => {
  const { data } = await api.get<AdminFeature[]>("/api/admin/features");
  return data;
};

export const updateAdminFeature = async ({
  code,
  input,
}: {
  code: string;
  input: UpdateFeatureInput;
}): Promise<AdminFeature> => {
  const { data } = await api.put<AdminFeature>(`/api/admin/features/${code}`, input);
  return data;
};
