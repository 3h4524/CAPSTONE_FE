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

export type SaveMockupTemplateInput = {
  name: string;
  productType: string;
  printAreaConfig: string;
  outputWidthPx: number;
  outputHeightPx: number;
  baseImage: File | null;
  preview: File | null;
  deletePreview?: boolean;
};

const toTemplateForm = (input: SaveMockupTemplateInput) => {
  const form = new FormData();
  form.append("name", input.name);
  form.append("productType", input.productType);
  form.append("printAreaConfig", input.printAreaConfig);
  form.append("outputWidthPx", String(input.outputWidthPx));
  form.append("outputHeightPx", String(input.outputHeightPx));
  if (input.baseImage) form.append("baseImage", input.baseImage);
  if (input.preview) form.append("preview", input.preview);
  if (input.deletePreview) form.append("deletePreview", "true");
  return form;
};

export const createMockupTemplate = async (input: SaveMockupTemplateInput): Promise<MockupTemplate> =>
  (await api.post<MockupTemplate>("/api/mockup-templates", toTemplateForm(input))).data;

export const updateMockupTemplate = async (id: string, input: SaveMockupTemplateInput): Promise<MockupTemplate> =>
  (await api.put<MockupTemplate>(`/api/mockup-templates/${id}`, toTemplateForm(input))).data;

export const deleteMockupTemplate = async (id: string) => {
  await api.delete(`/api/mockup-templates/${id}`);
};
