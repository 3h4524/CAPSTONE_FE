import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { expect, type Page, test } from "@playwright/test";

const workflowId = "e4a1b7c2-5f30-4a8e-9d11-0c2b6f9d7a55";
const batchId = "b1000000-0000-4000-8000-000000000001";
const productId = "p1000000-0000-4000-8000-000000000001";
const templateId = "t1000000-0000-4000-8000-000000000001";

const LONG_LABEL = "A very long custom node name that keeps going and going without any end";
const LONG_BATCH = "Spring collection of vintage fishing club designs for outdoor lovers and campers";
const LONG_PRODUCT = "Vintage Fishing Club Retro Sunset Tee for Dad with Extra Long Product Name";
const LONG_TEMPLATE = "Extremely Long Design Template Name That Should Never Overflow The Node Card";

const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
definition.nodes = definition.nodes.map((item) => {
  const config = { ...item.config };
  if (item.id === "input") Object.assign(config, { batchId, productId });
  if (item.id === "prompt") Object.assign(config, { designTemplateId: templateId, instructions: "x".repeat(300) });
  if (item.id === "video") Object.assign(config, { textOverlay: "y".repeat(120) });
  return { ...item, label: LONG_LABEL, config };
});

const workflow = {
  id: workflowId,
  name: "Overflow workflow",
  description: "",
  nodeCount: definition.nodes.length,
  revision: 1,
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
  definition,
};

const template = {
  id: templateId,
  name: LONG_TEMPLATE,
  isSystemTemplate: true,
  nicheCategory: "Outdoors & Recreation & Everything Else",
  artStyle: "Vintage hand drawn illustration with distressed texture",
  previewImageUrl: null,
};

const mockApi = async (page: Page) => {
  const origin = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:3101").origin;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === "/api/auth/me")
      json = { id: "u1", email: "a@b.test", fullName: "Tester", roles: ["User", "Seller"] };
    else if (path === "/api/workflows/capabilities")
      json = { definitionVersion: 2, nodes: definition.nodes.map((n) => ({ type: n.type, enabled: true, description: "ok" })), videoModes: [] };
    else if (path === "/api/workflows") json = [workflow];
    else if (path === `/api/workflows/${workflowId}`) json = workflow;
    else if (path === "/api/batches")
      json = [{ id: batchId, name: LONG_BATCH, description: null, defaultNiche: "Outdoors", defaultProductType: "tshirt", status: "draft", createdAt: "2026-10-05T00:00:00Z", productCount: 12 }];
    else if (path === `/api/batches/${batchId}/products`)
      json = [{ id: productId, batchId, name: LONG_PRODUCT, productType: "tshirt", niche: null, keywords: [], productDescription: null, sourceNotes: null, status: "pending", createdAt: null }];
    else if (path === "/api/design-templates")
      json = { items: [template], pageNumber: 1, pageSize: 48, totalCount: 1, totalPages: 1 };
    await route.fulfill({ json, headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" } });
  });
};

type Overflow = { node: string; element: string; overBy: number };

const findOverflows = (page: Page) =>
  page.evaluate(() => {
    const found: { node: string; element: string; overBy: number }[] = [];
    document.querySelectorAll<HTMLElement>(".react-flow__node").forEach((nodeElement) => {
      const article = nodeElement.querySelector("article");
      if (!article) return;
      const frame = article.getBoundingClientRect();
      article.querySelectorAll<HTMLElement>("*").forEach((element) => {
        if (element.closest("svg") && element.tagName !== "svg") return;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const over = Math.max(rect.right - frame.right, frame.left - rect.left, rect.bottom - frame.bottom, frame.top - rect.top);
        if (over > 0.5) {
          const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40) ?? element.tagName;
          found.push({ node: nodeElement.dataset.id ?? "?", element: `${element.tagName.toLowerCase()}:${label}`, overBy: Math.round(over * 10) / 10 });
        }
      });
    });
    return found;
  });

const findClippedText = (page: Page) =>
  page.evaluate(() => {
    const found: { node: string; element: string }[] = [];
    document.querySelectorAll<HTMLElement>(".react-flow__node").forEach((nodeElement) => {
      nodeElement.querySelectorAll<HTMLElement>("article *").forEach((element) => {
        const style = getComputedStyle(element);
        const clips = style.overflow === "visible" && element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0;
        if (clips && element.children.length === 0 && element.textContent?.trim())
          found.push({ node: nodeElement.dataset.id ?? "?", element: element.textContent.trim().slice(0, 40) });
      });
    });
    return found;
  });

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}`);
  await expect(page.locator('.react-flow__node[data-id="export"]')).toBeVisible();
  await expect(page.locator('.react-flow__node[data-id="input"]').getByRole("combobox", { name: "Batch" })).toContainText("Spring collection");
  await page.waitForTimeout(400);
});

test("no element sticks out of its node card with very long names and values", async ({ page }) => {
  const overflows: Overflow[] = await findOverflows(page);
  expect(overflows).toEqual([]);
});

test("long text inside a node is cut with an ellipsis instead of running past its box", async ({ page }) => {
  expect(await findClippedText(page)).toEqual([]);
});

test("the node keeps the same width whatever the content", async ({ page }) => {
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".react-flow__node")].map((element) => Math.round(element.getBoundingClientRect().width))
  );
  expect(widths.every((width) => width <= 300)).toBe(true);
});

test("an open dropdown is wide enough and shows the full name on hover", async ({ page }) => {
  await page.locator('.react-flow__node[data-id="prompt"]').getByRole("combobox", { name: "Design template" }).click();
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  const box = await option.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(250);
  await expect(option.locator(".truncate").first()).toHaveAttribute("title", LONG_TEMPLATE);
});

test("a text box in a node grows with its text instead of cutting a line in half", async ({ page }) => {
  const overlay = page.locator('.react-flow__node[data-id="video"]').getByRole("textbox", { name: "Text overlay" });
  const sizes = await overlay.evaluate((element) => ({ scroll: element.scrollHeight, client: element.clientHeight }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  const empty = page.locator('.react-flow__node[data-id="prompt"]').getByRole("textbox", { name: "Extra instructions" });
  const box = await empty.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
});
