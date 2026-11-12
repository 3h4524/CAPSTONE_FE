import { describe, expect, it } from "vitest";

import { getAssistantStarterChips } from "@/helpers/assistant-starter-chips";
import { buildWorkflowNode } from "@/test/factories";

const designNode = buildWorkflowNode({
  id: "design",
  data: { type: "design-image", label: "Design image 1", config: {}, status: "idle" },
});

const workflow = (overrides: Partial<Parameters<typeof getAssistantStarterChips>[1]> = {}) => ({
  workflowId: "wf-1",
  isDirty: false,
  nodes: [designNode],
  selectedNodeIds: ["design"],
  ...overrides,
});

describe("getAssistantStarterChips", () => {
  it("offers every workflow chip for a saved workflow with a selected step", () => {
    expect(getAssistantStarterChips("/workflows", workflow())).toEqual([
      "Why did my last run fail?",
      "Explain the selected step",
      "Add a listing content step",
      "Run this workflow",
    ]);
  });

  it("drops the selected step chip when nothing is selected", () => {
    const chips = getAssistantStarterChips("/workflows", workflow({ selectedNodeIds: [] }));

    expect(chips).not.toContain("Explain the selected step");
    expect(chips).toContain("Run this workflow");
  });

  it("drops the selected step chip when the selection points at a step that is gone", () => {
    expect(getAssistantStarterChips("/workflows", workflow({ selectedNodeIds: ["removed"] }))).not.toContain(
      "Explain the selected step"
    );
  });

  it("drops the run chip while the workflow has unsaved changes", () => {
    expect(getAssistantStarterChips("/workflows", workflow({ isDirty: true }))).not.toContain("Run this workflow");
  });

  it("drops the run chip when no workflow is open", () => {
    expect(getAssistantStarterChips("/workflows", workflow({ workflowId: null }))).not.toContain("Run this workflow");
  });

  it("keeps the route chips elsewhere regardless of the canvas", () => {
    expect(getAssistantStarterChips("/dashboard", workflow({ workflowId: null, selectedNodeIds: [] }))).toEqual([
      "What can you help me with?",
      "How do I create my first workflow?",
      "Show my workflows",
    ]);
  });
});
