import { api } from "@/api/client";
import type {
  AddSystemApiKeyInput,
  AdminSystemApiKeys,
  SystemApiKeyProviderName,
  UpdateSystemApiKeyInput,
  UpdateSystemApiKeyProviderInput,
} from "@/types/admin-system-api-keys";

export const adminSystemApiKeyKeys = {
  all: ["admin", "system-api-keys"] as const,
  page: () => [...adminSystemApiKeyKeys.all, "page"] as const,
};

const base = "/api/admin/system-api-keys";

// Every call answers with the whole page, so the list is replaced rather than fetched again.
export const getAdminSystemApiKeys = async (signal?: AbortSignal): Promise<AdminSystemApiKeys> =>
  (await api.get<AdminSystemApiKeys>(base, { signal })).data;

export const addSystemApiKey = async (input: AddSystemApiKeyInput): Promise<AdminSystemApiKeys> =>
  (await api.post<AdminSystemApiKeys>(`${base}/keys`, input)).data;

export const updateSystemApiKey = async ({ id, input }: { id: string; input: UpdateSystemApiKeyInput }): Promise<AdminSystemApiKeys> =>
  (await api.put<AdminSystemApiKeys>(`${base}/keys/${id}`, input)).data;

export const deleteSystemApiKey = async (id: string): Promise<AdminSystemApiKeys> =>
  (await api.delete<AdminSystemApiKeys>(`${base}/keys/${id}`)).data;

export const checkSystemApiKey = async (id: string): Promise<AdminSystemApiKeys> =>
  (await api.post<AdminSystemApiKeys>(`${base}/keys/${id}/check`)).data;

export const clearSystemApiKeyRefusal = async (id: string): Promise<AdminSystemApiKeys> =>
  (await api.post<AdminSystemApiKeys>(`${base}/keys/${id}/clear-refused`)).data;

export const updateSystemApiKeyProvider = async ({
  provider,
  input,
}: {
  provider: SystemApiKeyProviderName;
  input: UpdateSystemApiKeyProviderInput;
}): Promise<AdminSystemApiKeys> => (await api.put<AdminSystemApiKeys>(`${base}/providers/${provider}`, input)).data;

export const reorderSystemApiKeys = async ({
  provider,
  keyIds,
}: {
  provider: SystemApiKeyProviderName;
  keyIds: string[];
}): Promise<AdminSystemApiKeys> => (await api.put<AdminSystemApiKeys>(`${base}/providers/${provider}/order`, { keyIds })).data;
