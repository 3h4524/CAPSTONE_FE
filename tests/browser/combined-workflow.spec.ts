import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { MockupAsset, WorkflowRun } from "@/types/video-workflow";
import { expect, type Page, test } from "@playwright/test";

// The designs and mock-ups run as a batch job, the video as a server run. These tests drive the real
// canvas with intercepted API responses to check the two are shown and started as one workflow.
const workflowId = "b6b8e5f2-9c68-4d31-b8ab-26f56ef03323";
const batchId = "5b1f0d6a-2f0e-4b1e-9a57-3c1f2f7a9d10";
const productId = "8346cc30-bc31-49b0-8f56-759092539a0a";
const jobId = "0a4b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d";
const runId = "650bb1e2-e1a2-4215-a710-02e593b67769";
const templateId = "9d2c7b1a-4e5f-4a6b-8c7d-1e2f3a4b5c6d";

const buildDefinition = (video: { productId: string }) => {
  const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
  const set = (type: string, config: Record<string, unknown>) => {
    const node = definition.nodes.find(n => n.type === type)!;
    node.config = { ...node.config, ...config };
  };
  set("product-input", { batchId, productId: video.productId });
  set("prompt-synthesis", { designTemplateId: templateId });
  set("apply-mockup", { mockupTemplateIds: [templateId] });
  return definition;
};

const definition = buildDefinition({ productId });
const workflow = (current = definition) => ({ id: workflowId, name: "Combined workflow", description: "Designs, mock-ups and a video", nodeCount: current.nodes.length, revision: 4, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z", definition: current });

const mockupAsset = (id: string, overrides: Partial<MockupAsset> = {}): MockupAsset => ({
  id, productId, sourceType: "generated", role: "Hero", artworkGroupKey: productId, variantKey: null, revision: 1,
  approvalStatus: "pending", approvedRevision: null, width: 600, height: 900, previewUrl: "/fixture-mockup.svg", warnings: [],
  regions: { focalPoint: { x: 0.5, y: 0.5 }, product: null, artwork: null, detail: null }, ...overrides,
});

const design = (id: string, approvalStatus: string) => ({ id, imageUrl: `/fixture-mockup.svg?design=${id}`, variationIndex: 1, widthPx: 600, heightPx: 900, approvalStatus });
const batchJob: BatchJobDetail = {
  id: jobId, batchId, batchName: "Summer drop", status: "completed", totalProducts: 1, processedProducts: 1, failedProducts: 0,
  progressPercentage: 100, startedAt: null, completedAt: null, variationCount: 2, aspectRatio: "1:1",
  counters: { pending: 0, processing: 0, completed: 1, failed: 0 }, requireApproval: true,
  products: [{ id: "row-1", productId, productName: "Vintage Fishing Club", productType: "tshirt", sequence: 1, status: "image_review_required", errorMessage: null, images: [design("design-1", "approved"), design("design-2", "pending")] }],
};

// A video run waiting at Mockup Approval. It records the steps before it as done and never touches the design steps.
const videoRun: WorkflowRun = {
  id: runId, workflowId, productId, status: "waiting_for_input", revision: 2, workflowRevision: 4, createdAt: "2026-10-05T00:00:00Z", errorMessage: null,
  nodes: definition.nodes.map(n => ({
    id: n.id, nodeId: n.id, nodeType: n.type, attempt: 1, stage: null, progress: 0, errorMessage: null, output: {},
    status: n.type === "product-input" || n.type === "apply-mockup" ? "succeeded" : n.type === "approval-gate" ? "waiting_for_input" : "pending",
  })),
};

// What the job's mock-ups look like once they are made.
const madeMockups = {
  generatedCount: 0, noDesignImageCount: 0, noCompatibleTemplateCount: 0, noApprovedImageCount: 0, errors: [],
  images: [{ id: "mockup-1", productId, designImageId: "design-1", mockupTemplateId: templateId, mockupImageUrl: "/fixture-mockup.svg?mockup=1", mockupWidthPx: 600, mockupHeightPx: 900, approvalStatus: "pending", garmentColor: null }],
};
const noMockups = { ...madeMockups, images: [] };

type Fixtures = { workflow?: ReturnType<typeof workflow>; products?: unknown[]; assets?: MockupAsset[]; jobMockups?: typeof madeMockups; batches?: unknown[]; jobs?: unknown[] };

const mockApi = async (page: Page, { workflow: current = workflow(), products = [], assets = [], jobMockups = noMockups, batches = [], jobs = [] }: Fixtures = {}) => {
  const origin = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:3101").origin;
  const requests: { method: string; path: string; body: unknown }[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") requests.push({ method: request.method(), path, body: request.postDataJSON() as unknown });
    let json: unknown = [];
    if (path === "/api/auth/me") json = { id: productId, email: "fixture@example.test", fullName: "Workflow tester", roles: ["User", "Seller"] };
    else if (path === "/api/workflows/capabilities") json = { definitionVersion: 2, nodes: current.definition.nodes.map(n => ({ type: n.type, enabled: true, description: "Available" })), videoModes: [] };
    else if (path === "/api/workflows") json = [current];
    else if (path === `/api/workflows/${workflowId}`) json = current;
    else if (path === `/api/workflows/${workflowId}/runs` || path === `/api/workflow-runs/${runId}`) json = videoRun;
    else if (path === `/api/batch-jobs/${jobId}`) json = batchJob;
    else if (path === `/api/batch-jobs/${jobId}/mockups`) json = { batchJobId: jobId, templateIds: [templateId], garmentColors: [], templateColors: {} };
    else if (path === `/api/batch-jobs/${jobId}/mockups/images`) json = jobMockups;
    else if (path === "/api/batches") json = batches;
    else if (path === `/api/batches/${batchId}/jobs`) json = jobs;
    else if (path === `/api/batches/${batchId}/products/reset`) json = { resetCount: 1 };
    else if (path === `/api/batches/${batchId}/products`) json = products;
    else if (path === `/api/products/${productId}/mockup-assets`) json = assets;
    else if (path === `/api/products/${productId}/mockup-assets/import-generated`) json = { importedCount: 2, failedCount: 0, mockups: [mockupAsset("ad48d15b-57b9-47b9-84cc-d30a0fb6ad59"), mockupAsset("bd48d15b-57b9-47b9-84cc-d30a0fb6ad59")] };
    await route.fulfill({ json, headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" } });
  });
  return requests;
};

const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);

test("the canvas lays the designs, the mock-ups and the video out as one workflow", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}`);
  for (const [id, label] of [["input", "Product input"], ["prompt", "Prompt synthesis"], ["design", "Design image"], ["design-approval", "Design approval"], ["mockup", "Apply mock-up"], ["approval", "Mockup Approval"], ["video", "Generate Video"], ["review", "Review Video"], ["export", "Export ZIP"]])
    await expect(node(page, id)).toContainText(label);
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await page.screenshot({ path: ".next/workflow-ui-results/combined-canvas.png", fullPage: true });
});

test("a batch job and a video run each show their own steps", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}&run=${runId}`);
  // From the batch job. The video run reports these design steps as pending, which must not reset them.
  await expect(node(page, "prompt")).toContainText("Done");
  await expect(node(page, "design")).toContainText("Done");
  await expect(node(page, "design-approval")).toContainText("Needs review");
  await expect(node(page, "design-approval")).toContainText("1 approved · 0 rejected · 1 to review");
  // From the video run.
  await expect(node(page, "approval")).toContainText("Needs input");
  await expect(node(page, "video")).not.toContainText("Done");

  await node(page, "design-approval").click({ position: { x: 80, y: 40 } });
  await expect(page.getByRole("heading", { name: "Review designs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve all remaining (1)" })).toBeEnabled();
  await page.screenshot({ path: ".next/workflow-ui-results/combined-run.png", fullPage: true });
});

