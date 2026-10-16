import assert from "node:assert/strict";
import { test } from "node:test";

import { DUPLICATE_NODE_OFFSET } from "@/constants/workflow";
import { duplicateWorkflowSelection } from "@/helpers/workflow-graph";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

const node = (id: string, x: number, overrides?: Partial<WorkflowNode>): WorkflowNode => ({
  id,
  type: "workflow",
  position: { x, y: 0 },
  selected: false,
  data: { type: "design-image", label: `Node ${id}`, config: { variants: 2 }, status: "idle" },
  ...overrides,
});

const edge = (id: string, source: string, target: string): WorkflowEdge => ({ id, source, target });

test("duplicateWorkflowSelection copies the selected nodes with fresh ids and offset positions", () => {
  const nodes = [node("a", 0), node("b", 200)];
  const { nodes: copies, addedNodeIds } = duplicateWorkflowSelection(nodes, [], ["a", "b"]);
  assert.equal(copies.length, 2);
  assert.equal(addedNodeIds.length, 2);
  assert.ok(copies.every((copy) => !["a", "b"].includes(copy.id)));
  assert.equal(new Set(copies.map((copy) => copy.id)).size, 2);
  assert.deepEqual(copies.map((copy) => copy.position), [
    { x: DUPLICATE_NODE_OFFSET, y: DUPLICATE_NODE_OFFSET },
    { x: 200 + DUPLICATE_NODE_OFFSET, y: DUPLICATE_NODE_OFFSET },
  ]);
  assert.ok(copies.every((copy) => copy.selected));
});

test("duplicateWorkflowSelection can place the copies further away", () => {
  const { nodes: copies } = duplicateWorkflowSelection([node("a", 100)], [], ["a"], 3 * DUPLICATE_NODE_OFFSET);
  assert.deepEqual(copies.map((copy) => copy.position), [{ x: 100 + 3 * DUPLICATE_NODE_OFFSET, y: 3 * DUPLICATE_NODE_OFFSET }]);
});

test("duplicateWorkflowSelection resets status and detaches config from the original", () => {
  const original = node("a", 0, {
    selected: true,
    data: { type: "design-image", label: "Design", config: { variants: 3 }, status: "success" },
  });
  const { nodes: copies } = duplicateWorkflowSelection([original], [], ["a"]);
  const [copy] = copies;
  assert.ok(copy);
  assert.equal(copy.data.status, "idle");
  assert.deepEqual(copy.data.config, { variants: 3 });
  assert.notEqual(copy.data.config, original.data.config);
});

test("duplicateWorkflowSelection only copies edges inside the selection", () => {
  const nodes = [node("a", 0), node("b", 200), node("c", 400)];
  const edges = [edge("a-b", "a", "b"), edge("b-c", "b", "c")];
  const { edges: copiedEdges, addedNodeIds } = duplicateWorkflowSelection(nodes, edges, ["a", "b"]);
  assert.equal(copiedEdges.length, 1);
  const [copied] = copiedEdges;
  assert.ok(copied);
  assert.notEqual(copied.id, "a-b");
  assert.deepEqual([copied.source, copied.target], addedNodeIds);
  assert.equal(copied.selected, false);
});

test("duplicateWorkflowSelection with an empty selection returns nothing", () => {
  const nodes = [node("a", 0)];
  const result = duplicateWorkflowSelection(nodes, [], []);
  assert.deepEqual(result, { nodes: [], edges: [], addedNodeIds: [] });
});
