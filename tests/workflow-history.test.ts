import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowDetail } from "@/types/workflow";

const detail = (suffix = ""): WorkflowDetail => ({
  id: `workflow${suffix}`,
  name: "History workflow",
  description: "Undo checks",
  nodeCount: DEFAULT_WORKFLOW_DEFINITION.nodes.length,
  updatedAt: "2026-10-05T00:00:00Z",
  revision: 1,
  createdAt: "2026-10-05T00:00:00Z",
  definition: DEFAULT_WORKFLOW_DEFINITION,
});

const fresh = () => {
  useWorkflowStore.getState().reset();
  useWorkflowStore.getState().loadWorkflow(detail());
  return useWorkflowStore.getState();
};

test("undo removes an added node and redo brings it back", () => {
  const before = fresh().nodes.length;
  const added = createWorkflowNode("design-image", { x: 0, y: 0 });
  useWorkflowStore.getState().addNode(added);
  assert.equal(useWorkflowStore.getState().nodes.length, before + 1);
  useWorkflowStore.getState().undo();
  assert.equal(useWorkflowStore.getState().nodes.length, before);
  assert.ok(!useWorkflowStore.getState().nodes.some((node) => node.id === added.id));
  useWorkflowStore.getState().redo();
  assert.ok(useWorkflowStore.getState().nodes.some((node) => node.id === added.id));
});

test("undo restores nodes removed in bulk", () => {
  const before = fresh().nodes.length;
  useWorkflowStore.getState().selectAllNodes();
  useWorkflowStore.getState().removeSelectedNodes();
  assert.equal(useWorkflowStore.getState().nodes.length, 0);
  useWorkflowStore.getState().undo();
  assert.equal(useWorkflowStore.getState().nodes.length, before);
});

test("rapid config edits collapse into a single undo step", () => {
  fresh();
  const target = useWorkflowStore.getState().nodes.find((node) => node.data.type === "design-image");
  assert.ok(target);
  const original = target.data.config;
  useWorkflowStore.getState().updateNodeConfig(target.id, { ...original, variants: 3 });
  useWorkflowStore.getState().updateNodeConfig(target.id, { ...original, variants: 4 });
  useWorkflowStore.getState().undo();
  const restored = useWorkflowStore.getState().nodes.find((node) => node.id === target.id);
  assert.deepEqual(restored?.data.config, original);
});

test("a drag without movement leaves no undo step", () => {
  fresh();
  const pastLength = useWorkflowStore.getState().past.length;
  useWorkflowStore.getState().beginNodeDrag();
  useWorkflowStore.getState().commitNodeDrag();
  assert.equal(useWorkflowStore.getState().past.length, pastLength);
});

test("a committed drag is a single undo step", () => {
  fresh();
  const target = useWorkflowStore.getState().nodes[0];
  assert.ok(target);
  const { x, y } = target.position;
  useWorkflowStore.getState().beginNodeDrag();
  useWorkflowStore.getState().onNodesChange([{ type: "position", id: target.id, position: { x: x + 40, y: y + 40 } }]);
  useWorkflowStore.getState().commitNodeDrag();
  useWorkflowStore.getState().undo();
  const restored = useWorkflowStore.getState().nodes.find((node) => node.id === target.id);
  assert.deepEqual(restored?.position, { x, y });
});

test("a new action clears the redo stack", () => {
  const before = fresh().nodes.length;
  const first = createWorkflowNode("design-image", { x: 0, y: 0 });
  useWorkflowStore.getState().addNode(first);
  useWorkflowStore.getState().undo();
  useWorkflowStore.getState().addNode(createWorkflowNode("design-image", { x: 10, y: 10 }));
  useWorkflowStore.getState().redo();
  assert.equal(useWorkflowStore.getState().nodes.length, before + 1);
});

test("loading a workflow clears the history", () => {
  fresh();
  useWorkflowStore.getState().addNode(createWorkflowNode("design-image", { x: 0, y: 0 }));
  assert.ok(useWorkflowStore.getState().past.length > 0);
  useWorkflowStore.getState().loadWorkflow(detail("-other"));
  assert.equal(useWorkflowStore.getState().past.length, 0);
  assert.equal(useWorkflowStore.getState().future.length, 0);
});
