import { api } from "@/api/client";

export type ShopConnectionStatus = "not_connected" | "connected" | "reconnect_required" | "unavailable";

export type ShopDetails = {
  shopId: string;
  shopName: string;
  title: string | null;
  url: string | null;
  iconUrl: string | null;
  currencyCode: string | null;
  activeListingCount: number | null;
  digitalListingCount: number | null;
  favorerCount: number | null;
  soldCount: number | null;
  reviewAverage: number | null;
  reviewCount: number | null;
  isOnVacation: boolean | null;
  openedAtUtc: string | null;
};

export type MyShop = {
  status: ShopConnectionStatus;
  etsyConfigured: boolean;
  shop: ShopDetails | null;
  connectedAtUtc: string | null;
  lastSyncAtUtc: string | null;
  reconnectByUtc: string | null;
};

/** Outcomes the backend appends as `?etsy=` when Etsy sends the seller back. */
export type EtsyConnectionOutcome = "connected" | "denied" | "expired" | "no_shop" | "failed";

export const getMyShop = async () => (await api.get<MyShop>("/api/shop")).data;

/** Returns Etsy's consent page; the caller navigates the browser there. */
export const startEtsyConnection = async () =>
  (await api.post<{ authorizationUrl: string }>("/api/shop/etsy/connect")).data;

export type ShopHealthCheck = { code: string; passed: boolean; title: string; detail: string };

export type ListingIssue = "low_stock" | "expiring" | "few_tags" | "few_photos" | "viewed_not_favorited";

export type ShopListingRow = {
  listingId: string;
  title: string;
  url: string | null;
  imageUrl: string | null;
  state: string;
  price: number | null;
  currency: string | null;
  quantity: number;
  views: number;
  favorites: number;
  tagCount: number;
  imageCount: number;
  tags: string[];
  updatedAtUtc: string | null;
  endingAtUtc: string | null;
  issues: ListingIssue[];
};

export type ListingInsights = {
  countsByState: Record<string, number>;
  recent: ShopListingRow[];
  issues: { checked: number; lowStock: number; expiring: number; fewTags: number; fewPhotos: number; viewedNotFavorited: number };
};

export type OrderInsights = {
  windowDays: number;
  orders: number;
  previousOrders: number;
  revenue: number;
  previousRevenue: number;
  itemsSold: number;
  averageOrderValue: number | null;
  daily: { day: string; orders: number; revenue: number }[];
  awaitingShipment: number;
  lateShipments: number;
  averageFulfillmentHours: number | null;
  fulfillmentSampleSize: number;
  topListings: { listingId: string | null; title: string; units: number; revenue: number }[];
  topCountries: { countryIso: string; orders: number }[];
  refunded: number;
  refundedOrders: number;
  fees: number | null;
  net: number | null;
  feeSampleOrders: number;
  truncated: boolean;
};

export type ReviewInsights = {
  average: number | null;
  sampled: number;
  distribution: Record<string, number>;
  recent: { rating: number; text: string | null; listingId: string | null; createdAtUtc: string | null }[];
};

export type ShopInsights = {
  status: ShopConnectionStatus;
  generatedAtUtc: string;
  currency: string | null;
  health: ShopHealthCheck[];
  listings: ListingInsights | null;
  orders: OrderInsights | null;
  reviews: ReviewInsights | null;
  unavailableSections: string[];
};

/** Cached a few minutes on the server; `refresh` reads Etsy again. */
export const getShopInsights = async (refresh = false) =>
  (await api.get<ShopInsights>("/api/shop/insights", { params: refresh ? { refresh: true } : undefined })).data;

export type EtsyOption = { id: number; label: string };

export type EtsyListingSettings = {
  price: number | null;
  quantity: number;
  taxonomyId: number | null;
  taxonomyPath: string | null;
  type: "physical" | "download";
  whoMade: "i_did" | "someone_else" | "collective";
  whenMade: string;
  shippingProfileId: number | null;
  readinessStateId: number | null;
  productionPartnerIds: number[];
};

/** An approved design of a product: the file a digital listing delivers, or the artwork Printify prints. */
export type ShopDesign = { id: string; previewUrl: string; width: number; height: number; fileFormat: string; fileSizeMb: number; isFinal: boolean };

export type EtsyDraft = {
  productId: string;
  productName: string;
  connectionStatus: ShopConnectionStatus;
  shopName: string | null;
  currency: string | null;
  title: string;
  description: string;
  tags: string[];
  warnings: string[];
  mockups: { id: string; previewUrl: string; width: number; height: number }[];
  video: { id: string; durationSeconds: number; thumbnailUrl: string | null } | null;
  defaults: EtsyListingSettings;
  shippingProfiles: EtsyOption[];
  processingProfiles: EtsyOption[];
  productionPartners: EtsyOption[];
  history: { status: string; listingId: string | null; editUrl: string | null; attemptedAtUtc: string; error: string | null }[];
  designs: ShopDesign[];
};

export type PublishEtsyDraftRequest = {
  title: string;
  description: string;
  tags: string[];
  price: number;
  quantity: number;
  taxonomyId: number;
  taxonomyPath: string | null;
  type: "physical" | "download";
  whoMade: string;
  whenMade: string;
  shippingProfileId: number | null;
  readinessStateId: number | null;
  productionPartnerIds: number[];
  mockupIds: string[];
  includeVideo: boolean;
  /** For a digital listing: the design files the buyer downloads. */
  designIds?: string[];
};

export type PublishEtsyDraftResult = {
  listingId: string;
  editUrl: string;
  imagesUploaded: number;
  videoUploaded: boolean;
  alreadyPublished: boolean;
  warnings: string[];
  filesUploaded: number;
};

export const getEtsyDraft = async (productId: string) => (await api.get<EtsyDraft>(`/api/shop/etsy/drafts/${productId}`)).data;

export const searchEtsyTaxonomy = async (query: string) =>
  (await api.get<{ id: number; path: string }[]>("/api/shop/etsy/taxonomy", { params: { q: query } })).data;

/** Creates a draft listing on Etsy; can take a minute when a video is attached. */
export const publishEtsyDraft = async (productId: string, request: PublishEtsyDraftRequest) =>
  (await api.post<PublishEtsyDraftResult>(`/api/shop/etsy/drafts/${productId}`, request, { timeout: 5 * 60_000 })).data;

export const disconnectEtsy = async () => {
  await api.delete("/api/shop/etsy");
};
