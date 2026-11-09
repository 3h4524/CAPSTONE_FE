import { describe, expect, it } from "vitest";

import { supportsBatchVideos } from "@/helpers/workflow-run";
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
