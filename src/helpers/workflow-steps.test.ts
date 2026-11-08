import { describe, expect, it } from "vitest";

import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { toWorkflowEdges, toWorkflowNodes, validateWorkflow } from "@/helpers/workflow-graph";
import { getAddableStepTypes, insertStep, orderSteps, removeStep } from "@/helpers/workflow-steps";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

const nodes = toWorkflowNodes(DEFAULT_WORKFLOW_DEFINITION);
const edges = toWorkflowEdges(DEFAULT_WORKFLOW_DEFINITION);

const typesOf = (list: WorkflowNode[]) => list.map((node) => node.data.type);
const idOf = (list: WorkflowNode[], type: string) => list.find((node) => node.data.type === type)?.id;
const isConnected = (list: WorkflowEdge[], source?: string, target?: string) =>
  list.some((edge) => edge.source === source && edge.target === target);
const notConnectedIssues = (list: WorkflowNode[], graph: WorkflowEdge[]) =>
  validateWorkflow(list, graph).filter((issue) => issue.id.startsWith("unreachable-"));

describe("orderSteps", () => {
  it("lists the default workflow in run order", () => {
    expect(typesOf(orderSteps(nodes, edges))).toEqual([
      "product-input",
      "prompt-synthesis",
      "design-image",
      "design-approval",
      "apply-mockup",
      "approval-gate",
      "generate-video",
      "review-video",
      "export-zip",
    ]);
  });

  it("keeps a step that is not connected yet at its place in the run", () => {
    const ordered = orderSteps([...nodes].reverse(), []);
    expect(typesOf(ordered)[0]).toBe("product-input");
    expect(typesOf(ordered).at(-1)).toBe("export-zip");
  });
});

describe("removeStep", () => {
  it("joins the steps either side of a removed step", () => {
    const removed = idOf(nodes, "design-approval") as string;
    const result = removeStep(removed, nodes, edges);

    expect(result.nodes.some((node) => node.id === removed)).toBe(false);
    expect(isConnected(result.edges, idOf(nodes, "design-image"), idOf(nodes, "apply-mockup"))).toBe(true);
    expect(notConnectedIssues(result.nodes, result.edges)).toEqual([]);
  });

  it("leaves no edge pointing at the removed step", () => {
    const removed = idOf(nodes, "prompt-synthesis") as string;
    const result = removeStep(removed, nodes, edges);

    expect(result.edges.some((edge) => edge.source === removed || edge.target === removed)).toBe(false);
  });

  it("removes the first step without inventing a connection", () => {
    const result = removeStep(idOf(nodes, "product-input") as string, nodes, edges);

    expect(result.edges).toHaveLength(edges.length - 1);
  });
});

describe("insertStep", () => {
  it("puts a step back between its neighbours", () => {
    const removed = removeStep(idOf(nodes, "design-approval") as string, nodes, edges);
    const { nodes: nextNodes, edges: nextEdges, step } = insertStep("design-approval", removed.nodes, removed.edges);

    expect(isConnected(nextEdges, idOf(nodes, "design-image"), step.id)).toBe(true);
    expect(isConnected(nextEdges, step.id, idOf(nodes, "apply-mockup"))).toBe(true);
    expect(isConnected(nextEdges, idOf(nodes, "design-image"), idOf(nodes, "apply-mockup"))).toBe(false);
    expect(typesOf(orderSteps(nextNodes, nextEdges))).toEqual(typesOf(orderSteps(nodes, edges)));
    expect(notConnectedIssues(nextNodes, nextEdges)).toEqual([]);
  });

  it("adds the first step ahead of the rest", () => {
    const removed = removeStep(idOf(nodes, "product-input") as string, nodes, edges);
    const { edges: nextEdges, step } = insertStep("product-input", removed.nodes, removed.edges);

    expect(isConnected(nextEdges, step.id, idOf(nodes, "prompt-synthesis"))).toBe(true);
  });

  it("hangs a listing off the run, before the export", () => {
    const { nodes: nextNodes, edges: nextEdges, step } = insertStep("generate-listing", nodes, edges);

    expect(isConnected(nextEdges, step.id, idOf(nodes, "export-zip"))).toBe(true);
    expect(notConnectedIssues(nextNodes, nextEdges)).toEqual([]);
  });
});

describe("getAddableStepTypes", () => {
  it("offers a run step only when the workflow does not have it", () => {
    const withoutApproval = nodes.filter((node) => node.data.type !== "design-approval");

    expect(getAddableStepTypes(["design-approval", "design-image"], withoutApproval)).toEqual(["design-approval"]);
  });

  it("keeps offering a step outside the run order", () => {
    expect(getAddableStepTypes(["generate-listing"], nodes)).toEqual(["generate-listing"]);
  });
});
