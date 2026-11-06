import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { expect, type Page, type Route, test } from "@playwright/test";

const PHONE = { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true };
const SMALL_PHONE = { ...PHONE, viewport: { width: 320, height: 568 } };

const workflowId = "b6b8e5f2-9c68-4d31-b8ab-26f56ef03323";
const workflow = {
  id: workflowId,
  name: "Phone workflow",
  description: "",
  nodeCount: DEFAULT_WORKFLOW_DEFINITION.nodes.length,
  revision: 1,
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
  definition: structuredClone(DEFAULT_WORKFLOW_DEFINITION),
};

const product = (index: number, status = "pending") => ({
  id: `product-${index}`,
  batchId: "batch-1",
  name: `Retro Surf ${index}`,
  productType: "tshirt",
  niche: "Surfers and beach lovers",
  keywords: ["surf", "sunset", "waves"],
  productDescription: "A retro sunset over rolling waves.",
  sourceNotes: null,
  status,
  createdAt: "2026-11-01T00:00:00Z",
});

const batch = (id: string, name: string, productCount: number) => ({
  id,
  name,
  description: null,
  defaultNiche: "hiking and camping",
  defaultProductType: null,
  status: "draft",
  createdAt: "2026-11-01T00:00:00Z",
  productCount,
});

const preset = (id: string, name: string, isSystemTemplate: boolean) => ({
  id,
  name,
  description: "A short description of this style.",
  styleModifiers: "bold",
  previewImageUrl: null,
  recommendations: [],
  isSystemTemplate,
  isMine: !isSystemTemplate,
  usageCount: 3,
});

const template = (index: number) => ({
  id: `template-${index}`,
  name: `Blooms ${index}`,
  nicheCategory: "Gifts",
  artStyle: "watercolor",
  styleDescription: "Gift-ready floral structures.",
  previewImageUrl: null,
  isSystemTemplate: true,
  usageCount: 0,
  createdAtUtc: "2026-09-22T00:00:00Z",
  updatedAtUtc: "2026-09-22T00:00:00Z",
  canEdit: false,
  canDelete: false,
  canClone: true,
});

const designTemplates = (url: URL) => {
  const pageSize = Number(url.searchParams.get("pageSize") ?? 12);
  const pageNumber = Number(url.searchParams.get("pageNumber") ?? 1);
  const all = Array.from({ length: 60 }, (_, index) => template(index));
  return { items: all.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), totalCount: all.length, pageNumber, pageSize, totalPages: Math.ceil(all.length / pageSize) };
};

const researchProfile = (profileVersion: number) => ({
  userId: "user-1",
  shopGoal: "Find profitable niches",
  targetAudiences: [],
  preferredCategories: [],
  excludedCategories: [],
  preferredKeywords: [],
  minimumPrice: null,
  maximumPrice: null,
  profileVersion,
  updatedAt: "2026-11-01T00:00:00Z",
});

const opportunity = {
  id: "opportunity-1",
  opportunityId: "signal-1",
  platform: "etsy",
  title: "Personalized walnut cutting boards for first-time homeowners",
  niche: "home decor",
  category: "Home & Living",
  summary: "Search demand is rising while strong listings stay low.",
  marketOpportunityScore: 82,
  confidence: 0.71,
  sellerFitScore: 64,
  finalScore: 78,
  rank: 1,
  state: "new",
  fitExplanation: "Matches your preferred category.",
  fitBreakdown: {},
  lastEvaluatedAt: "2026-11-01T00:00:00Z",
};

const billingPlan = (planId: string, name: string, monthlyPriceVnd: number, isRecommended = false) => ({
  planId,
  name,
  tier: planId,
  description: "",
  monthlyPriceUsd: monthlyPriceVnd / 25000,
  annualPriceUsd: null,
  monthlyPriceVnd,
  annualPriceVnd: null,
  isCurrentPlan: false,
  isRecommended,
  features: [],
  quotas: { imageGenerationQuota: 0, videoGenerationQuota: 0, apiCallQuota: 0, storageQuotaGb: 0, maxBatchSize: 20, maxProductsPerMonth: 10, maxConcurrentJobs: 1 },
});

