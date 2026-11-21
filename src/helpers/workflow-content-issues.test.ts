import { beforeEach, describe, expect, it } from "vitest";

import { reportWorkflowContentIssues, workflowContentIssues } from "@/helpers/workflow-content-issues";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowContentIssuesStore } from "@/stores/workflow-content-issues";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";

const node = (id: string, type: WorkflowNodeType) =>
  ({ id, type: "workflow", position: { x: 0, y: 0 }, data: { type, label: type, config: {}, status: "idle" } }) as unknown as WorkflowNode;

const nodes = [node("input", "product-input"), node("prompt", "prompt-synthesis"), node("video", "generate-video")];

const blocked = (where: string) => ({
  response: {
    status: 400,
    data: {
      code: "ContentPolicyViolation",
      detail: `This content was blocked by the content policy because it appears to contain Hate${where}. Change it and try again.`,
    },
  },
});

describe("workflowContentIssues", () => {
  it("marks the prompt step's extra instructions a run start was refused for", () => {
    expect(workflowContentIssues(blocked(" (in the job instructions)"), nodes)).toEqual([
      { nodeId: "prompt", field: "instructions", message: expect.stringContaining("(in the job instructions)") },
    ]);
  });

  it("marks the keyframe prompt of the scene a save was refused for", () => {
    expect(workflowContentIssues(blocked(" (in scene 2 keyframe prompt)"), nodes)).toEqual([
      { nodeId: "video", field: "aiScenes.1.studioPrompt", message: expect.any(String) },
    ]);
  });

  it("marks the custom video prompt of the scene a save was refused for", () => {
    expect(workflowContentIssues(blocked(" (in scene 1 custom prompt)"), nodes)).toEqual([
      { nodeId: "video", field: "aiScenes.0.customPrompt", message: expect.any(String) },
    ]);
  });

  it("marks the video step itself for scene text with no field on screen", () => {
    expect(workflowContentIssues(blocked(" (in the shared scene directions)"), nodes)).toEqual([
      { nodeId: "video", field: null, message: expect.any(String) },
    ]);
  });

  it("marks nothing for a refusal that names no workflow setting, or for any other failure", () => {
    expect(workflowContentIssues(blocked(""), nodes)).toEqual([]);
    expect(workflowContentIssues(blocked(" (in the product name)"), nodes)).toEqual([]);
    expect(workflowContentIssues({ response: { status: 409, data: { code: "StaleRevision", detail: "Workflow changed." } } }, nodes)).toEqual([]);
  });
});

describe("reportWorkflowContentIssues", () => {
  beforeEach(() => {
    useWorkflowContentIssuesStore.getState().clear();
    useWorkflowStore.setState({ nodes, selectedNodeIds: [] });
  });

  it("keeps the issue and opens the step it is on, until the seller changes the field", () => {
    reportWorkflowContentIssues(blocked(" (in the job instructions)"));

    expect(useWorkflowContentIssuesStore.getState().issues).toHaveLength(1);
    expect(useWorkflowStore.getState().selectedNodeIds).toEqual(["prompt"]);

    useWorkflowContentIssuesStore.getState().resolve("prompt", "instructions");
    expect(useWorkflowContentIssuesStore.getState().issues).toEqual([]);
  });
});
