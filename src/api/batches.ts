import { api } from "@/api/client";
import type { ApproveBatchResult, Batch, BatchProductImportResult, BatchProductImportRow, Product, SaveBatchInput, SaveProductInput } from "@/types/batches";

export const batchKeys = {
  all: ["batches"] as const,
  products: (id: string) => [...batchKeys.all, id, "products"] as const,
};

export const listBatches = async (): Promise<Batch[]> => (await api.get<Batch[]>("/api/batches")).data;
export const createBatch = async (input: SaveBatchInput): Promise<Batch> => (await api.post<Batch>("/api/batches", input)).data;
export const updateBatch = async ({ batchId, ...input }: SaveBatchInput & { batchId: string }): Promise<Batch> =>
  (await api.put<Batch>(`/api/batches/${batchId}`, input)).data;
export const deleteBatch = async (batchId: string): Promise<void> => {
  await api.delete(`/api/batches/${batchId}`);
};
export const approveBatch = async (batchId: string): Promise<ApproveBatchResult> =>
  (await api.post<ApproveBatchResult>(`/api/batches/${batchId}/approve`)).data;
export const listBatchProducts = async (batchId: string): Promise<Product[]> => (await api.get<Product[]>(`/api/batches/${batchId}/products`)).data;
export const addBatchProduct = async ({ batchId, ...input }: SaveProductInput & { batchId: string }): Promise<Product> =>
  (await api.post<Product>(`/api/batches/${batchId}/products`, input)).data;
export const importBatchProducts = async (batchId: string, products: BatchProductImportRow[]): Promise<BatchProductImportResult> =>
  (await api.post<BatchProductImportResult>(`/api/batches/${batchId}/products/import`, { products })).data;
export const updateBatchProduct = async ({ batchId, productId, ...input }: SaveProductInput & { batchId: string; productId: string }): Promise<Product> =>
  (await api.put<Product>(`/api/batches/${batchId}/products/${productId}`, input)).data;
export const deleteBatchProduct = async ({ batchId, productId }: { batchId: string; productId: string }): Promise<void> => {
  await api.delete(`/api/batches/${batchId}/products/${productId}`);
};
