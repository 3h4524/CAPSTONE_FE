import { api } from "@/api/client";
import type {
  BatchMockupSelection,
  GarmentMaskPreview,
  GenerateAllMockupsResult,
  MockupArea,
  MockupAreaSource,
  MockupImage,
  MockupOverride,
  MockupTemplate,
  MockupView,
} from "@/types/mockup-templates";

/** Who manages the templates: a seller their own, an admin the shared ones every seller can use. */
export type MockupTemplateScope = "seller" | "admin";

const basePath = (scope: MockupTemplateScope) => (scope === "admin" ? "/api/admin/mockup-templates" : "/api/mockup-templates");

export const mockupTemplateKeys = {
  all: ["mockup-templates"] as const,
  list: (productType?: string) => [...mockupTemplateKeys.all, productType ?? "all"] as const,
  library: () => [...mockupTemplateKeys.all, "library"] as const,
  selection: (batchJobId: string) => [...mockupTemplateKeys.all, "selection", batchJobId] as const,
};

export const listMockupTemplates = async (productType?: string, signal?: AbortSignal): Promise<MockupTemplate[]> =>
  (await api.get<MockupTemplate[]>("/api/mockup-templates", { params: productType ? { productType } : undefined, signal })).data;

/** The shared templates, as an admin manages them. */
export const listSystemMockupTemplates = async (signal?: AbortSignal): Promise<MockupTemplate[]> =>
  (await api.get<MockupTemplate[]>("/api/admin/mockup-templates", { signal })).data;

export const getBatchMockupSelection = async (batchJobId: string, signal?: AbortSignal): Promise<BatchMockupSelection> =>
  (await api.get<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { signal })).data;

export const applyBatchMockupTemplates = async (
  batchJobId: string,
  templateIds: string[],
  garmentColors: string[] = [],
  templateColors: Record<string, string[]> = {},
  templateBackgrounds: Record<string, Record<string, string>> = {},
  areaSources: Record<string, Record<string, MockupAreaSource>> = {}
): Promise<BatchMockupSelection> =>
  (await api.put<BatchMockupSelection>(`/api/batch-jobs/${batchJobId}/mockups`, { templateIds, garmentColors, templateColors, templateBackgrounds, areaSources })).data;

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
  /** The side of the garment the photo shows. */
  view?: MockupView;
  /** Every print area, the main one keyed "main"; x/y/width/height then only repeat the main one. */
  areas?: MockupArea[];
  /** On create: the photo is another side (`view`) of this template and is linked to it in the same save. */
  mainTemplateId?: string;
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
  if (input.view) form.append("view", input.view);
  if (input.areas?.length) {
    form.append(
      "areas",
      JSON.stringify(input.areas.map(({ key, name, x, y, width, height, rotation, source }) => ({ key, name, x, y, width, height, rotation, source })))
    );
  }
  if (input.mainTemplateId) form.append("mainTemplateId", input.mainTemplateId);
  return form;
};

export const createMockupTemplate = async (input: SaveMockupTemplateInput, scope: MockupTemplateScope = "seller"): Promise<MockupTemplate> =>
  (await api.post<MockupTemplate>(basePath(scope), toTemplateForm(input))).data;

export const updateMockupTemplate = async (id: string, input: SaveMockupTemplateInput, scope: MockupTemplateScope = "seller"): Promise<MockupTemplate> =>
  (await api.put<MockupTemplate>(`${basePath(scope)}/${id}`, toTemplateForm(input))).data;

// Gives a template the photo of another side, a template of the same owner; null takes the side off (and removes it).
export const setMockupTemplateView = async (
  id: string,
  view: MockupView,
  templateId: string | null,
  scope: MockupTemplateScope = "seller"
): Promise<MockupTemplate> => (await api.put<MockupTemplate>(`${basePath(scope)}/${id}/views/${view}`, { templateId })).data;

export const deleteMockupTemplate = async (id: string, scope: MockupTemplateScope = "seller") => {
  await api.delete(`${basePath(scope)}/${id}`);
};

export type GenerateMockupImageInput = {
  mockupTemplateId: string;
  // Advanced mode: all four or none — quick mode falls back to the template's own print area.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  garmentColor?: string;
  /** The template's print areas as set for this mock-up; takes the place of x/y/width/height. */
  areas?: MockupArea[];
};

export const generateMockupImage = async (designImageId: string, input: GenerateMockupImageInput): Promise<MockupImage> =>
  (await api.post<MockupImage>(`/api/design-images/${designImageId}/mockups`, input)).data;

// The mock-ups the job already has for its selected templates. Makes none, so it is safe when a page opens.
export const getBatchJobMockups = async (batchJobId: string): Promise<GenerateAllMockupsResult> =>
  (await api.get<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/images`)).data;

export const generateAllBatchMockups = async (batchJobId: string): Promise<GenerateAllMockupsResult> =>
  (await api.post<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/generate`)).data;

// Makes one of the job's mock-ups its own way; the answer is the job's mock-ups made again.
export const saveMockupOverride = async (
  batchJobId: string,
  input: { slotKey: string; override: MockupOverride; replacedMockupImageId?: string | null }
): Promise<GenerateAllMockupsResult> =>
  (await api.put<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/overrides`, input)).data;

// Makes several of the job's mock-ups their own way in one save, all or none; the answer is the job's mock-ups made once.
export const saveMockupOverrides = async (
  batchJobId: string,
  overrides: { slotKey: string; override: MockupOverride; replacedMockupImageId?: string | null }[]
): Promise<GenerateAllMockupsResult> =>
  (await api.put<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/overrides/bulk`, { overrides })).data;

// Puts one of the job's mock-ups back on the job's settings, or back at all when it was removed.
export const resetMockupOverride = async (batchJobId: string, slotKey: string, replacedMockupImageId?: string | null): Promise<GenerateAllMockupsResult> =>
  (
    await api.delete<GenerateAllMockupsResult>(`/api/batch-jobs/${batchJobId}/mockups/overrides/${encodeURIComponent(slotKey)}`, {
      params: replacedMockupImageId ? { replacedMockupImageId } : undefined,
    })
  ).data;

// Analyzes a base photo that is not saved yet, so its recolor can be previewed straight away.
export const previewGarmentMask = async (baseImage: File, signal?: AbortSignal, scope: MockupTemplateScope = "seller"): Promise<GarmentMaskPreview> => {
  const form = new FormData();
  form.append("baseImage", baseImage);
  return (await api.post<GarmentMaskPreview>(`${basePath(scope)}/garment-mask-preview`, form, { signal })).data;
};
