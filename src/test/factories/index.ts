import type { SessionUser } from "@/stores/auth";
import type { ApiKeyConnection, ApiKeyOverview } from "@/types/api-keys";
import type { AuthenticatedUser } from "@/types/auth";
import type { Batch } from "@/types/batches";
import type { DesignTemplateDetail, DesignTemplateSummary } from "@/types/design-template";
import type { MockupTemplate } from "@/types/mockup-templates";
import type { Profile } from "@/types/profile";
import type { StylePreset } from "@/types/style-presets";
import type { AvailablePlan, SubscriptionOverview } from "@/types/subscription";
import type { PagedResult, SupportTicketSummary } from "@/types/support";
import type { WorkflowDetail, WorkflowEdge, WorkflowNode, WorkflowSummary } from "@/types/workflow";

export const buildAuthenticatedUser = (
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser => ({
  id: "user-1",
  email: "seller@apcs.test",
  fullName: "Nhat Nguyen",
  roles: ["Seller"],
  ...overrides,
});

export const buildSessionUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  ...buildAuthenticatedUser(),
  avatarUrl: null,
  ...overrides,
});

export const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  fullName: "Nhat Nguyen",
  email: "seller@apcs.test",
  avatarUrl: null,
  shopName: "Nhat Prints",
  shopDescription: "Hand-picked designs printed on demand.",
  timezone: "Asia/Ho_Chi_Minh",
  language: "vi",
  themePreference: "system",
  notificationEmailEnabled: true,
  newsletterSubscribed: false,
  twoFactorEnabled: false,
  ...overrides,
});

export const buildDesignTemplateSummary = (
  overrides: Partial<DesignTemplateSummary> = {}
): DesignTemplateSummary => ({
  id: "template-1",
  name: "Vintage Botanical",
  nicheCategory: "botanical",
  artStyle: "watercolor",
  styleDescription: "Soft watercolour washes on warm paper.",
  previewImageUrl: null,
  isSystemTemplate: false,
  usageCount: 0,
  createdAtUtc: "2026-01-05T08:00:00Z",
  updatedAtUtc: "2026-01-05T08:00:00Z",
  canEdit: true,
  canDelete: true,
  canClone: true,
  ...overrides,
});

export const buildDesignTemplate = (
  overrides: Partial<DesignTemplateDetail> = {}
): DesignTemplateDetail => ({
  ...buildDesignTemplateSummary(),
  basePrompt: "A {{product}} illustration in a {{style}} style, clean background.",
  negativePrompt: "blurry, watermark, text",
  examples: [{ subject: "ceramic mug", prompt: "A ceramic mug illustration." }],
  ...overrides,
});

export const buildBatch = (overrides: Partial<Batch> = {}): Batch => ({
  id: "batch-1",
  name: "Spring collection",
  description: "Best sellers for the spring drop.",
  defaultNiche: "botanical",
  defaultProductType: "tshirt",
  status: "active",
  createdAt: "2026-01-10T09:30:00Z",
  productCount: 12,
  ...overrides,
});

export const buildWorkflowNode = (overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
  id: "node-1",
  type: "workflow",
  position: { x: 0, y: 0 },
  data: {
    type: "product-input",
    label: "Product input",
    config: { name: "Mug design" },
    status: "idle",
  },
  ...overrides,
});

export const buildWorkflowEdge = (overrides: Partial<WorkflowEdge> = {}): WorkflowEdge => ({
  id: "edge-1",
  source: "node-1",
  target: "node-2",
  ...overrides,
});

export const buildWorkflowSummary = (
  overrides: Partial<WorkflowSummary> = {}
): WorkflowSummary => ({
  id: "workflow-1",
  name: "Spring drop",
  description: "Designs queued for the spring drop.",
  nodeCount: 4,
  updatedAt: "2026-01-10T09:30:00Z",
  ...overrides,
});