const responses: Record<string, unknown> = {
  "/api/auth/me": { id: "user-1", email: "seller@apcs.test", fullName: "Nguyen Test", roles: ["Seller"] },
  "/api/batches": [batch("batch-1", "Summer outdoor", 23), batch("batch-2", "Autumn gifts", 0)],
  "/api/batches/batch-1/products": Array.from({ length: 23 }, (_, index) => product(index)),
  "/api/style-art-presets": Array.from({ length: 7 }, (_, index) => preset(`style-${index}`, `Style ${index}`, index < 4)),
  "/api/api-keys": { items: [], connectedCount: 0, needsAttentionCount: 0, isReady: false, lastCheckedAtUtc: null },
  "/api/usage": {
    summary: { images: 0, videos: 0, listings: 0, estimatedCostUsd: 0 },
    dailyActivity: [{ date: "2026-11-01", images: 0, videos: 0 }],
    allowance: { planName: "No active plan", used: 0, limit: 0, percent: 0, resetDate: "2026-12-06", daysRemaining: 30, atRisk: false },
    costs: [],
    hasData: false,
  },
  "/api/subscriptions/overview": {
    currentSubscription: null,
    usageQuotas: [],
    availablePlans: [billingPlan("starter", "Starter", 249750, true), billingPlan("creator", "Creator", 749750), billingPlan("studio", "Studio", 2499750)],
    recentInvoices: [],
    hasActivePaidPlan: false,
    trialEligible: false,
  },
  "/api/profile": {
    fullName: "Nguyen Test",
    email: "seller@apcs.test",
    shopName: "",
    shopDescription: "",
    timezone: "Asia/Ho_Chi_Minh",
    language: "en",
    themePreference: "system",
    notificationEmailEnabled: true,
    newsletterSubscribed: true,
    twoFactorEnabled: false,
    avatarUrl: null,
  },
  "/api/market-opportunities/profile": researchProfile(3),
  "/api/market-opportunities": [opportunity],
  "/api/design-templates/options": { niches: [], artStyles: [], placeholders: [], maximumBasePromptLength: 4000, maximumExamples: 5, previewGenerationEnabled: false },
  "/api/workflows/capabilities": {
    definitionVersion: 2,
    nodes: DEFAULT_WORKFLOW_DEFINITION.nodes.map((node) => ({ type: node.type, enabled: true, description: "ok" })),
    videoModes: [],
  },
  "/api/allowances": { scope: null, resetsOn: null, mockupsPerRun: null, items: [] },
  "/api/subscriptions/entitlements": { hasPlan: true, planName: "Pro", tier: "pro", isTrial: false, trialEndsAt: null, maxBatchSize: -1, maxConcurrentJobs: -1, features: [] },
  "/api/workflows": [workflow],
  [`/api/workflows/${workflowId}`]: workflow,
};

const fulfillJson = (route: Route, json: unknown) => {
  const request = route.request();
  const headers = {
    "access-control-allow-origin": request.headers().origin ?? new URL(request.url()).origin,
    "access-control-allow-credentials": "true",
  };
  return route.fulfill({ json, headers });
};

const mockApi = async (page: Page) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    await fulfillJson(route, url.pathname === "/api/design-templates" ? designTemplates(url) : (responses[url.pathname] ?? []));
  });
};

const staysInsideTheScreen = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    const page = document.documentElement;
    return page.scrollWidth <= window.innerWidth && page.scrollHeight <= window.innerHeight && (main?.scrollWidth ?? 0) <= (main?.clientWidth ?? 0);
  });

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

for (const [name, device] of [
  ["375px", PHONE],
  ["320px", SMALL_PHONE],
] as const) {
  test.describe(`at ${name}`, () => {
    test.use(device);

    for (const route of ["/batches", "/styles", "/design-templates", "/api-keys", "/usage", "/market-opportunities", "/subscription", "/profile"]) {
      test(`${route} fits the screen`, async ({ page }) => {
        await page.goto(route);
        await expect(page.getByRole("navigation", { name: "Main tabs" })).toBeVisible();
        await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible();
        expect(await staysInsideTheScreen(page)).toBe(true);
      });
    }
  });
}

