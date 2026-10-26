import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import type { MockupAsset, VideoStoryboard, VideoTemplateCatalogItem, WorkflowCapabilities, WorkflowRun } from "@/types/video-workflow";
import { expect, test } from "@playwright/test";

const workflowId = "b6b8e5f2-9c68-4d31-b8ab-26f56ef03323";
const runId = "650bb1e2-e1a2-4215-a710-02e593b67769";
const productId = "8346cc30-bc31-49b0-8f56-759092539a0a";
const videoId = "c3c7c3c3-d40c-42c9-962f-006805811cd6";
const oldVideoId = "f3c7c3c3-d40c-42c9-962f-006805811cd6";
const generatedFrameId = "e5e7f7d4-f08c-48f4-a4a1-a42d54d509c5";
const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
definition.nodes.find(n => n.type === "product-input")!.config = { batchId: productId, productId };
const workflow = { id: workflowId, name: "Standard video test", description: "One product", nodeCount: 6, revision: 4, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z", definition };
const capabilities: WorkflowCapabilities = { definitionVersion: 2, nodes: definition.nodes.map(n => ({ type: n.type, enabled: true, description: "Available" })), videoModes: [
  { mode: "standard", enabled: true, availability: "available", description: "Approved mockups, no AI model.", supportsFallback: false, estimatedCostRange: null },
  ...["ai_background", "ai_shot"].map(mode => ({ mode, enabled: false, availability: "coming_soon", description: "Planned enhancement.", supportsFallback: true, estimatedCostRange: { currency: "USD", minimum: 0, maximum: 0, note: "Estimate available before pilot." } })),
] };
const mockupAsset: MockupAsset = {
  id: "ad48d15b-57b9-47b9-84cc-d30a0fb6ad59", productId, sourceType: "upload", role: "Hero",
  artworkGroupKey: productId, variantKey: null, revision: 1, approvalStatus: "approved", approvedRevision: 1,
  width: 600, height: 900, previewUrl: "/fixture-mockup.svg", warnings: [],
  regions: { focalPoint: { x: 0.5, y: 0.5 }, product: null, artwork: null, detail: null },
};
const generatedFrameFixture: MockupAsset = {
  ...mockupAsset, id: generatedFrameId, sourceType: "ai_generated", role: "VideoScene", revision: 1,
  approvalStatus: "pending", approvedRevision: null,
  regions: { focalPoint: null, product: null, artwork: null, detail: null, studioFrame: {
    fingerprint: "b".repeat(64), sourceMockupId: mockupAsset.id, sourceHash: "a".repeat(64), sourceRevision: 1,
    layout: "none", aspectRatio: "9:16", promptVersion: 1,
  } },
};
const templates: VideoTemplateCatalogItem[] = [
  { code: "product_showcase", version: 2, name: "Product Showcase", description: "Lead with the complete product.", previewVideoUrl: "/video-templates/product-showcase-v2.mp4", defaultDurationSeconds: 12, defaultTransition: "fade", defaultMotionPreset: "varied", requirements: { minimumAssets: 1, requiresDetail: false, minimumVariants: 0 } },
  { code: "design_detail", version: 2, name: "Design Detail", description: "Highlight an artwork detail.", previewVideoUrl: "/video-templates/design-detail-v2.mp4", defaultDurationSeconds: 12, defaultTransition: "fade", defaultMotionPreset: "varied", requirements: { minimumAssets: 1, requiresDetail: true, minimumVariants: 0 } },
  { code: "variant_showcase", version: 2, name: "Variant Showcase", description: "Compare approved variants.", previewVideoUrl: "/video-templates/variant-showcase-v2.mp4", defaultDurationSeconds: 12, defaultTransition: "fade", defaultMotionPreset: "varied", requirements: { minimumAssets: 2, requiresDetail: false, minimumVariants: 2 } },
];
const storyboard: VideoStoryboard = {
  template: "product_showcase", templateVersion: 2, outputFormat: "portrait", width: 1080, height: 1920,
  aspectRatio: "9:16", durationSeconds: 12, productType: "tshirt",
  fingerprint: "storybook-fixture-fingerprint",
  scenes: [0, 1].map(sceneOrder => ({
    mockupId: mockupAsset.id, sourceRevision: 1, sourceHash: "a".repeat(64), role: "Hero", sceneOrder,
    durationFrames: 180, crop: { x: 0, y: 0, width: 1, height: 1 }, endCrop: { x: 0, y: 0, width: 1, height: 1 },
    motion: sceneOrder === 0 ? "contain_gentle" : "static", transition: "fade", text: "", generationStrategy: "standard-v2", warnings: [],
  })),
};
const currentRun: WorkflowRun = { id: runId, workflowId, productId, status: "waiting_for_review", revision: 8, workflowRevision: 4, createdAt: workflow.createdAt, errorMessage: null, nodes: definition.nodes.map(n => ({ id: n.id, nodeId: n.id, nodeType: n.type, status: n.type === "review-video" ? "waiting_for_review" : n.type === "export-zip" ? "pending" : "succeeded", attempt: 1, stage: null, progress: 100, errorMessage: null, output: n.type === "review-video" ? { videoId } : {} })) };

test.beforeEach(async ({ page }) => {
  let activeFrame: MockupAsset | null = null;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === "/api/auth/me") json = { id: productId, email: "fixture@example.test", fullName: "Video tester", roles: ["User", "Seller"] };
    else if (path === "/api/workflows/capabilities") json = capabilities;
    else if (path === "/api/workflows/video-templates") json = templates;
    else if (path === "/api/workflows") json = [workflow];
    else if (path === `/api/workflows/${workflowId}`) json = workflow;
    else if (path === `/api/workflow-runs/${runId}` || path === `/api/workflow-runs/${runId}/actions`) json = currentRun;
    else if (path === `/api/products/${productId}/mockup-assets`) json = activeFrame ? [mockupAsset, activeFrame] : [mockupAsset];
    else if (path === `/api/products/${productId}/studio-keyframe/quote`) json = { fingerprint: "b".repeat(64), promptVersion: 1, estimatedCostUsd: 0.02, existingFrame: null, note: "New keyframe" };
    else if (path === `/api/products/${productId}/studio-keyframe/generate`) {
      activeFrame = generatedFrameFixture;
      json = { frame: activeFrame, reused: false, estimatedCostUsd: 0.02 };
    }
    else if (path === `/api/mockup-assets/${generatedFrameId}/review`) {
      const request = route.request().postDataJSON() as { approved: boolean };
      activeFrame = { ...generatedFrameFixture, approvalStatus: request.approved ? "approved" : "rejected", approvedRevision: request.approved ? generatedFrameFixture.revision : null };
      json = activeFrame;
    }
    else if (path === `/api/products/${productId}/video-storyboard`) {
      const request = route.request().postDataJSON() as { config?: { template?: string } };
      if (request.config?.template === "product_showcase") {
        await new Promise(resolve => setTimeout(resolve, 900));
        json = { ...storyboard, template: "design_detail", fingerprint: "stale-product-template-response" };
      } else json = storyboard;
    }
    else if (path.endsWith("/videos")) json = [{ id: videoId, version: 2, approvalStatus: "pending" }, { id: oldVideoId, version: 1, approvalStatus: "rejected" }].map(v => ({ ...v, runId, mode: "standard", template: "product_showcase", outputFormat: "portrait", width: 1080, height: 1920, aspectRatio: "9:16", reviewRevision: v.version + 2, status: "completed", previewUrl: "https://res.cloudinary.com/apcs-ui-fixture/video.mp4", thumbnailUrl: null, qa: { fullDecode: true }, scenes: [] }));
    await route.fulfill({ json, headers: { "access-control-allow-origin": route.request().headers().origin ?? "http://127.0.0.1:3101", "access-control-allow-credentials": "true" } });
  });
});

