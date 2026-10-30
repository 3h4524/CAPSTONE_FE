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
const slotKey = "design1.template1.own";
const madeMockups = {
  generatedCount: 0, noDesignImageCount: 0, noCompatibleTemplateCount: 0, noApprovedImageCount: 0, errors: [],
  images: [{ id: "mockup-1", productId, designImageId: "design-1", mockupTemplateId: templateId, mockupImageUrl: "/fixture-mockup.svg?mockup=1", mockupWidthPx: 600, mockupHeightPx: 900, approvalStatus: "pending", garmentColor: null, slotKey } as Record<string, unknown>],
  removed: [] as unknown[],
};
const noMockups = { ...madeMockups, images: [] };
// The same mock-up once it was made its own way, and once it was removed for its product.
const editedMockups = {
  ...madeMockups,
  images: [{ ...madeMockups.images[0], id: "mockup-2", garmentColor: "#1A1A1A", backgroundColor: "#22262E",
    override: { mockupTemplateId: templateId, garmentColor: "#1A1A1A", backgroundColor: "#22262E", printArea: null, removed: false } }],
};
const removedMockups = { ...madeMockups, images: [], removed: [{ slotKey, productId, designImageId: "design-1", mockupTemplateId: templateId, templateName: "Classic Tee", garmentColor: null }] };

type Fixtures = { workflow?: ReturnType<typeof workflow>; products?: unknown[]; assets?: MockupAsset[]; jobMockups?: typeof madeMockups; batches?: unknown[]; jobs?: unknown[]; templates?: unknown[] };

const mockApi = async (page: Page, { workflow: current = workflow(), products = [], assets = [], jobMockups = noMockups, batches = [], jobs = [], templates = [] }: Fixtures = {}) => {
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
    else if (path === `/api/batch-jobs/${jobId}/mockups/overrides`)
      json = (request.postDataJSON() as { override?: { removed?: boolean } }).override?.removed ? removedMockups : editedMockups;
    else if (path.startsWith(`/api/batch-jobs/${jobId}/mockups/overrides/`)) json = madeMockups;
    else if (path === "/api/mockup-templates") json = templates;
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
  await expect(node(page, "design-approval")).toContainText("1 approved");
  await expect(node(page, "design-approval")).toContainText("0 rejected");
  await expect(node(page, "design-approval")).toContainText("1 pending");
  // From the video run.
  await expect(node(page, "approval")).toContainText("Needs input");
  await expect(node(page, "video")).not.toContainText("Done");

  await node(page, "design-approval").click({ position: { x: 4, y: 14 } });
  await expect(page.getByRole("heading", { name: "Review designs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve all remaining (1)" })).toBeEnabled();
  await page.screenshot({ path: ".next/workflow-ui-results/combined-run.png", fullPage: true });
});

test("Mockup Approval adds the product's composited mock-ups to the video sources", async ({ page }) => {
  const requests = await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}`);
  await node(page, "approval").click({ position: { x: 4, y: 14 } });
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

test("the Batches page counts every product under one status, the ones in review included", async ({ page }) => {
  const productStatuses = ["pending", "queued", "generating_image", "image_review_required", "approved", "failed"];
  await mockApi(page, {
    batches: [{ id: batchId, name: "Summer drop", description: null, defaultNiche: null, defaultProductType: null, status: "draft", createdAt: "2026-10-05T00:00:00Z", productCount: productStatuses.length }],
    products: productStatuses.map((status, index) => ({ id: `00000000-0000-4000-8000-00000000000${index + 1}`, batchId, name: `Product ${index + 1}`, productType: "tshirt", niche: null, keywords: [], productDescription: null, sourceNotes: null, status, createdAt: null })),
  });
  await page.goto("/batches");
  await page.getByRole("button", { name: /Summer drop/ }).first().click();

  // A product whose image is being made is Processing, and one waiting for approval has a counter of its own.
  for (const label of ["Pending", "Queued", "Processing", "Review", "Completed", "Failed"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${label}\\s*1$`) })).toBeVisible();
  }

  // A counter is also a filter.
  await page.getByRole("button", { name: /^Review\s*1$/ }).click();
  await expect(page.getByRole("cell", { name: "Product 4", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: /^Product \d$/ })).toHaveCount(1);
});

