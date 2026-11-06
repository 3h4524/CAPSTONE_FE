import { api } from "@/api/client";
import type { PrintQuad } from "@/helpers/mockup-template";
import { filterParams } from "@/helpers/model-attributes";
import type {
  GarmentMaskPreview,
  MockupTemplate,
  ModelAttributes,
  ModelPhotoFilter,
} from "@/types/mockup-templates";

/** Who manages the model photos: a seller their own, an admin the shared library. */
export type ModelPhotoScope = "seller" | "admin";

const basePath = (scope: ModelPhotoScope) =>
  scope === "admin" ? "/api/admin/model-photos" : "/api/model-photos";

export const modelPhotoKeys = {
  all: ["model-photos"] as const,
  list: (productType?: string, filter?: ModelPhotoFilter) =>
    [...modelPhotoKeys.all, productType ?? "all", filterParams(filter)] as const,
  library: (filter?: ModelPhotoFilter) =>
    [...modelPhotoKeys.all, "library", filterParams(filter)] as const,
};

/** The model photos a seller can use: the shared library and their own, narrowed to who is in them. */
export const listModelPhotos = async (
  productType?: string,
  filter?: ModelPhotoFilter,
  signal?: AbortSignal
): Promise<MockupTemplate[]> =>
  (
    await api.get<MockupTemplate[]>("/api/model-photos", {
      params: { ...(productType ? { productType } : {}), ...filterParams(filter) },
      signal,
    })
  ).data;

/** The shared library, as an admin manages it. */
export const listLibraryModelPhotos = async (
  filter?: ModelPhotoFilter,
  signal?: AbortSignal
): Promise<MockupTemplate[]> =>
  (
    await api.get<MockupTemplate[]>("/api/admin/model-photos", {
      params: filterParams(filter),
      signal,
    })
  ).data;

/** Makes a model photo with AI, charged to the caller's Ideogram key, and keeps it. */
export const generateModelPhoto = async (
  scope: ModelPhotoScope,
  input: { productType: string; attributes: ModelAttributes }
): Promise<MockupTemplate> =>
  (await api.post<MockupTemplate>(`${basePath(scope)}/generate`, input)).data;

/** Finds the person on a photo that is not saved yet; the mask's opacity is the person. */
export const previewModelPhoto = async (
  scope: ModelPhotoScope,
  photo: File,
  signal?: AbortSignal
): Promise<GarmentMaskPreview> => {
  const form = new FormData();
  form.append("photo", photo);
  return (await api.post<GarmentMaskPreview>(`${basePath(scope)}/preview`, form, { signal })).data;
};

export type SaveModelPhotoInput = {
  name: string;
  productType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** A new photo; null keeps the saved one. */
  photo: File | null;
  /** The garment selected on the photo as a PNG; null keeps the saved selection. A new photo needs one or findGarment. */
  garmentSelection: Blob | null;
  /** The server finds the garment on the photo itself (on the saved photo when there is no new one). */
  findGarment: boolean;
  /** Place each design by measuring the shirt, as it sits on its mock-up, instead of in the print area. */
  autoPlacement: boolean;
  /** The print area's corners when they are not a rectangle; the design is warped onto them. */
  printQuad: PrintQuad | null;
  /** Who is in the photo; null keeps what it had. */
  attributes: ModelAttributes | null;
};

const toForm = (input: SaveModelPhotoInput) => {
  const form = new FormData();
  form.append("name", input.name);
  form.append("productType", input.productType);
  form.append("x", String(input.x));
  form.append("y", String(input.y));
  form.append("width", String(input.width));
  form.append("height", String(input.height));
  if (input.photo) form.append("photo", input.photo);
  if (input.garmentSelection)
    form.append("garmentSelection", input.garmentSelection, "garment-selection.png");
  if (input.findGarment) form.append("findGarment", "true");
  form.append("autoPlacement", String(input.autoPlacement));
  if (input.printQuad)
    form.append("printQuad", input.printQuad.flatMap((corner) => [corner.x, corner.y]).join(","));
  if (input.attributes)
    Object.entries(filterParams(input.attributes)).forEach(([key, value]) =>
      form.append(key, value)
    );
  return form;
};

export const createModelPhoto = async (
  scope: ModelPhotoScope,
  input: SaveModelPhotoInput
): Promise<MockupTemplate> => (await api.post<MockupTemplate>(basePath(scope), toForm(input))).data;

export const updateModelPhoto = async (
  scope: ModelPhotoScope,
  id: string,
  input: SaveModelPhotoInput
): Promise<MockupTemplate> =>
  (await api.put<MockupTemplate>(`${basePath(scope)}/${id}`, toForm(input))).data;

export const deleteModelPhoto = async (scope: ModelPhotoScope, id: string) => {
  await api.delete(`${basePath(scope)}/${id}`);
};
