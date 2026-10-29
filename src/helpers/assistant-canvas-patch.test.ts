import { describe, expect, it } from "vitest";

import { applyCanvasPatch, describeCanvasOperation, mergeConfig } from "@/helpers/assistant-canvas-patch";
import { buildWorkflowEdge, buildWorkflowNode } from "@/test/factories";
import type { AssistantCanvasOperation } from "@/types/assistant";
import type { WorkflowNode } from "@/types/workflow";

const input = buildWorkflowNode({ id: "a", position: { x: 100, y: 40 }, data: { type: "product-input", label: "Product Input", config: { keep: 1 }, status: "idle" } });
const mockup = buildWorkflowNode({ id: "b", position: { x: 500, y: 40 }, data: { type: "apply-mockup", label: "Apply Mockup", config: {}, status: "idle" } });
const link = buildWorkflowEdge({ id: "a->b", source: "a", target: "b" });

const patch = (operations: AssistantCanvasOperation[], nodes: WorkflowNode[] = [input, mockup], edges = [link]) =>
  applyCanvasPatch(nodes, edges, operations);

describe("applyCanvasPatch", () => {
  it("adds a node and connects it by ref", () => {
    const result = patch([
      { op: "add_node", ref: "n1", type: "generate-listing", label: "Listing", after: "a" },
      { op: "connect", source: "a", target: "n1" },
    ]);

    expect(result.skipped).toEqual([]);
    expect(result.applied).toBe(2);
    const added = result.nodes.find((node) => node.data.label === "Listing");
    expect(added?.data.type).toBe("generate-listing");
    expect(result.edges.some((edge) => edge.source === "a" && edge.target === added?.id)).toBe(true);
  });

  it("places a new node to the right of the node it follows", () => {
    const result = patch([{ op: "add_node", ref: "n1", type: "generate-listing", after: "a" }]);

    const added = result.nodes.at(-1);
    expect(added?.position.y).toBe(40);
    expect(added?.position.x).toBeGreaterThan(100);
  });

  it("places a new node in a fresh column when no anchor is given", () => {
    const result = patch([{ op: "add_node", ref: "n1", type: "generate-listing" }]);

    expect(result.nodes.at(-1)?.position.x).toBeGreaterThan(500);
  });

  it("skips a connection that would skip an approval step", () => {
    const withGate = buildWorkflowNode({ id: "g", data: { type: "approval-gate", label: "Mockup Approval", config: {}, status: "idle" } });
    const video = buildWorkflowNode({ id: "v", data: { type: "generate-video", label: "Generate Video", config: {}, status: "idle" } });

    const result = patch([{ op: "connect", source: "b", target: "v" }], [input, mockup, withGate, video], []);

    expect(result.applied).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.edges).toEqual([]);
  });

  it("removes a node together with its connections", () => {
    const result = patch([{ op: "remove_node", nodeId: "b" }]);

    expect(result.nodes.map((node) => node.id)).toEqual(["a"]);
    expect(result.edges).toEqual([]);
  });

  it("disconnects two steps and skips a missing connection", () => {
    const first = patch([{ op: "disconnect", source: "a", target: "b" }]);
    const second = patch([{ op: "disconnect", source: "b", target: "a" }]);

    expect(first.edges).toEqual([]);
    expect(second.skipped).toHaveLength(1);
  });

  it("merges config shallowly and renames", () => {
    const result = patch([
      { op: "update_config", nodeId: "a", config: { added: 2 } },
      { op: "rename_node", nodeId: "a", label: "Start" },
    ]);

    const updated = result.nodes.find((node) => node.id === "a");
    expect(updated?.data.config).toEqual({ keep: 1, added: 2 });
    expect(updated?.data.label).toBe("Start");
  });

  it("skips operations on unknown steps without throwing", () => {
    const result = patch([
      { op: "remove_node", nodeId: "zzz" },
      { op: "update_config", nodeId: "zzz", config: { x: 1 } },
      { op: "rename_node", nodeId: "zzz", label: "x" },
      { op: "connect", source: "a", target: "zzz" },
    ]);

    expect(result.applied).toBe(0);
    expect(result.skipped).toHaveLength(4);
  });

  it("skips an add_node with an unknown type", () => {
    const result = patch([{ op: "add_node", ref: "n1", type: "nope" as never }]);

    expect(result.skipped[0]?.reason).toMatch(/type/i);
  });

  it("does not mutate its inputs", () => {
    const nodes = [input, mockup];
    const edges = [link];

    patch([{ op: "remove_node", nodeId: "a" }, { op: "update_config", nodeId: "b", config: { z: 1 } }], nodes, edges);

    expect(nodes).toEqual([input, mockup]);
    expect(edges).toEqual([link]);
    expect(input.data.config).toEqual({ keep: 1 });
  });
});

describe("describeCanvasOperation", () => {
  it("describes operations with step labels", () => {
    const nodes = [input, mockup];

    expect(describeCanvasOperation({ op: "add_node", type: "generate-listing", after: "a" }, nodes)).toContain('after "Product Input"');
    expect(describeCanvasOperation({ op: "connect", source: "a", target: "b" }, nodes)).toBe('Connect "Product Input" → "Apply Mockup"');
    expect(describeCanvasOperation({ op: "update_config", nodeId: "b" }, nodes)).toBe('Change settings of "Apply Mockup"');
  });
});

describe("mergeConfig", () => {
  it("merges nested objects instead of replacing them", () => {
    const merged = mergeConfig({ standardOptions: { motionPreset: "zoom", transition: "none" }, keep: 1 }, { standardOptions: { transition: "fade" } });

    expect(merged).toEqual({ standardOptions: { motionPreset: "zoom", transition: "fade" }, keep: 1 });
  });

  it("replaces arrays and primitives wholesale", () => {
    expect(mergeConfig({ ids: ["a", "b"], count: 1 }, { ids: ["c"], count: 2 })).toEqual({ ids: ["c"], count: 2 });
  });

  it("does not mutate its inputs", () => {
    const current = { nested: { a: 1 } };

    mergeConfig(current, { nested: { b: 2 } });

    expect(current).toEqual({ nested: { a: 1 } });
  });

  it("applies a nested update_config through the patch without losing sibling keys", () => {
    const video = buildWorkflowNode({
      id: "v",
      data: { type: "generate-video", label: "Video", config: { standardOptions: { motionPreset: "zoom", transition: "none" } }, status: "idle" },
    });

    const result = applyCanvasPatch([video], [], [{ op: "update_config", nodeId: "v", config: { standardOptions: { transition: "fade" } } }]);

    expect(result.nodes[0]?.data.config).toEqual({ standardOptions: { motionPreset: "zoom", transition: "fade" } });
  });
});