test("Mockup Approval adds the product's composited mock-ups to the video sources", async ({ page }) => {
  const requests = await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}`);
  await node(page, "approval").click({ position: { x: 80, y: 40 } });
  await expect(page.getByText("No mockups yet. Upload images in Apply Mockup.")).toBeVisible();
  await page.getByRole("button", { name: "Add this product's mock-ups" }).click();
  await expect(page.getByText("Added 2 mock-ups for the video.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve mockup" })).toHaveCount(2);
  expect(requests.map(r => `${r.method} ${r.path}`)).toEqual([`POST /api/products/${productId}/mockup-assets/import-generated`]);
});

test("Run goes on to the video when the batch has no designs left to make", async ({ page }) => {
  const requests = await mockApi(page, { products: [{ id: productId, name: "Vintage Fishing Club", productType: "tshirt", status: "approved" }] });
  await page.goto(`/workflows?id=${workflowId}`);
  await expect(node(page, "video")).toBeVisible();
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page).toHaveURL(new RegExp(`run=${runId}`));
  // The mock-ups are stored as video sources before the run that looks for them starts.
  expect(requests.map(r => `${r.method} ${r.path}`)).toEqual([
    `POST /api/products/${productId}/mockup-assets/import-generated`,
    `POST /api/workflows/${workflowId}/runs`,
  ]);
  expect(requests[1].body).toMatchObject({ expectedWorkflowRevision: 4 });
  await expect(page.getByText("Approve the mock-ups to use in the video, then continue.")).toBeVisible();
  await expect(node(page, "approval")).toContainText("Needs input");
  await expect(page.getByRole("button", { name: "Continue with approved mockups" })).toBeVisible();
});

test("the batch job that is open stays on the canvas when Run goes on to the video", async ({ page }) => {
  await mockApi(page, { products: [{ id: productId, name: "Vintage Fishing Club", productType: "tshirt", status: "approved" }] });
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}`);
  await expect(node(page, "design-approval")).toContainText("Needs review");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page).toHaveURL(new RegExp(`job=${jobId}.*run=${runId}|run=${runId}.*job=${jobId}`));
  await expect(node(page, "approval")).toContainText("Needs input");
  await expect(node(page, "design")).toContainText("Done");
  await expect(node(page, "design-approval")).toContainText("Needs review");
});

