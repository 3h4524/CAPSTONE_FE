import { describe, expect, it } from "vitest";

import { settingsFitEveryDesign, showsInputProduct, supportsBatchVideos } from "@/helpers/workflow-run";
import { buildWorkflowNode } from "@/test/factories";
import type { WorkflowNodeConfig } from "@/types/workflow";

const video = (config: WorkflowNodeConfig) =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });

describe("supportsBatchVideos", () => {
  it("runs every video workflow as a batch video run, whatever its settings", () => {
    expect(supportsBatchVideos([video({ mode: "standard" })])).toBe(true);
    expect(supportsBatchVideos([video({ mode: "ai_shot" })])).toBe(true);
    expect(supportsBatchVideos([video({ mode: "standard", aiScenes: [{ mode: "standard" }, { mode: "ai" }] })])).toBe(true);
    expect(supportsBatchVideos([video({ mode: "ai_shot", template: "product_on_model_pack" })])).toBe(true);
  });

  it("is false without a Generate Video step", () => {
    expect(supportsBatchVideos([])).toBe(false);
  });
});

describe("settingsFitEveryDesign", () => {
  it("accepts Standard settings without scenes", () => {
    expect(settingsFitEveryDesign([video({ mode: "standard" })])).toBe(true);
  });

  it("accepts a scene list of Standard scenes only", () => {
    expect(settingsFitEveryDesign([video({ mode: "standard", aiScenes: [{ mode: "standard" }, { mode: "standard" }] })])).toBe(true);
  });

  it("refuses a scene list with an AI scene, whatever the saved mode says", () => {
    expect(settingsFitEveryDesign([video({ mode: "standard", aiScenes: [{ mode: "standard" }, { mode: "ai" }] })])).toBe(false);
  });

  it("refuses the Product on Model pack", () => {
    expect(settingsFitEveryDesign([video({ mode: "standard", template: "product_on_model_pack" })])).toBe(false);
  });

  it("is false without a Generate Video step", () => {
    expect(settingsFitEveryDesign([])).toBe(false);
  });
});

describe("showsInputProduct", () => {
  const listing = buildWorkflowNode({ id: "listing", data: { type: "generate-listing", label: "Listing content", config: {}, status: "idle" } });

  it("offers the product to a listing-only workflow", () => {
    expect(showsInputProduct([listing])).toBe(true);
  });

  it("hides it once the workflow makes a video, which makes one for every approved design", () => {
    expect(showsInputProduct([listing, video({ mode: "standard" })])).toBe(false);
    expect(showsInputProduct([video({ mode: "ai_shot" })])).toBe(false);
  });

  it("hides it when nothing in the workflow uses one product", () => {
    expect(showsInputProduct([])).toBe(false);
  });
});