test.describe("on a phone", () => {
  test.use(PHONE);

  test("the header shows the brand and every page stays reachable", async ({ page }) => {
    await page.goto("/batches");
    await expect(page.getByRole("link", { name: /go to the dashboard/ })).toBeVisible();

    await page.getByRole("navigation", { name: "Main tabs" }).getByRole("button", { name: "More" }).tap();
    await expect(page.getByRole("dialog").getByRole("link", { name: "API keys" })).toBeVisible();
  });

  test("a batch can be picked from the list and its products load in steps", async ({ page }) => {
    await page.goto("/batches");
    const picker = page.getByRole("button", { name: /Choose a batch/ });
    await expect(picker).toContainText("Summer outdoor");

    const products = page.getByRole("list", { name: "Products" }).getByRole("listitem");
    await expect(products).toHaveCount(10);
    await page.getByRole("button", { name: "Load 10 more" }).tap();
    await expect(products).toHaveCount(20);
    await expect(page.locator("main table")).toHaveCount(0);

    await picker.tap();
    await page.getByRole("menuitem", { name: /Autumn gifts/ }).tap();
    await expect(page.getByText("This batch is empty")).toBeVisible();
  });

  test("design templates show five to a page", async ({ page }) => {
    const sizes: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/design-templates") sizes.push(url.searchParams.get("pageSize") ?? "");
    });

    await page.goto("/design-templates");
    const cards = page.locator("main article");
    await expect(cards).toHaveCount(5);
    await expect(page.getByText("Page 1 of 12")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).tap();
    await expect(page.getByText("Page 2 of 12")).toBeVisible();
    await expect(cards.first()).toContainText("Blooms 5");
    expect(new Set(sizes)).toEqual(new Set(["5"]));
  });

  test("a link to a later template page stays on that page", async ({ page }) => {
    await page.goto("/design-templates?pageNumber=2");
    await expect(page.getByText("Page 2 of 12")).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByText("Page 2 of 12")).toBeVisible();
    await expect(page.locator("main article").first()).toContainText("Blooms 5");
  });

  test("my styles show five to a page", async ({ page }) => {
    await page.goto("/styles");
    const styles = page.getByRole("main").getByRole("heading", { level: 3 });
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).tap();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await page.getByRole("textbox", { name: "Search styles" }).fill("Style");
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(styles).toHaveCount(0);
  });

  test("usage says a Seller without a plan is on the free allowance", async ({ page }) => {
    await page.goto("/usage");
    await expect(page.getByText("Free plan")).toBeVisible();
    await expect(page.getByText("Free allowance applies.")).toBeVisible();
    await expect(page.getByText("No monthly limit")).toHaveCount(0);
    await expect(page.locator("main table")).toBeHidden();
    await expect(page.getByText("no usage activity in this time range")).toBeVisible();
    await expect(page.getByRole("list", { name: "Chart legend" })).toContainText("Images");
    await expect(page.getByRole("list", { name: "Chart legend" })).toContainText("Videos");
  });

  test("Market Radar leads with the ranking once a profile is saved", async ({ page }) => {
    await page.goto("/market-opportunities");
    const profile = page.getByRole("button", { name: /Your seller profile/ });
    await expect(page.getByText(opportunity.title)).toBeVisible();
    await expect(profile).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByLabel("Shop goal")).toBeHidden();

    await profile.tap();
    await expect(page.getByLabel("Shop goal")).toHaveValue("Find profitable niches");
  });

  test("Market Radar starts a new seller on the profile form", async ({ page }) => {
    await page.route("**/api/market-opportunities/profile", (route) => fulfillJson(route, researchProfile(0)));
    await page.goto("/market-opportunities");
    await expect(page.getByRole("button", { name: /Your seller profile/ })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Shop goal")).toBeVisible();
  });

  test("billing shows one plan at a time and opens on the recommended one", async ({ page }) => {
    await page.goto("/subscription");
    const plans = page.getByRole("group", { name: "Choose a plan" });
    await expect(plans.getByRole("button", { name: "Starter" })).toHaveAttribute("aria-pressed", "true");

    await plans.getByRole("button", { name: "Studio" }).tap();
    await expect(plans.getByRole("button", { name: "Studio" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Buy Studio" })).toBeInViewport();
  });

  test("a workflow is edited as a list, and removing a step keeps it connected", async ({ page }) => {
    await page.goto(`/workflows?id=${workflowId}`);
    const steps = page.getByRole("list", { name: "Workflow steps" }).locator("article");
    await expect(steps).toHaveCount(9);
    await expect(page.locator(".react-flow")).toHaveCount(0);

    await steps.filter({ hasText: "Design approval" }).getByRole("button").first().tap();
    await page.getByRole("button", { name: "Delete node" }).tap();
    await expect(steps).toHaveCount(8);

    await page.getByRole("button", { name: /^checks/i }).tap();
    await expect(page.getByText(/not connected/i)).toHaveCount(0);
  });
});

test("a desktop keeps its table and its canvas", async ({ page }) => {
  await page.goto("/batches");
  await expect(page.locator("main table")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main tabs" })).toBeHidden();

  await page.goto(`/workflows?id=${workflowId}`);
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(page.getByRole("list", { name: "Workflow steps" })).toHaveCount(0);
});