test("Run asks for the video's product before anything starts", async ({ page }) => {
  const requests = await mockApi(page, { workflow: workflow(buildDefinition({ productId: "" })) });
  await page.goto(`/workflows?id=${workflowId}`);
  await expect(node(page, "video")).toBeVisible();
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText("Choose the product for the video in Product input.")).toBeVisible();
  await expect(page.getByText("Product for the video", { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test("a reloaded page shows the mock-ups a reviewed job already has", async ({ page }) => {
  const requests = await mockApi(page, { jobMockups: madeMockups });
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}`);
  // The designs were reviewed and their mock-ups made before the reload: nothing is waiting any more.
  await expect(node(page, "mockup")).toContainText("Done");
  await expect(node(page, "design-approval")).toContainText("Done");
  await expect(node(page, "design-approval")).not.toContainText("Needs review");
  // They are only read, never made again behind the person's back.
  expect(requests).toEqual([]);
});

test("a reloaded page carries on to the video once the mock-ups are there", async ({ page }) => {
  const requests = await mockApi(page, { jobMockups: madeMockups });
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}&then=video`);
  await expect(page).toHaveURL(new RegExp(`run=${runId}`));
  await expect(page).not.toHaveURL(/then=video/);
  expect(requests.map(r => `${r.method} ${r.path}`)).toEqual([
    `POST /api/products/${productId}/mockup-assets/import-generated`,
    `POST /api/workflows/${workflowId}/runs`,
  ]);
  await expect(node(page, "approval")).toContainText("Needs input");
});

test("the note that the video is next waits while the designs are still to be reviewed", async ({ page }) => {
  const requests = await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}&then=video`);
  await expect(node(page, "design-approval")).toContainText("Needs review");
  await expect(page).toHaveURL(/then=video/);
  expect(requests).toEqual([]);
});

test("the Batches page sets a failed product back to pending and opens a job on the canvas", async ({ page }) => {
  const failedId = "1f0e8d7c-6b5a-4f3e-9d2c-1b0a9f8e7d6c";
  const product = (id: string, name: string, status: string) => ({ id, batchId, name, productType: "tshirt", niche: null, keywords: [], productDescription: null, sourceNotes: null, status, createdAt: null });
  const requests = await mockApi(page, {
    batches: [{ id: batchId, name: "Summer drop", description: null, defaultNiche: null, defaultProductType: null, status: "processing", createdAt: "2026-10-05T00:00:00Z", productCount: 2 }],
    products: [product(failedId, "Lake Day Tee", "failed"), product(productId, "Vintage Fishing Club", "approved")],
    jobs: [
      { id: "draft-job", status: "draft", totalProducts: 1, processedProducts: 0, failedProducts: 0, createdAt: "2026-10-06T00:00:00Z", startedAt: null, workflowId: null },
      { id: jobId, status: "partially_completed", totalProducts: 2, processedProducts: 2, failedProducts: 1, createdAt: "2026-10-05T00:00:00Z", startedAt: "2026-10-05T00:00:00Z", workflowId },
    ],
  });
  await page.goto("/batches");
  await page.getByRole("button", { name: /Summer drop/ }).first().click();

  await expect(page.getByRole("button", { name: "Reset failed (1)" })).toBeVisible();
  // Only the failed product offers it: the approved one has designs in use.
  await expect(page.getByRole("button", { name: "Reset to pending" })).toHaveCount(1);
  await page.getByRole("button", { name: "Reset to pending" }).click();
  await expect(page.getByText("Set “Lake Day Tee” back to pending?")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Reset to pending" }).click();
  await expect(page.getByText("1 product is pending again. Run the workflow to generate new designs.")).toBeVisible();
  expect(requests).toEqual([{ method: "POST", path: `/api/batches/${batchId}/products/reset`, body: { productIds: [failedId] } }]);

  // A draft has nothing to show, so only the started job is listed, and it opens in the workflow it ran from.
  await page.getByRole("button", { name: "Jobs (1)" }).click();
  await page.getByRole("menuitem", { name: /Job #1/ }).click();
  await expect(page).toHaveURL(new RegExp(`/workflows\\?job=${jobId}&id=${workflowId}`));
});
