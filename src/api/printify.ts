import { api } from "@/api/client";
import type { ShopDesign } from "@/api/shop";

/** `not_connected`: no Printify key on API Keys; `key_invalid`: the key is disabled, expired or refused. */
export type PrintifyConnectionStatus = "not_connected" | "connected" | "key_invalid" | "no_store" | "unavailable";

export type PrintifyConnection = {
  status: PrintifyConnectionStatus;
  shopId: number | null;
  shopTitle: string | null;
  /** `etsy` when the Printify store publishes to (and fulfils orders from) Etsy. */
  salesChannel: string | null;
  /** The key's name on the API Keys page. */
  keyName: string | null;
  keyCheckedAtUtc: string | null;
  productsCreated: number;
};
export type PrintifyBlueprint = { id: number; title: string; brand: string; model: string; imageUrl: string | null };
export type PrintifyProvider = { id: number; title: string; country: string | null; region: string | null };
export type PrintifyVariantOption = { id: number; title: string; color: string | null; size: string | null };

export type PrintifyCatalog = {
  blueprintId: number;
  providerId: number;
  variants: PrintifyVariantOption[];
  colors: string[];
  sizes: string[];
  positions: string[];
  usShippingFirstItem: number | null;
  usShippingAdditionalItem: number | null;
  /** Each print area (`front`, `back`…) and its size in pixels; absent from servers older than this field. */
  printAreas?: PrintifyPrintArea[];
};

export type PrintifyPrintArea = { position: string; width: number; height: number };

export type PrintifyStage = "created" | "publishing" | "published" | "failed";

export type PrintifyDraft = {
  productId: string;
  productName: string;
  connection: PrintifyConnection;
  title: string;
  description: string;
  tags: string[];
  warnings: string[];
  designs: ShopDesign[];
  // aiMade: made or edited with AI; a physical listing needs a photo besides such ones.
  mockups: { id: string; previewUrl: string; width: number; height: number; aiMade?: boolean }[];
  video: { id: string; durationSeconds: number; thumbnailUrl: string | null } | null;
  defaults: {
    blueprintId: number | null;
    blueprintTitle: string | null;
    printProviderId: number | null;
    printProviderTitle: string | null;
    colors: string[];
    sizes: string[];
    price: number;
  };
  history: { printifyProductId: string | null; state: PrintifyStage; etsyListingId: string | null; etsyUrl: string | null; attemptedAtUtc: string; error: string | null }[];
  etsyConnected: boolean;
};

export type PrintifyProductVariant = { id: number; title: string; cost: number; price: number; isEnabled: boolean; estimatedFees: number; estimatedProfit: number };

export type PrintifyProduct = {
  productId: string;
  printifyProductId: string;
  title: string;
  state: Exclude<PrintifyStage, "failed">;
  etsyListingId: string | null;
  etsyUrl: string | null;
  variants: PrintifyProductVariant[];
  usShippingFirstItem: number | null;
  alreadyCreated: boolean;
  mediaAttached: number;
  warnings: string[];
};

export type CreatePrintifyProductRequest = {
  designId: string;
  blueprintId: number;
  blueprintTitle: string | null;
  printProviderId: number;
  printProviderTitle: string | null;
  variantIds: number[];
  title: string;
  description: string;
  tags: string[];
  price: number;
  scale?: number;
  position?: string | null;
};

const base = "/api/shop/printify";

/** The Printify key itself is managed on the API Keys page; `refresh` asks Printify again instead of the remembered store. */
export const getPrintifyConnection = async (refresh = false) =>
  (await api.get<PrintifyConnection>(base, { params: refresh ? { refresh: true } : undefined })).data;

export const searchPrintifyBlueprints = async (query: string) =>
  (await api.get<PrintifyBlueprint[]>(`${base}/blueprints`, { params: { q: query } })).data;

export const getPrintifyProviders = async (blueprintId: number) =>
  (await api.get<PrintifyProvider[]>(`${base}/blueprints/${blueprintId}/providers`)).data;

export const getPrintifyCatalog = async (blueprintId: number, providerId: number) =>
  (await api.get<PrintifyCatalog>(`${base}/blueprints/${blueprintId}/providers/${providerId}`)).data;

export const getPrintifyDraft = async (productId: string) => (await api.get<PrintifyDraft>(`${base}/drafts/${productId}`)).data;

/** Creates the product on Printify only; the answer carries Printify's cost of each variant. */
export const createPrintifyProduct = async (productId: string, request: CreatePrintifyProductRequest) =>
  (await api.post<PrintifyProduct>(`${base}/drafts/${productId}`, request, { timeout: 2 * 60_000 })).data;

export const publishPrintifyProduct = async (productId: string, printifyProductId: string, prices: { variantId: number; price: number }[]) =>
  (await api.post<PrintifyProduct>(`${base}/drafts/${productId}/products/${printifyProductId}/publish`, { prices })).data;

/** Reads publishing progress; once the Etsy listing exists, adds these APCS media to it (once). */
export const syncPrintifyProduct = async (productId: string, printifyProductId: string, media: { mockupIds: string[]; includeVideo: boolean }) =>
  (await api.post<PrintifyProduct>(`${base}/drafts/${productId}/products/${printifyProductId}/sync`, media, { timeout: 5 * 60_000 })).data;
