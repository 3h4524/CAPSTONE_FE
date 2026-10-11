import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { clampRegion, createRegion, moveRegion, resizeRegion } from "@/helpers/regions";
import { moveScene, resetVideoTemplateConfig } from "@/helpers/video-scenes";
import { getTemplateAvailability, recommendVideoTemplate } from "@/helpers/video-templates";
import { isConnectionAllowed, toWorkflowDefinition, toWorkflowEdges, toWorkflowNodes, validateWorkflow } from "@/helpers/workflow-graph";
import { toCanvasStatus } from "@/helpers/workflow-run";
import { generateVideoConfigSchema, videoAssetSelectionSchema } from "@/schemas/workflow";
import type { MockupAsset, VideoTemplateCatalogItem } from "@/types/video-workflow";

const mockup = "bd48d15b-57b9-47b9-84cc-d30a0fb6ad59";
const config = { mode: "standard", target: "etsy", template: "auto", templateVersion: 2, durationSeconds: 12, assetSelection: "automatic", selectedMockupIds: [], sceneOrder: [], textOverlay: "", standardOptions: { motionPreset: "gentle", crop: "safe", transition: "fade" }, fallbackToStandard: true };
const asset = (overrides: Partial<MockupAsset> = {}): MockupAsset => ({
  id: crypto.randomUUID(), productId: mockup, sourceType: "upload", role: "Hero", artworkGroupKey: mockup,
  variantKey: null, revision: 1, approvalStatus: "approved", approvedRevision: 1, width: 1200, height: 1600,
  regions: { focalPoint: { x: 0.5, y: 0.5 }, product: null, artwork: null, detail: null },
  previewUrl: "/fixture-mockup.svg", warnings: [], ...overrides,
});
const template = (overrides: Partial<VideoTemplateCatalogItem> = {}): VideoTemplateCatalogItem => ({
  code: "product_showcase", version: 2, name: "Product Showcase", description: "Product first",
  previewVideoUrl: "/video-templates/product-showcase-v2.mp4", defaultDurationSeconds: 12,
  defaultTransition: "fade", defaultMotionPreset: "varied",
  requirements: { minimumAssets: 1, requiresDetail: false, minimumVariants: 0 }, ...overrides,
});