export const buildWorkflowDetail = (overrides: Partial<WorkflowDetail> = {}): WorkflowDetail => ({
  ...buildWorkflowSummary(),
  definition: {
    version: 1,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  createdAt: "2026-01-09T08:00:00Z",
  ...overrides,
});

export const buildStylePreset = (overrides: Partial<StylePreset> = {}): StylePreset => ({
  id: "style-1",
  name: "Vintage Botanical",
  description: "Soft watercolour washes on warm paper.",
  styleModifiers: "watercolour, muted palette",
  previewImageUrl: null,
  recommendations: ["Keep the background light"],
  isSystemTemplate: true,
  isMine: false,
  usageCount: 12,
  ...overrides,
});

export const buildMockupTemplate = (overrides: Partial<MockupTemplate> = {}): MockupTemplate => ({
  id: "mockup-1",
  name: "Ceramic mug",
  productType: "mug",
  baseImageUrl: "https://cdn.apcs.test/mockups/mug-front.png",
  previewImageUrl: null,
  printAreaConfig: '{"x":0.1,"y":0.1}',
  outputWidthPx: 1024,
  outputHeightPx: 1024,
  usageCount: 8,
  isSystemTemplate: true,
  isMine: false,
  ...overrides,
});

export const buildApiKey = (overrides: Partial<ApiKeyConnection> = {}): ApiKeyConnection => ({
  id: "api-key-1",
  provider: "etsy",
  providerCategory: "Marketplace",
  authType: "API Key",
  label: "Etsy production",
  credential: "abcd****wxyz",
  environment: "production",
  status: "Connected",
  lastUsedAtUtc: "2026-01-11T02:15:00Z",
  lastCheckedAtUtc: "2026-01-11T02:15:00Z",
  ...overrides,
});

export const buildApiKeyOverview = (overrides: Partial<ApiKeyOverview> = {}): ApiKeyOverview => {
  const items = overrides.items ?? [buildApiKey()];
  return {
    items,
    connectedCount: items.filter((item) => item.status === "Connected").length,
    needsAttentionCount: items.filter((item) => item.status !== "Connected").length,
    isReady: items.every((item) => item.status === "Connected"),
    lastCheckedAtUtc: "2026-01-11T02:15:00Z",
    ...overrides,
  };
};

export const buildAvailablePlan = (overrides: Partial<AvailablePlan> = {}): AvailablePlan => ({
  planId: "plan-starter",
  name: "Starter",
  tier: "starter",
  description: "For a first print-on-demand shop.",
  monthlyPriceUsd: 19,
  annualPriceUsd: 190,
  isCurrentPlan: true,
  features: [{ featureCode: "batch-processing", isEnabled: true, limitValue: 50 }],
  quotas: {
    imageGenerationQuota: 100,
    videoGenerationQuota: 10,
    apiCallQuota: 500,
    storageQuotaGb: 5,
    maxBatchSize: 50,
    maxProductsPerMonth: 100,
    maxConcurrentJobs: 2,
  },
  ...overrides,
});

export const buildSubscriptionOverview = (
  overrides: Partial<SubscriptionOverview> = {}
): SubscriptionOverview => ({
  currentSubscription: {
    subscriptionId: "sub-1",
    planId: "plan-starter",
    planName: "Starter",
    shortDescription: "For a first print-on-demand shop.",
    status: "active",
    billingCycle: "monthly",
    price: 19,
    startDate: "2026-01-01T00:00:00Z",
    renewalDate: "2026-02-01T00:00:00Z",
    scheduledPlanName: null,
    scheduledPlanEffectiveDate: null,
  },
  usageQuotas: [],
  availablePlans: [buildAvailablePlan()],
  recentInvoices: [],
  hasActivePaidPlan: true,
  ...overrides,
});

export const buildSupportTicket = (
  overrides: Partial<SupportTicketSummary> = {}
): SupportTicketSummary => ({
  id: "ticket-1",
  ticketNumber: "TKT-0001",
  subject: "Etsy connection keeps dropping",
  category: "integration",
  priority: "high",
  status: "open",
  satisfactionRating: null,
  createdAtUtc: "2026-01-12T10:00:00Z",
  updatedAtUtc: "2026-01-12T10:00:00Z",
  ...overrides,
});

export const buildPagedResult = <T>(
  items: T[],
  overrides: Partial<PagedResult<T>> = {}
): PagedResult<T> => ({
  items,
  totalCount: items.length,
  pageNumber: 1,
  pageSize: 20,
  totalPages: items.length > 0 ? 1 : 0,
  ...overrides,
});
