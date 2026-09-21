import { api } from "@/api/client";
import type { BatchMockupSelection, MockupTemplate } from "@/types/mockup-templates";

export const mockupTemplateKeys = {
  all: ["mockup-templates"] as const,
  list: (productType?: string) => [...mockupTemplateKeys.all, productType ?? "all"] as const,
  selection: (batchJobId: string) => [...mockupTemplateKeys.all, "selection", batchJobId] as const,
};

export const listMockupTemplates = async (productType?: string, signal?: AbortSignal): Promise<MockupTemplate[]> =>
  (await api.get<MockupTemplate[]>("/api/mockup-templates", { params: productType ? { productType } : undefined, signal })).data;

export const getBatchMockupSelection = async (batchJobId: string, signal?: AbortSignal): Promise<BatchMockupSelection> =>
  (await api.get<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { signal })).data;

export const applyBatchMockupTemplates = async (batchJobId: string, templateIds: string[]): Promise<BatchMockupSelection> =>
  (await api.put<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { templateIds })).data;
