import { api } from "@/api/client";
import type { BatchMockupSelection, GarmentMaskPreview, GenerateAllMockupsResult, MockupImage, MockupTemplate } from "@/types/mockup-templates";

export const mockupTemplateKeys = {
  all: ["mockup-templates"] as const,
  list: (productType?: string) => [...mockupTemplateKeys.all, productType ?? "all"] as const,
  selection: (batchJobId: string) => [...mockupTemplateKeys.all, "selection", batchJobId] as const,
};

export const listMockupTemplates = async (productType?: string, signal?: AbortSignal): Promise<MockupTemplate[]> =>
  (await api.get<MockupTemplate[]>("/api/mockup-templates", { params: productType ? { productType } : undefined, signal })).data;

export const getBatchMockupSelection = async (batchJobId: string, signal?: AbortSignal): Promise<BatchMockupSelection> =>
  (await api.get<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { signal })).data;

export const applyBatchMockupTemplates = async (
  batchJobId: string,
  templateIds: string[],
  garmentColors: string[] = [],
  templateColors: Record<string, string[]> = {}
): Promise<BatchMockupSelection> =>
  (await api.put<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { templateIds, garmentColors, templateColors })).data;

export type SaveMockupTemplateInput = {
  name: string;
  productType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  baseImage: File | null;
  allowRecolor: boolean;
  garmentColor: string | null;
};

const toTemplateForm = (input: SaveMockupTemplateInput) => {
  const form = new FormData();
  form.append("name", input.name);
  form.append("productType", input.productType);
  form.append("x", String(input.x));
  form.append("y", String(input.y));
  form.append("width", String(input.width));
  form.append("height", String(input.height));
  if (input.baseImage) form.append("baseImage", input.baseImage);
  form.append("allowRecolor", String(input.allowRecolor));
  if (input.garmentColor) form.append("garmentColor", input.garmentColor);
  return form;
};

export const createMockupTemplate = async (input: SaveMockupTemplateInput): Promise<MockupTemplate> =>
  (await api.post<MockupTemplate>("/api/mockup-templates", toTemplateForm(input))).data;

export const updateMockupTemplate = async (id: string, input: SaveMockupTemplateInput): Promise<MockupTemplate> =>
  (await api.put<MockupTemplate>(`/api/mockup-templates/${id}`, toTemplateForm(input))).data;

export const deleteMockupTemplate = async (id: string) => {
  await api.delete(`/api/mockup-templates/${id}`);
};

export type GenerateMockupImageInput = {
  mockupTemplateId: string;
  // Advanced mode: all four or none — quick mode falls back to the template's own print area.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  garmentColor?: string;
};

export const generateMockupImage = async (designImageId: string, input: GenerateMockupImageInput): Promise<MockupImage> =>
  (await api.post<MockupImage>(`/api/design-images/${designImageId}/mockups`, input)).data;

// The mock-ups the job already has for its selected templates. Makes none, so it is safe when a page opens.
export const getBatchJobMockups = async (batchJobId: string): Promise<GenerateAllMockupsResult> =>
  (await api.get<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/images`)).data;

export const generateAllBatchMockups = async (batchJobId: string): Promise<GenerateAllMockupsResult> =>
  (await api.post<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/generate`)).data;

// Analyzes a base photo that is not saved yet, so its recolor can be previewed straight away.
export const previewGarmentMask = async (baseImage: File, signal?: AbortSignal): Promise<GarmentMaskPreview> => {
  const form = new FormData();
  form.append("baseImage", baseImage);
  return (await api.post<GarmentMaskPreview>("/api/mockup-templates/garment-mask-preview", form, { signal })).data;
};
