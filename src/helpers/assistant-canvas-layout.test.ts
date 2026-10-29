import { describe, expect, it } from "vitest";

import { ASSISTANT_LAYOUT_GAPS } from "@/constants/assistant";
import { NODE_CARD_WIDTHS } from "@/constants/workflow";
import { arrangeNodes, describeArrangement } from "@/helpers/assistant-canvas-layout";
import { buildWorkflowEdge, buildWorkflowNode } from "@/test/factories";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";

const node = (id: string, x = 0, y = 0, type: WorkflowNodeType = "product-input"): WorkflowNode =>
  buildWorkflowNode({ id, position: { x, y }, measured: { width: NODE_CARD_WIDTHS[type], height: 200 }, data: { type, label: id, config: {}, status: "idle" } });

const edge = (source: string, target: string) => buildWorkflowEdge({ id: `${source}->${target}`, source, target });

const chain = [node("a", 900, 500), node("b", 10, 10), node("c", 400, 90), node("d", 40, 700)];
const chainEdges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];

const position = (nodes: WorkflowNode[], id: string) => nodes.find((item) => item.id === id)!.position;

const overlaps = (nodes: WorkflowNode[]) =>
  nodes.some((first, index) =>
    nodes.slice(index + 1).some((second) => {
      const w1 = first.measured?.width ?? 0;
      const w2 = second.measured?.width ?? 0;
      const h = 200;
      return first.position.x < second.position.x + w2 && second.position.x < first.position.x + w1 && first.position.y < second.position.y + h && second.position.y < first.position.y + h;
    })
  );

describe("arrangeNodes", () => {
  it("puts a chain in one left-to-right line in connection order, not in the order it was drawn", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "horizontal", spacing: "comfortable", perRow: 3 });

    const xs = ["a", "b", "c", "d"].map((id) => position(arranged, id).x);
    expect([...xs].sort((x, y) => x - y)).toEqual(xs);
    expect(new Set(["a", "b", "c", "d"].map((id) => position(arranged, id).y)).size).toBe(1);
  });

  it("keeps the gap between neighbours equal to the chosen spacing", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "horizontal", spacing: "wide", perRow: 3 });

    const gap = position(arranged, "b").x - position(arranged, "a").x - NODE_CARD_WIDTHS["product-input"];
    expect(gap).toBe(ASSISTANT_LAYOUT_GAPS.wide.x);
  });

  it("gives compact spacing a smaller footprint than wide spacing", () => {
    const width = (spacing: "compact" | "wide") => position(arrangeNodes(chain, chainEdges, { layout: "horizontal", spacing, perRow: 3 }), "d").x;

    expect(width("compact")).toBeLessThan(width("wide"));
  });

  it("puts a chain in one top-to-bottom column", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "vertical", spacing: "comfortable", perRow: 3 });

    const ys = ["a", "b", "c", "d"].map((id) => position(arranged, id).y);
    expect([...ys].sort((x, y) => x - y)).toEqual(ys);
    expect(new Set(["a", "b", "c", "d"].map((id) => position(arranged, id).x)).size).toBe(1);
  });

  it("wraps into rows of the requested size", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "grid", spacing: "comfortable", perRow: 2 });

    expect(position(arranged, "a").y).toBe(position(arranged, "b").y);
    expect(position(arranged, "c").y).toBe(position(arranged, "d").y);
    expect(position(arranged, "c").y).toBeGreaterThan(position(arranged, "a").y);
    expect(position(arranged, "a").x).toBe(position(arranged, "c").x);
  });

  it("stacks branches that share a step in the same column without overlapping", () => {
    const nodes = [node("in"), node("listing", 0, 0, "generate-listing"), node("mock", 0, 0, "apply-mockup")];
    const edges = [edge("in", "listing"), edge("in", "mock")];

    const arranged = arrangeNodes(nodes, edges, { layout: "horizontal", spacing: "comfortable", perRow: 3 });

    expect(position(arranged, "listing").x).toBe(position(arranged, "mock").x);
    expect(position(arranged, "listing").y).not.toBe(position(arranged, "mock").y);
    expect(overlaps(arranged)).toBe(false);
  });

  it.each(["horizontal", "vertical", "grid"] as const)("never overlaps nodes in the %s layout", (layout) => {
    const nodes = ["a", "b", "c", "d", "e", "f", "g"].map((id) => node(id));
    const edges = [edge("a", "b"), edge("b", "c"), edge("a", "d"), edge("d", "e"), edge("c", "f"), edge("e", "f"), edge("f", "g")];

    expect(overlaps(arrangeNodes(nodes, edges, { layout, spacing: "compact", perRow: 3 }))).toBe(false);
  });

  it("keeps the top-left corner of the workflow where it was", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "horizontal", spacing: "comfortable", perRow: 3 });

    expect(Math.min(...arranged.map((item) => item.position.x))).toBe(10);
    expect(Math.min(...arranged.map((item) => item.position.y))).toBe(10);
  });

  it("places unconnected nodes too, and never loses a node", () => {
    const nodes = [node("a"), node("b"), node("loose")];

    const arranged = arrangeNodes(nodes, [edge("a", "b")], { layout: "horizontal", spacing: "comfortable", perRow: 3 });

    expect(arranged.map((item) => item.id)).toEqual(["a", "b", "loose"]);
    expect(overlaps(arranged)).toBe(false);
  });

  it("survives a loop and edges that point at missing nodes", () => {
    const nodes = [node("a"), node("b")];

    const arranged = arrangeNodes(nodes, [edge("a", "b"), edge("b", "a"), edge("a", "ghost")], { layout: "horizontal", spacing: "comfortable", perRow: 3 });

    expect(arranged).toHaveLength(2);
    expect(overlaps(arranged)).toBe(false);
  });

  it("does not change connections, labels or configuration, only positions", () => {
    const arranged = arrangeNodes(chain, chainEdges, { layout: "grid", spacing: "comfortable", perRow: 2 });

    arranged.forEach((item, index) => expect({ ...item, position: null }).toEqual({ ...chain[index], position: null }));
  });

  it("leaves a single node untouched and does not mutate its input", () => {
    const single = [node("a", 5, 5)];
    const before = JSON.stringify(chain);

    expect(arrangeNodes(single, [], { layout: "grid", spacing: "wide", perRow: 3 })).toBe(single);
    arrangeNodes(chain, chainEdges, { layout: "vertical", spacing: "wide", perRow: 3 });
    expect(JSON.stringify(chain)).toBe(before);
  });
});

describe("describeArrangement", () => {
  it("says what will happen in plain words", () => {
    expect(describeArrangement({ workflowId: "w", layout: "horizontal", spacing: "comfortable", perRow: 3, nodeCount: 5 })).toBe(
      "Arrange 5 nodes in one left-to-right line, comfortable spacing"
    );
    expect(describeArrangement({ workflowId: "w", layout: "grid", spacing: "compact", perRow: 4, nodeCount: 8 })).toBe(
      "Arrange 8 nodes in wrapped rows of 4, compact spacing"
    );
    expect(describeArrangement({ workflowId: "w", layout: "vertical", spacing: "wide", perRow: 3, nodeCount: 3 })).toContain("top-to-bottom");
  });
});
