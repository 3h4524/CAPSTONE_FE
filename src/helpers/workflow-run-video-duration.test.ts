import { describe, expect, it } from "vitest";

import { findProductVideoDurationIssue, findVideoDurationIssue, videoDurationProblem } from "@/helpers/workflow-run";
import { buildWorkflowNode } from "@/test/factories";
import type { WorkflowNodeConfig } from "@/types/workflow";

const video = (config: WorkflowNodeConfig) =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });

const aiScene = (durationSeconds: number) => ({ mode: "ai", durationSeconds });
const standardScene = (durationSeconds: number) => ({ mode: "standard", durationSeconds });

const PRODUCT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

describe("videoDurationProblem", () => {
  it("accepts a video of 5–15 seconds", () => {
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 5, aiScenes: [aiScene(5)] })).toBeNull();
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 15, aiScenes: [aiScene(8), standardScene(7)] })).toBeNull();
  });

  it("refuses one AI scene of 4 seconds: the video is shorter than 5 seconds", () => {
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 4, aiScenes: [aiScene(4)] })).not.toBeNull();
  });

  it("accepts an AI scene of 4 seconds when the video reaches 5 seconds", () => {
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 6, aiScenes: [aiScene(4), standardScene(2)] })).toBeNull();
  });

  it("refuses an AI scene under 4 seconds", () => {
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 6, aiScenes: [aiScene(3), standardScene(3)] })).not.toBeNull();
  });

  it("refuses a Standard scene list shorter than 5 seconds", () => {
    expect(videoDurationProblem({ mode: "standard", durationSeconds: 5, aiScenes: [standardScene(2), standardScene(2)] })).not.toBeNull();
  });

  it("refuses a video longer than 15 seconds", () => {
    expect(videoDurationProblem({ mode: "ai_shot", durationSeconds: 16, aiScenes: [aiScene(8), aiScene(8)] })).not.toBeNull();
  });

  it("reads the video's duration when it has no scene list", () => {
    expect(videoDurationProblem({ mode: "standard", durationSeconds: 12 })).toBeNull();
    expect(videoDurationProblem({ mode: "standard", durationSeconds: 3 })).not.toBeNull();
  });
});

describe("findVideoDurationIssue", () => {
  it("points at Generate Video when the shared settings are too short", () => {
    const issue = findVideoDurationIssue([video({ mode: "ai_shot", durationSeconds: 4, aiScenes: [aiScene(4)] })]);
    expect(issue?.nodeId).toBe("video");
  });

  it("checks a product's own settings too", () => {
    const nodes = [
      video({
        mode: "ai_shot",
        durationSeconds: 8,
        aiScenes: [aiScene(8)],
        productConfigs: { [PRODUCT_ID]: { mode: "ai_shot", durationSeconds: 4, aiScenes: [aiScene(4)] } },
      }),
    ];
    expect(findVideoDurationIssue(nodes)?.nodeId).toBe("video");
    expect(findProductVideoDurationIssue(nodes)?.nodeId).toBe("video");
  });

  it("finds nothing for settings of the right length, or without a video", () => {
    expect(findVideoDurationIssue([video({ mode: "ai_shot", durationSeconds: 8, aiScenes: [aiScene(8)] })])).toBeNull();
    expect(findVideoDurationIssue([])).toBeNull();
  });
});