test("Standard mode and camera framing are configured per scene", async ({ page }) => {
  await page.goto(`/workflows?id=${workflowId}`);
  await page.locator('.react-flow__node[data-id="video"]').click({ position: { x: 80, y: 70 } });
  await expect(page.getByRole("group", { name: "Video mode" })).toHaveCount(0);
  await expect(page.getByText("Standard template")).toHaveCount(0);
  const generationMode = page.getByRole("combobox", { name: "Scene 1 generation mode" });
  await generationMode.click();
  await page.getByRole("option", { name: "Standard", exact: true }).click();

  const motion = page.getByRole("combobox", { name: "Scene 1 Standard camera movement" });
  await expect(motion).toBeVisible();
  await motion.click();
  await page.getByRole("option", { name: "Pan left", exact: true }).click();
  await expect(motion).toContainText("Pan left");
  await page.getByRole("button", { name: /Advanced · first and last frame/ }).click();
  const motionEditor = page.getByRole("dialog");
  await expect(motionEditor).toBeVisible();
  await expect(motionEditor.getByRole("slider", { name: "Scene 1 first frame scale" })).toBeVisible();
  await expect(motionEditor.getByRole("combobox", { name: "Scene 1 last frame anchor" })).toBeVisible();
  await page.screenshot({ path: ".next/workflow-ui-results/per-scene-standard.png", fullPage: true });
});

