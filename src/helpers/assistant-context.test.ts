import { describe, expect, it } from "vitest";

import { ASSISTANT_CANVAS_MAX_NODES, ASSISTANT_ROUTE_MAX_LENGTH } from "@/constants/assistant";
import { buildAssistantContext } from "@/helpers/assistant-context";
import { buildWorkflowEdge, buildWorkflowNode } from "@/test/factories";
import type { WorkflowNode } from "@/types/workflow";

const workflow = (overrides: Partial<Parameters<typeof buildAssistantContext>[0]["workflow"]> = {}) => ({
  workflowId: "wf-1",
  revision: 4,
  isDirty: true,
  nodes: [buildWorkflowNode({ id: "a" }), buildWorkflowNode({ id: "b" })],
  edges: [buildWorkflowEdge({ id: "e", source: "a", target: "b" })],
  selectedNodeIds: ["b"],
  videoRunId: "run-store",
  ...overrides,
});

describe("buildAssistantContext", () => {
  it("returns no canvas outside the workflow editor", () => {
    const context = buildAssistantContext({ pathname: "/dashboard", search: "", workflow: workflow() });

    expect(context).toEqual({ route: "/dashboard", workflowId: null, runId: null, selectedNodeIds: [], canvas: null });
  });

  it("includes the canvas when the open workflow matches the url", () => {
    const context = buildAssistantContext({ pathname: "/workflows", search: "?id=wf-1", workflow: workflow() });

    expect(context.workflowId).toBe("wf-1");
    expect(context.selectedNodeIds).toEqual(["b"]);
    expect(context.canvas).toMatchObject({ workflowId: "wf-1", revision: 4, isDirty: true });
    expect(context.canvas?.nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(context.canvas?.edges).toEqual([{ id: "e", source: "a", target: "b" }]);
  });

  it("returns no canvas when the url points at another workflow", () => {
    const context = buildAssistantContext({ pathname: "/workflows", search: "?id=other", workflow: workflow() });

    expect(context.canvas).toBeNull();
    expect(context.workflowId).toBeNull();
  });

  it("prefers the run in the url over the stored run", () => {
    const fromUrl = buildAssistantContext({ pathname: "/workflows", search: "?id=wf-1&run=run-url", workflow: workflow() });
    const fromStore = buildAssistantContext({ pathname: "/workflows", search: "?id=wf-1", workflow: workflow() });

    expect(fromUrl.runId).toBe("run-url");
    expect(fromStore.runId).toBe("run-store");
  });

  it("caps the number of nodes and drops edges that lose an endpoint", () => {
    const nodes: WorkflowNode[] = Array.from({ length: ASSISTANT_CANVAS_MAX_NODES + 5 }, (_, index) => buildWorkflowNode({ id: `n${index}` }));
    const edges = [buildWorkflowEdge({ id: "keep", source: "n0", target: "n1" }), buildWorkflowEdge({ id: "drop", source: "n0", target: `n${ASSISTANT_CANVAS_MAX_NODES + 1}` })];

    const context = buildAssistantContext({ pathname: "/workflows", search: "?id=wf-1", workflow: workflow({ nodes, edges }) });

    expect(context.canvas?.nodes).toHaveLength(ASSISTANT_CANVAS_MAX_NODES);
    expect(context.canvas?.edges.map((edge) => edge.id)).toEqual(["keep"]);
  });

  it("replaces an oversized node config with an empty object", () => {
    const big = buildWorkflowNode({ id: "big", data: { type: "product-input", label: "Big", config: { blob: "x".repeat(9000) }, status: "idle" } });

    const context = buildAssistantContext({ pathname: "/workflows", search: "?id=wf-1", workflow: workflow({ nodes: [big], edges: [] }) });

    expect(context.canvas?.nodes[0]?.config).toEqual({});
  });

  it("truncates a very long route", () => {
    const context = buildAssistantContext({ pathname: "/dashboard", search: `?q=${"a".repeat(500)}`, workflow: workflow() });

    expect(context.route).toHaveLength(ASSISTANT_ROUTE_MAX_LENGTH);
  });
});
