import { describe, expect, it } from "vitest";

import {
  getCopyName,
  getExecutionOrder,
  isConnectionAllowed,
  resolveActiveWorkflowId,
  sortWorkflowSummaries,
} from "@/helpers/workflow-graph";
import { buildWorkflowEdge, buildWorkflowNode, buildWorkflowSummary } from "@/test/factories";
import type { Connection } from "@xyflow/react";

const node = (id: string) => buildWorkflowNode({ id });

const edge = (source: string, target: string) =>
  buildWorkflowEdge({ id: `${source}->${target}`, source, target });

const connection = (source: string, target: string): Connection => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
});

describe("getExecutionOrder", () => {
  it("returns nodes in dependency order", () => {
    const nodes = [node("c"), node("a"), node("b")];
    const edges = [edge("a", "b"), edge("b", "c")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "b", "c"]);
  });

  it("starts each independent component from its own root", () => {
    const nodes = ["a", "b", "x", "y"].map(node);
    const edges = [edge("a", "b"), edge("x", "y")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "x", "b", "y"]);
  });

  it("runs every branch before the node that joins them", () => {
    const nodes = ["a", "b", "c", "d"].map(node);
    const edges = [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns every node when there are no edges", () => {
    const nodes = [node("a"), node("b")];

    expect(getExecutionOrder(nodes, [])).toEqual(["a", "b"]);
  });
});

describe("isConnectionAllowed", () => {
  it("rejects a connection with an empty endpoint", () => {
    expect(isConnectionAllowed(connection("", "b"), [])).toBe(false);
  });

  it("rejects a self connection", () => {
    expect(isConnectionAllowed(connection("a", "a"), [])).toBe(false);
  });

  it("rejects a duplicate edge", () => {
    expect(isConnectionAllowed(connection("a", "b"), [edge("a", "b")])).toBe(false);
  });

  it("rejects a connection that would create a cycle", () => {
    const edges = [edge("a", "b"), edge("b", "c")];

    expect(isConnectionAllowed(connection("c", "a"), edges)).toBe(false);
  });

  it("accepts a new forward connection", () => {
    expect(isConnectionAllowed(connection("a", "b"), [edge("b", "c")])).toBe(true);
  });

  it("rejects an existing WorkflowEdge reused as a connection", () => {
    const existing = edge("a", "b");

    expect(isConnectionAllowed(existing, [existing])).toBe(false);
  });
});

describe("getCopyName", () => {
  it("appends copy when the base name is free", () => {
    expect(getCopyName("Winter drop", [])).toBe("Winter drop copy");
  });

  it("matches existing names case-insensitively", () => {
    expect(getCopyName("Winter drop", ["winter drop copy"])).toBe("Winter drop copy 2");
  });

  it("skips already taken indexes", () => {
    expect(getCopyName("Winter drop", ["Winter drop copy", "Winter drop copy 2"])).toBe(
      "Winter drop copy 3"
    );
  });
});

describe("sortWorkflowSummaries", () => {
  it("orders by most recently updated first without mutating the input", () => {
    const workflows = [
      buildWorkflowSummary({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }),
      buildWorkflowSummary({ id: "new", updatedAt: "2026-02-01T00:00:00Z" }),
    ];

    expect(sortWorkflowSummaries(workflows).map((item) => item.id)).toEqual(["new", "old"]);
    expect(workflows.map((item) => item.id)).toEqual(["old", "new"]);
  });
});

describe("resolveActiveWorkflowId", () => {
  const workflows = [
    buildWorkflowSummary({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }),
    buildWorkflowSummary({ id: "new", updatedAt: "2026-02-01T00:00:00Z" }),
  ];

  it("keeps the requested id when it exists", () => {
    expect(resolveActiveWorkflowId(workflows, "old")).toBe("old");
  });

  it("falls back to the most recently updated workflow", () => {
    expect(resolveActiveWorkflowId(workflows, "missing")).toBe("new");
  });

  it("returns null when there are no workflows", () => {
    expect(resolveActiveWorkflowId([], "missing")).toBeNull();
  });
});