test("a Standard scene cannot use its new keyframe until it is reviewed and approved", async ({ page }) => {
  page.on("dialog", dialog => dialog.accept());
  await page.goto(`/workflows?id=${workflowId}`);
  await page.locator('.react-flow__node[data-id="video"]').click({ position: { x: 80, y: 70 } });
  await page.getByRole("combobox", { name: "Scene 1 generation mode" }).click();
  await page.getByRole("option", { name: "Standard", exact: true }).click();
  await page.getByRole("button", { name: /start frame for scene 1/ }).click();
  await page.getByRole("tab", { name: "Create new keyframe", exact: true }).click();
  await page.getByRole("combobox", { name: "Scene 1 mockup source for new keyframe" }).click();
  await page.getByRole("option", { name: /Hero/ }).click();
  await page.getByRole("button", { name: "Create keyframe" }).click();
  await expect(page.getByText("Review and approve this image before generating video.")).toBeVisible();
  const useKeyframe = page.getByRole("button", { name: "Use keyframe for this scene" });
  await expect(useKeyframe).toBeDisabled();

  const reviewRequest = page.waitForRequest(request => request.url().endsWith(`/api/mockup-assets/${generatedFrameId}/review`));
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  expect((await reviewRequest).postDataJSON()).toEqual({ expectedRevision: 1, approved: true });
  await expect(useKeyframe).toBeEnabled();
  const storyboardRequest = page.waitForRequest(request => request.url().endsWith(`/api/products/${productId}/video-storyboard`) &&
    (request.postDataJSON() as { config?: { aiScenes?: { studioFrameId?: string }[] } }).config?.aiScenes?.[0]?.studioFrameId === generatedFrameId);
  await useKeyframe.click();
  const payload = (await storyboardRequest).postDataJSON() as { config: { aiScenes: { mode: string; studioFrameId: string }[] } };
  expect(payload.config.aiScenes[0]?.mode).toBe("standard");
  expect(payload.config.aiScenes[0]?.studioFrameId).toBe(generatedFrameId);
});

test("mockup region editor supports drawing, keyboard movement and hides a single artwork group", async ({ page }) => {
  await page.goto(`/workflows?id=${workflowId}`);
  await page.locator('.react-flow__node[data-id="mockup"]').click({ position: { x: 80, y: 70 } });
  await page.getByRole("button", { name: "Adjust image" }).click();
  const editor = page.getByLabel("Draw Product region on image");
  await editor.scrollIntoViewIfNeeded();
  const bounds = await editor.boundingBox();
  if (!bounds) throw new Error("Region editor is not visible");
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.8);
  await page.mouse.up();
  const productRegion = page.getByRole("button", { name: /^Product region/ });
  await productRegion.focus();
  await productRegion.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Save image settings" })).toBeEnabled();
  await page.getByRole("button", { name: "Advanced information" }).click();
  await expect(page.getByText("Image role", { exact: true })).toBeVisible();
  await expect(page.getByText("Artwork group", { exact: true })).toHaveCount(0);
});

test("refresh restores review and only current candidate can be approved", async ({ page }) => {
  await page.goto(`/workflows?id=${workflowId}&run=${runId}`);
  await page.locator('.react-flow__node[data-id="review"]').click({ position: { x: 80, y: 40 } });
  await expect(page.getByRole("button", { name: "Approve video" })).toBeEnabled();
  await expect(page.locator("video")).not.toHaveAttribute("autoplay");
  await expect(page.getByText("Snapshot revision 4 · run r8")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download approved ZIP" })).toHaveCount(0);
  const rerenderRequest = page.waitForRequest(request => request.url().endsWith(`/api/workflow-runs/${runId}/actions`) && request.method() === "POST");
  await page.getByRole("button", { name: "Re-render" }).click();
  expect((await rerenderRequest).postDataJSON()).toMatchObject({ action: "rerender", expectedStoryboardFingerprint: storyboard.fingerprint });
  await page.getByRole("combobox", { name: "Video version" }).click();
  await page.getByRole("option", { name: "Version 1 · rejected" }).click();
  await expect(page.getByRole("button", { name: "Approve video" })).toBeDisabled();
  await expect(page.getByText("Only the current completed version can be approved. Older versions remain available from the version menu.")).toBeVisible();
  await page.screenshot({ path: ".next/workflow-ui-results/video-review.png", fullPage: true });
  await page.reload();
  await page.locator('.react-flow__node[data-id="review"]').click({ position: { x: 80, y: 40 } });
  await expect(page.getByText("Snapshot revision 4 · run r8")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve video" })).toBeEnabled();
});
