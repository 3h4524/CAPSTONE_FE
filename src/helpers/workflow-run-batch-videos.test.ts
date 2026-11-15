import { describe, expect, it } from "vitest";

import { hasServerPart, runsPerDesign, showsInputProduct, supportsBatchVideos } from "@/helpers/workflow-run";
import { buildWorkflowNode } from "@/test/factories";
import type { WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

const video = (config: WorkflowNodeConfig) =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });

const step = (type: WorkflowNodeType) => buildWorkflowNode({ id: type, data: { type, label: type, config: {}, status: "idle" } });

const listing = step("generate-listing");
const approval = step("approval-gate");
const printify = step("publish-printify");

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

describe("runsPerDesign", () => {
  it("runs a video that fits every design for each design approved at Mockup Approval", () => {
    expect(runsPerDesign([approval, video({ mode: "standard" })])).toBe(true);
  });

  it("runs a video that fits one product only for that product", () => {
    expect(runsPerDesign([approval, video({ mode: "standard", template: "product_on_model_pack" })])).toBe(false);
  });

  it("runs publishing or listing content without a video for each design approved at Mockup Approval", () => {
    expect(runsPerDesign([approval, printify])).toBe(true);
    expect(runsPerDesign([approval, listing])).toBe(true);
    expect(hasServerPart([approval, listing])).toBe(true);
  });

  it("has nothing to run per design without Mockup Approval", () => {
    expect(runsPerDesign([listing])).toBe(false);
    expect(runsPerDesign([])).toBe(false);
  });
});

describe("showsInputProduct", () => {
  it("offers the product to a listing-only workflow", () => {
    expect(showsInputProduct([listing])).toBe(true);
  });

  it("hides it once the workflow makes a video, which picks its product at Mockup Approval", () => {
    expect(showsInputProduct([listing, video({ mode: "standard" })])).toBe(false);
    expect(showsInputProduct([video({ mode: "ai_shot" })])).toBe(false);
  });

  it("hides it when the listing follows Mockup Approval, which runs for each approved design", () => {
    expect(showsInputProduct([approval, listing])).toBe(false);
    expect(showsInputProduct([approval, listing, printify])).toBe(false);
  });

  it("hides it when nothing in the workflow uses one product", () => {
    expect(showsInputProduct([])).toBe(false);
  });
});