test("one mock-up of the job can be made its own way, removed and put back", async ({ page }) => {
  const template = {
    id: templateId, name: "Classic Tee", productType: "tshirt", baseImageUrl: "/fixture-mockup.svg", previewImageUrl: null,
    printAreaConfig: JSON.stringify({ x: 150, y: 250, width: 300, height: 300, unit: "px" }), outputWidthPx: 600, outputHeightPx: 900,
    usageCount: 3, isSystemTemplate: false, isMine: true, realisticPrintReady: true, allowRecolor: true,
    garmentMaskUrl: "/fixture-mockup.svg?mask=1", garmentColor: null, allowBackground: true,
  };
  const requests = await mockApi(page, { jobMockups: madeMockups, templates: [template] });
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}`);
  await node(page, "mockup").click({ position: { x: 4, y: 14 } });

  // Each of the job's mock-ups can be changed on its own.
  await page.getByRole("button", { name: "Edit this mock-up of Vintage Fishing Club" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit this mock-up" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Black", exact: true }).click();
  await dialog.getByRole("button", { name: "Charcoal background" }).click();
  // The position preview shows the garment on the chosen background before anything is saved.
  await expect(dialog.getByTestId("print-area-photo")).toHaveCSS("background-color", "rgb(34, 38, 46)");
  await dialog.getByRole("button", { name: "Original" }).click();
  await expect(dialog.getByTestId("print-area-photo")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await dialog.getByRole("button", { name: "Charcoal background" }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Edited", { exact: true })).toBeVisible();
  const saved = requests.find(r => r.method === "PUT" && r.path.endsWith("/mockups/overrides"))!;
  // Left where the template puts it, the design keeps following the template's print area.
  expect(saved.body).toEqual({
    slotKey, replacedMockupImageId: "mockup-1",
    override: { mockupTemplateId: templateId, garmentColor: "#1A1A1A", backgroundColor: "#22262E", printArea: null, removed: false },
  });

  // Removed for this product alone, it is listed and can be put back.
  await page.getByRole("button", { name: "Edit this mock-up of Vintage Fishing Club" }).click();
  await expect(dialog.getByRole("button", { name: "Use the job’s settings" })).toBeVisible();
  await dialog.getByRole("button", { name: "Remove this mock-up" }).click();
  const removedList = page.getByRole("region", { name: "Removed mock-ups" });
  await expect(removedList).toContainText("Vintage Fishing Club · Classic Tee");
  await removedList.getByRole("button", { name: "Restore" }).click();
  await expect(removedList).toBeHidden();
  expect(requests.some(r => r.method === "DELETE" && r.path === `/api/batch-jobs/${jobId}/mockups/overrides/${slotKey}`)).toBe(true);
});

test("one mock-up's background is copied onto its template's other mock-ups, and no two mock-ups end up alike", async ({ page }) => {
  const template = {
    id: templateId, name: "Classic Tee", productType: "tshirt", baseImageUrl: "/fixture-mockup.svg", previewImageUrl: null,
    printAreaConfig: JSON.stringify({ x: 150, y: 250, width: 300, height: 300, unit: "px" }), outputWidthPx: 600, outputHeightPx: 900,
    usageCount: 3, isSystemTemplate: false, isMine: true, realisticPrintReady: true, allowRecolor: true,
    garmentMaskUrl: "/fixture-mockup.svg?mask=1", garmentColor: null, allowBackground: true,
  };
  const boxyId = "7d2c7b1a-4e5f-4a6b-8c7d-1e2f3a4b5c6d";
  const [first] = madeMockups.images;
  // Another garment color on the same template, and the same design on another template.
  const navy = { ...first, id: "mockup-2", garmentColor: "#1F2A44", slotKey: "design1.template1.1F2A44" };
  const boxy = { ...first, id: "mockup-3", mockupTemplateId: boxyId, slotKey: "design1.template2.own" };
  const requests = await mockApi(page, { jobMockups: { ...madeMockups, images: [first!, navy, boxy] }, templates: [template, { ...template, id: boxyId, name: "Boxy Tee" }] });
  await page.goto(`/workflows?id=${workflowId}&job=${jobId}`);
  await node(page, "mockup").click({ position: { x: 4, y: 14 } });

  await page.getByRole("button", { name: "Edit this mock-up of Vintage Fishing Club" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Edit this mock-up" });
  const save = dialog.getByRole("button", { name: "Save", exact: true });

  // The garment color the navy mock-up already has would make a second, identical one.
  await dialog.getByRole("button", { name: "Navy", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("This would look exactly like another mock-up of this design (Classic Tee in Navy)");
  await expect(save).toBeDisabled();
  await dialog.getByRole("button", { name: "Navy", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);

  // Copying reaches only the mock-ups of this template; there is no choice for the whole job.
  await dialog.getByRole("button", { name: "Charcoal background" }).click();
  await expect(dialog.getByRole("radio", { name: /This mock-up only/ })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /All mock-ups/ })).toHaveCount(0);
  await dialog.getByRole("radio", { name: /Mock-ups on this template/ }).click();
  await expect(dialog).toContainText("1 other mock-up will change.");
  await save.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("2 mock-ups updated.", { exact: false })).toBeVisible();
  expect(requests.some(r => r.method === "PUT" && r.path.endsWith("/mockups/overrides"))).toBe(false);
  const saved = requests.find(r => r.method === "PUT" && r.path.endsWith("/mockups/overrides/bulk"))!;
  // The navy one keeps its garment color; the Boxy Tee mock-up is left as it is.
  expect(saved.body).toEqual({
    overrides: [
      { slotKey, replacedMockupImageId: "mockup-1", override: { mockupTemplateId: templateId, garmentColor: null, backgroundColor: "#22262E", printArea: null, removed: false } },
      { slotKey: navy.slotKey, replacedMockupImageId: "mockup-2", override: { mockupTemplateId: templateId, garmentColor: "#1F2A44", backgroundColor: "#22262E", printArea: null } },
    ],
  });
});

test("Apply mock-up puts each garment color of a template on a background of its own", async ({ page }) => {
  const template = {
    id: templateId, name: "Classic Tee", productType: "tshirt", baseImageUrl: "/fixture-mockup.svg", previewImageUrl: null,
    printAreaConfig: JSON.stringify({ x: 150, y: 250, width: 300, height: 300, unit: "px" }), outputWidthPx: 600, outputHeightPx: 900,
    usageCount: 3, isSystemTemplate: false, isMine: true, realisticPrintReady: true, allowRecolor: true,
    garmentMaskUrl: "/fixture-mockup.svg?mask=1", garmentColor: null, allowBackground: true,
  };
  const requests = await mockApi(page, { templates: [template] });
  await page.goto(`/workflows?id=${workflowId}`);
  await node(page, "mockup").click({ position: { x: 4, y: 14 } });
  await page.getByRole("button", { name: "Change templates" }).click();

  // The seller's own template can be edited without leaving the picker.
  await page.getByRole("button", { name: "Edit Classic Tee" }).click();
  await expect(page.getByRole("heading", { name: "Edit Classic Tee" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).last().click();
  await expect(page.getByRole("heading", { name: "Edit Classic Tee" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Choose mock-up templates" })).toBeVisible();

  // With no garment color picked there is one background, and nothing chosen keeps the photo's own.
  await expect(page.getByText("Background for Classic Tee")).toBeVisible();
  await expect(page.getByRole("button", { name: "Original" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Charcoal background" }).click();
  await expect(page.getByTestId("mockup-preview")).toHaveCSS("background-color", "rgb(34, 38, 46)");

  // Two garment colors: still one background choice, for the garment color the template is shown in. Each
  // color starts from what was chosen so far.
  await page.getByRole("button", { name: "White", exact: true }).click();
  await page.getByRole("button", { name: "Black", exact: true }).click();
  const forWhite = page.getByRole("button", { name: "Background for the White garment" });
  const forBlack = page.getByRole("button", { name: "Background for the Black garment" });
  const charcoal = page.getByRole("button", { name: "Charcoal background" });
  await expect(charcoal).toHaveCount(1);
  await expect(forWhite).toHaveAttribute("aria-pressed", "true");
  await expect(charcoal).toHaveAttribute("aria-pressed", "true");

  // Switching the garment color switches the background being chosen, and the preview with it.
  await forBlack.click();
  await expect(forBlack).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Preview in Black" })).toHaveAttribute("aria-pressed", "true");
  await expect(charcoal).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "White background" }).click();
  await expect(page.getByTestId("mockup-preview")).toHaveCSS("background-color", "rgb(255, 255, 255)");

  // The preview's own color switch does the same; changing one color left the other as it was.
  await page.getByRole("button", { name: "Preview in White" }).click();
  await expect(forWhite).toHaveAttribute("aria-pressed", "true");
  await expect(charcoal).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("mockup-preview")).toHaveCSS("background-color", "rgb(34, 38, 46)");
  await page.getByRole("button", { name: "Apply mock-ups" }).click();
  // The node lists the template with its garment colors; the backgrounds stay in the picker.
  const chosen = page.getByLabel("Selected mock-up templates");
  await expect(chosen.getByTitle("White", { exact: true })).toBeVisible();
  await expect(chosen.getByTitle("Black", { exact: true })).toBeVisible();
  await expect(chosen.getByTitle(/^Background:/)).toHaveCount(0);

  // The choice is part of the workflow that is saved.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => requests.filter(r => r.method === "PUT").length).toBe(1);
  expect(JSON.stringify(requests.find(r => r.method === "PUT")!.body)).toContain(`"templateBackgrounds":{"${templateId}":{"#FFFFFF":"#22262E","#1A1A1A":"#FFFFFF"}}`);
});
