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

test("pasting copied nodes adds fresh copies a step further each time, and undo removes them", () => {
  const before = fresh();
  const [first, second] = before.nodes;
  assert.ok(first && second);
  useWorkflowStore.getState().selectNodes([first.id, second.id]);
  useWorkflowStore.getState().copySelectedNodes();
  // Copying changes nothing on the canvas.
  assert.equal(useWorkflowStore.getState().nodes.length, before.nodes.length);
  assert.equal(useWorkflowStore.getState().isDirty, false);

  useWorkflowStore.getState().pasteNodes();
  const pasted = useWorkflowStore.getState();
  assert.equal(pasted.nodes.length, before.nodes.length + 2);
  assert.equal(pasted.selectedNodeIds.length, 2);
  assert.ok(pasted.selectedNodeIds.every((id) => id !== first.id && id !== second.id));
  const copyOfFirst = pasted.nodes.find((node) => pasted.selectedNodeIds.includes(node.id) && node.data.type === first.data.type)!;
  assert.deepEqual(copyOfFirst.position, { x: first.position.x + 48, y: first.position.y + 48 });
  // The connection between the two copied nodes comes along, between the copies.
  assert.ok(pasted.edges.some((edge) => edge.source === pasted.selectedNodeIds[0] && edge.target === pasted.selectedNodeIds[1]));
  assert.equal(pasted.isDirty, true);

  useWorkflowStore.getState().pasteNodes();
  const again = useWorkflowStore.getState();
  const secondCopy = again.nodes.find((node) => again.selectedNodeIds.includes(node.id) && node.data.type === first.data.type)!;
  assert.deepEqual(secondCopy.position, { x: first.position.x + 96, y: first.position.y + 96 });

  useWorkflowStore.getState().undo();
  useWorkflowStore.getState().undo();
  assert.equal(useWorkflowStore.getState().nodes.length, before.nodes.length);
});

test("copied nodes can be pasted into another workflow, and copying nothing keeps them", () => {
  const before = fresh();
  const [first] = before.nodes;
  assert.ok(first);
  useWorkflowStore.getState().selectNodes([first.id]);
  useWorkflowStore.getState().copySelectedNodes();
  useWorkflowStore.getState().clearSelection();
  useWorkflowStore.getState().copySelectedNodes();

  useWorkflowStore.getState().loadWorkflow(detail("-other"));
  const other = useWorkflowStore.getState().nodes.length;
  useWorkflowStore.getState().pasteNodes();
  assert.equal(useWorkflowStore.getState().nodes.length, other + 1);
  assert.equal(useWorkflowStore.getState().workflowId, "workflow-other");
});

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
