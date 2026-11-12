import { describe, expect, it } from "vitest";

import { showsInputProduct, supportsBatchVideos } from "@/helpers/workflow-run";
import { buildWorkflowNode } from "@/test/factories";
import type { WorkflowNodeConfig } from "@/types/workflow";

const video = (config: WorkflowNodeConfig) =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });

describe("supportsBatchVideos", () => {
  it("accepts Standard settings without scenes", () => {
    expect(supportsBatchVideos([video({ mode: "standard" })])).toBe(true);
  });

  it("accepts a scene list of Standard scenes only", () => {
    expect(supportsBatchVideos([video({ mode: "standard", aiScenes: [{ mode: "standard" }, { mode: "standard" }] })])).toBe(true);
  });

  it("refuses a scene list with an AI scene, whatever the saved mode says", () => {
    expect(supportsBatchVideos([video({ mode: "standard", aiScenes: [{ mode: "standard" }, { mode: "ai" }] })])).toBe(false);
  });

  it("refuses the Product on Model pack", () => {
    expect(supportsBatchVideos([video({ mode: "standard", template: "product_on_model_pack" })])).toBe(false);
  });

  it("is false without a Generate Video step", () => {
    expect(supportsBatchVideos([])).toBe(false);
  });
});

describe("showsInputProduct", () => {
  const listing = buildWorkflowNode({ id: "listing", data: { type: "generate-listing", label: "Listing content", config: {}, status: "idle" } });

  it("offers the product to a listing-only workflow", () => {
    expect(showsInputProduct([listing])).toBe(true);
  });

  it("hides it once the workflow makes a video, which picks its product at Mockup Approval", () => {
    expect(showsInputProduct([listing, video({ mode: "standard" })])).toBe(false);
    expect(showsInputProduct([video({ mode: "ai_shot" })])).toBe(false);
  });

  it("hides it when nothing in the workflow uses one product", () => {
    expect(showsInputProduct([])).toBe(false);
  });
});