for (const duration of [3, 12, 15]) test(`accepts duration ${duration}`, () => assert.equal(generateVideoConfigSchema.parse({ ...config, durationSeconds: duration }).durationSeconds, duration));
for (const duration of [2, 16, 3.5]) test(`rejects duration ${duration}`, () => assert.equal(generateVideoConfigSchema.safeParse({ ...config, durationSeconds: duration }).success, false));
for (const template of ["auto", "product_showcase", "design_detail", "variant_showcase"]) test(`preserves template ${template}`, () => assert.equal(generateVideoConfigSchema.parse({ ...config, template }).template, template));
for (const motionPreset of ["gentle", "contain_gentle", "static", "zoom", "zoom_out", "pan", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"])
  test(`accepts motion ${motionPreset}`, () => assert.equal(generateVideoConfigSchema.parse({ ...config, standardOptions: { ...config.standardOptions, motionPreset } }).standardOptions.motionPreset, motionPreset));
test("accepts distinct motion for each scene", () => assert.deepEqual(generateVideoConfigSchema.parse({ ...config, standardOptions: { ...config.standardOptions, motionPreset: "varied" }, sceneMotionPresets: ["zoom", "pan_left", "diagonal_up_right", "zoom_out"] }).sceneMotionPresets, ["zoom", "pan_left", "diagonal_up_right", "zoom_out"]));
test("new workflows default to varied motion", () => {
  const videoNode = DEFAULT_WORKFLOW_DEFINITION.nodes.find(node => node.type === "generate-video");
  const options = videoNode?.config.standardOptions as { motionPreset: string } | undefined;
  assert.equal(options?.motionPreset, "varied");
  assert.equal(videoNode?.config.template, "auto");
  assert.equal(videoNode?.config.templateVersion, 2);
  assert.equal(videoNode?.config.durationSeconds, 12);
});
test("rejects unsupported or more than four scene motions", () => {
  assert.equal(generateVideoConfigSchema.safeParse({ ...config, sceneMotionPresets: ["spin"] }).success, false);
  assert.equal(generateVideoConfigSchema.safeParse({ ...config, sceneMotionPresets: ["zoom", "pan", "static", "zoom_out", "pan_up"] }).success, false);
});
test("manual selection requires a mockup", () => assert.equal(generateVideoConfigSchema.safeParse({ ...config, assetSelection: "manual" }).success, false));
test("duplicate source IDs are rejected", () => assert.equal(generateVideoConfigSchema.safeParse({ ...config, selectedMockupIds: [mockup, mockup] }).success, false));
test("duplicate scene IDs are rejected", () => assert.equal(generateVideoConfigSchema.safeParse({ ...config, sceneOrder: [mockup, mockup] }).success, false));
test("assets form is independent of an invalid duration", () => assert.deepEqual(videoAssetSelectionSchema.parse({ ...config, durationSeconds: 0 }), { assetSelection: "automatic", selectedMockupIds: [], sceneOrder: [] }));
test("scene reorder does not mutate the original", () => { const original = ["hero", "detail", "variant"]; assert.deepEqual(moveScene(original, 1, -1), ["detail", "hero", "variant"]); assert.deepEqual(original, ["hero", "detail", "variant"]); });
test("out-of-range scene reorder preserves order", () => assert.deepEqual(moveScene(["hero", "detail"], 0, -1), ["hero", "detail"]));
test("scene reorder keeps motion override attached to the same image", () => {
  const ids = ["hero", "detail", "variant"];
  const motions = ["zoom", null, "pan_left"];
  assert.deepEqual(moveScene(ids, 2, -1), ["hero", "variant", "detail"]);
  assert.deepEqual(moveScene(motions, 2, -1), ["zoom", "pan_left", null]);
});
test("reset to template clears every scene override", () => {
  const reset = resetVideoTemplateConfig({ ...config, template: "design_detail", assetSelection: "manual", selectedMockupIds: [mockup], sceneOrder: [mockup], sceneMotionPresets: ["zoom"] });
  assert.deepEqual({ template: reset.template, templateVersion: reset.templateVersion, assetSelection: reset.assetSelection, selectedMockupIds: reset.selectedMockupIds, sceneOrder: reset.sceneOrder, sceneMotionPresets: reset.sceneMotionPresets }, {
    template: "auto", templateVersion: 2, assetSelection: "automatic", selectedMockupIds: [], sceneOrder: [], sceneMotionPresets: [],
  });
});
test("template recommendation prioritizes variants, then detail, then product", () => {
  assert.equal(recommendVideoTemplate([asset({ variantKey: "blue" }), asset({ variantKey: "red" })]).code, "variant_showcase");
  assert.equal(recommendVideoTemplate([asset({ role: "ArtworkDetail" })]).code, "design_detail");
  assert.equal(recommendVideoTemplate([asset()]).code, "product_showcase");
});
test("template availability explains missing variant and detail requirements", () => {
  const hero = asset();
  assert.deepEqual(getTemplateAvailability(template({ requirements: { minimumAssets: 1, requiresDetail: true, minimumVariants: 0 } }), [hero]), { available: false, reason: "Add an Artwork Detail image or mark a detail region." });
  assert.deepEqual(getTemplateAvailability(template({ requirements: { minimumAssets: 2, requiresDetail: false, minimumVariants: 2 } }), [hero]), { available: false, reason: "Approve at least 2 mockups." });
  assert.equal(getTemplateAvailability(template(), [hero]).available, true);
});
test("template availability tolerates missing catalog requirements", () => {
  const hero = asset();
  assert.equal(getTemplateAvailability(template({ requirements: null }), [hero]).available, true);
  assert.deepEqual(getTemplateAvailability(template({ code: "variant_showcase", requirements: null }), [hero]), { available: false, reason: "Approve at least 2 mockups." });
  assert.deepEqual(getTemplateAvailability(template({ code: "design_detail", requirements: null }), [hero]), { available: false, reason: "Add an Artwork Detail image or mark a detail region." });
});
test("region drawing and keyboard-style adjustments stay inside the image", () => {
  assert.deepEqual(createRegion({ x: 0.8, y: 0.9 }, { x: 0.2, y: 0.3 }), { x: 0.2, y: 0.3, width: 0.6, height: 0.6 });
  assert.deepEqual(moveRegion({ x: 0.8, y: 0.8, width: 0.3, height: 0.3 }, 0.1, 0.1), { x: 0.7, y: 0.7, width: 0.3, height: 0.3 });
  assert.deepEqual(resizeRegion({ x: 0.8, y: 0.8, width: 0.1, height: 0.1 }, 0.5, 0.5), { x: 0.8, y: 0.8, width: 0.2, height: 0.2 });
  assert.deepEqual(clampRegion({ x: -1, y: -1, width: 0.001, height: 0.001 }), { x: 0, y: 0, width: 0.04, height: 0.04 });
});
test("default pipeline cannot bypass either approval gate", () => {
  const nodes = toWorkflowNodes(DEFAULT_WORKFLOW_DEFINITION);
  const edges = toWorkflowEdges(DEFAULT_WORKFLOW_DEFINITION);
  const generate = nodes.find(n => n.data.type === "generate-video")!;
  const mockups = nodes.find(n => n.data.type === "apply-mockup")!;
  const output = nodes.find(n => n.data.type === "export-zip")!;
  assert.equal(isConnectionAllowed({ source: mockups.id, target: generate.id, sourceHandle: null, targetHandle: null }, [], nodes), false);
  assert.equal(isConnectionAllowed({ source: generate.id, target: output.id, sourceHandle: null, targetHandle: null }, [], nodes), false);
  assert.equal(validateWorkflow(nodes.filter(n => n.data.type !== "review-video"), edges).some(i => i.id === "mvp-pipeline"), true);
});
test("valid configured default workflow has no graph errors", () => {
  const nodes = toWorkflowNodes(DEFAULT_WORKFLOW_DEFINITION);
  nodes.find(n => n.data.type === "product-input")!.data.config = { batchId: mockup, productId: mockup };
  const prompt = nodes.find(n => n.data.type === "prompt-synthesis")!;
  prompt.data.config = { ...prompt.data.config, designTemplateId: mockup };
  const mockups = nodes.find(n => n.data.type === "apply-mockup")!;
  mockups.data.config = { ...mockups.data.config, mockupTemplateIds: [mockup] };
  assert.deepEqual(validateWorkflow(nodes, toWorkflowEdges(DEFAULT_WORKFLOW_DEFINITION)), []);
  assert.equal(toWorkflowDefinition(nodes, toWorkflowEdges(DEFAULT_WORKFLOW_DEFINITION), { x: 0, y: 0, zoom: 1 }).version, 2);
});
for (const [backend, canvas] of [["succeeded", "success"], ["waiting_for_input", "waiting_for_input"], ["waiting_for_review", "waiting_for_review"], ["cancelled", "cancelled"], ["running", "running"], ["failed", "failed"], ["pending", "idle"]]) test(`maps persisted ${backend} state`, () => assert.equal(toCanvasStatus(backend), canvas));
