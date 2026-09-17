import { api } from "@/api/client";
import type { ApiKeyOverview } from "@/types/api-keys";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  list: (userId: string) => [...apiKeyKeys.all, userId] as const,
};

export const listApiKeys = async (signal?: AbortSignal): Promise<ApiKeyOverview> => {
  const { data } = await api.get<ApiKeyOverview>("/api/api-keys", { signal });
  return data;
};

export interface ApiKeyProvider {
  id: string;
  name: string;
  available: boolean;
  permissions: string[];
}

export interface SaveApiKeyRequest {
  provider: string;
  name: string;
  environment: string | null;
  apiKey: string | null;
  confirmed: boolean;
}

export const listApiKeyProviders = async (signal?: AbortSignal): Promise<ApiKeyProvider[]> =>
  (await api.get<ApiKeyProvider[]>("/api/api-keys/providers", { signal })).data;

export const saveApiKey = async (id: string | undefined, request: SaveApiKeyRequest) => {
  if (id) await api.put(`/api/api-keys/${id}`, request);
  else await api.post("/api/api-keys", request);
};

export const deleteApiKey = async (id: string) => {
  await api.delete(`/api/api-keys/${id}`);
};
export const validateApiKey = async (id: string) => {
  await api.post(`/api/api-keys/${id}/validate`);
};
