import { api } from "@/api/client";
import type { BatchProductPrompt, UpdateBatchProductPromptInput } from "@/types/product-prompt";

export const productPromptKeys = {
  all: ["batch-product-prompts"] as const,
  detail: (rowId: string) => [...productPromptKeys.all, rowId] as const,
};

export const getBatchProductPrompt = async (rowId: string, signal?: AbortSignal): Promise<BatchProductPrompt> =>
  (await api.get<BatchProductPrompt>(`/api/batch-job-products/${rowId}/prompt`, { signal })).data;

export const saveBatchProductPrompt = async (rowId: string, input: UpdateBatchProductPromptInput): Promise<BatchProductPrompt> =>
  (await api.put<BatchProductPrompt>(`/api/batch-job-products/${rowId}/prompt`, input)).data;

export const restoreBatchProductPrompt = async (rowId: string): Promise<BatchProductPrompt> =>
  (await api.delete<BatchProductPrompt>(`/api/batch-job-products/${rowId}/prompt`)).data;
