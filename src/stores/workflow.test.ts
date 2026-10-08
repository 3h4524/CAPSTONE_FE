import { beforeEach, describe, expect, it } from "vitest";

import { useWorkflowStore } from "@/stores/workflow";
import {
  buildWorkflowDefinition,
  buildWorkflowDetail,
  buildWorkflowEdge,
  buildWorkflowNode,
} from "@/test/factories";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import type { Connection, NodeChange } from "@xyflow/react";

const initialState = useWorkflowStore.getState();

const node = (id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode =>
  buildWorkflowNode({ id, ...overrides });

const edge = (source: string, target: string): WorkflowEdge =>
  buildWorkflowEdge({ id: `${source}->${target}`, source, target });

const connection = (source: string, target: string): Connection => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
});

const moveNode = (id: string, x: number, y: number): NodeChange<WorkflowNode> => ({
  id,
  type: "position",
  position: { x, y },
});

const seedGraph = (nodes: WorkflowNode[], edges: WorkflowEdge[]) =>
  useWorkflowStore.setState({ nodes, edges });

describe("useWorkflowStore initial state", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("starts with an empty graph", () => {
    const state = useWorkflowStore.getState();

    expect(state.workflowId).toBeNull();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(false);
    expect(state.isRunning).toBe(false);
  });
});

describe("loadWorkflow", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("maps the definition into editor nodes and edges", () => {
    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail());

    const state = useWorkflowStore.getState();

    expect(state.workflowId).toBe("workflow-1");
    expect(state.name).toBe("Spring drop");
    expect(state.description).toBe("Designs queued for the spring drop.");
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toEqual([{ id: "edge-1", source: "node-1", target: "node-2" }]);
  });

  it("gives every loaded node an idle status and the workflow node type", () => {
    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail());

    const [first] = useWorkflowStore.getState().nodes;

    expect(first?.type).toBe("workflow");
    expect(first?.data).toMatchObject({ type: "product-input", status: "idle" });
    expect(first?.position).toEqual({ x: 0, y: 0 });
  });

  it("drops config keys the node definition does not declare", () => {
    const definition = buildWorkflowDefinition({
      nodes: [
        {
          id: "node-1",
          type: "product-input",
          label: "Product input",
          position: { x: 0, y: 0 },
          config: { batchId: "batch-9", retiredFlag: true } as WorkflowNodeConfig,
        },
      ],
      edges: [],
    });

    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail({ definition }));

    expect(useWorkflowStore.getState().nodes[0]?.data.config).toEqual({ batchId: "batch-9" });
  });

  it("clears the dirty flag and the selection of the previously loaded workflow", () => {
    seedGraph([node("old-node")], []);
    useWorkflowStore.getState().connect(connection("old-node", "other-node"));
    useWorkflowStore.getState().selectNode("old-node");

    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail());

    const state = useWorkflowStore.getState();

    expect(state.isDirty).toBe(false);
    expect(state.selectedNodeId).toBeNull();
    expect(state.nodes.map((item) => item.id)).toEqual(["node-1", "node-2"]);
  });
});

describe("onNodesChange", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("applies a position change and marks the editor dirty", () => {
    seedGraph([node("node-1")], []);

    useWorkflowStore.getState().onNodesChange([moveNode("node-1", 120, 64)]);

    const state = useWorkflowStore.getState();

    expect(state.nodes[0]?.position).toEqual({ x: 120, y: 64 });
    expect(state.isDirty).toBe(true);
  });

  it("keeps a clean editor clean for a selection-only change", () => {
    seedGraph([node("node-1")], []);

    useWorkflowStore
      .getState()
      .onNodesChange([{ id: "node-1", type: "select", selected: true }]);

    const state = useWorkflowStore.getState();

    expect(state.nodes[0]?.selected).toBe(true);
    expect(state.isDirty).toBe(false);
  });

  it("stays dirty when a clean change follows an earlier edit", () => {
    seedGraph([node("node-1")], []);
    useWorkflowStore.getState().onNodesChange([moveNode("node-1", 10, 10)]);

    useWorkflowStore
      .getState()
      .onNodesChange([{ id: "node-1", type: "select", selected: true }]);

    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it("removes a node and clears the selection it was pointing at", () => {
    seedGraph([node("node-1"), node("node-2")], []);
    useWorkflowStore.getState().selectNode("node-2");

    useWorkflowStore.getState().onNodesChange([{ id: "node-2", type: "remove" }]);

    const state = useWorkflowStore.getState();

    expect(state.nodes.map((item) => item.id)).toEqual(["node-1"]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(true);
  });

  it("keeps the selection when a different node is removed", () => {
    seedGraph([node("node-1"), node("node-2")], []);
    useWorkflowStore.getState().selectNode("node-1");

    useWorkflowStore.getState().onNodesChange([{ id: "node-2", type: "remove" }]);

    expect(useWorkflowStore.getState().selectedNodeId).toBe("node-1");
  });

  it("clears the selection for a removed node inside one batch of changes", () => {
    seedGraph([node("node-1"), node("node-2")], []);
    useWorkflowStore.getState().selectNode("node-2");

    useWorkflowStore
      .getState()
      .onNodesChange([moveNode("node-1", 5, 5), { id: "node-2", type: "remove" }]);

    expect(useWorkflowStore.getState().selectedNodeId).toBeNull();
  });
});

describe("onEdgesChange", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("adds an edge and marks the editor dirty", () => {
    seedGraph([node("node-1"), node("node-2")], []);

    useWorkflowStore.getState().onEdgesChange([{ type: "add", item: edge("node-1", "node-2") }]);

    const state = useWorkflowStore.getState();

    expect(state.edges).toEqual([edge("node-1", "node-2")]);
    expect(state.isDirty).toBe(true);
  });

  it("removes an edge and marks the editor dirty", () => {
    seedGraph([node("node-1"), node("node-2")], [edge("node-1", "node-2")]);

    useWorkflowStore.getState().onEdgesChange([{ id: "node-1->node-2", type: "remove" }]);

    const state = useWorkflowStore.getState();

    expect(state.edges).toEqual([]);
    expect(state.isDirty).toBe(true);
  });

  it("keeps a clean editor clean for a selection-only change", () => {
    seedGraph([node("node-1"), node("node-2")], [edge("node-1", "node-2")]);

    useWorkflowStore
      .getState()
      .onEdgesChange([{ id: "node-1->node-2", type: "select", selected: true }]);

    const state = useWorkflowStore.getState();

    expect(state.edges[0]?.selected).toBe(true);
    expect(state.isDirty).toBe(false);
  });
});

describe("connect", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("appends the new edge and marks the editor dirty", () => {
    seedGraph([node("node-1"), node("node-2")], []);

    useWorkflowStore.getState().connect(connection("node-1", "node-2"));

    const state = useWorkflowStore.getState();

    expect(state.edges).toHaveLength(1);
    expect(state.edges[0]).toMatchObject({ source: "node-1", target: "node-2" });
    expect(state.isDirty).toBe(true);
  });

  it("ignores a duplicate connection between the same pair of nodes", () => {
    seedGraph([node("node-1"), node("node-2")], []);
    useWorkflowStore.getState().connect(connection("node-1", "node-2"));

    useWorkflowStore.getState().connect(connection("node-1", "node-2"));

    expect(useWorkflowStore.getState().edges).toHaveLength(1);
  });

  it("drops a connection with a missing endpoint", () => {
    seedGraph([node("node-1"), node("node-2")], []);

    useWorkflowStore.getState().connect(connection("", "node-2"));

    expect(useWorkflowStore.getState().edges).toEqual([]);
  });

  it("marks the editor dirty even when the duplicate edge was rejected", () => {
    seedGraph([node("node-1"), node("node-2")], [edge("node-1", "node-2")]);

    useWorkflowStore.getState().connect(connection("node-1", "node-2"));

    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });
});

describe("addNode", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("appends the node, selects it and points the selection at it", () => {
    seedGraph([node("node-1")], []);

    useWorkflowStore.getState().addNode(node("node-9"));

    const state = useWorkflowStore.getState();

    expect(state.nodes.map((item) => item.id)).toEqual(["node-1", "node-9"]);
    expect(state.nodes[0]?.selected).toBe(false);
    expect(state.nodes[1]?.selected).toBe(true);
    expect(state.selectedNodeId).toBe("node-9");
    expect(state.isDirty).toBe(true);
  });

  it("deselects the previously selected node", () => {
    seedGraph([node("node-1")], []);
    useWorkflowStore.getState().selectNode("node-1");

    useWorkflowStore.getState().addNode(node("node-9"));

    const state = useWorkflowStore.getState();

    expect(state.nodes[0]?.selected).toBe(false);
    expect(state.selectedNodeId).toBe("node-9");
  });
});

describe("renameNode", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("updates only the label of the target node", () => {
    seedGraph([node("node-1"), node("node-2")], []);

    useWorkflowStore.getState().renameNode("node-1", "Spring products");

    const [first, second] = useWorkflowStore.getState().nodes;

    expect(first?.data.label).toBe("Spring products");
    expect(first?.data.type).toBe("product-input");
    expect(second?.data.label).toBe("Product input");
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });
});

describe("updateNodeConfig", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("replaces the config and keeps the rest of the node data", () => {
    seedGraph([node("node-1")], []);

    useWorkflowStore.getState().updateNodeConfig("node-1", { batchId: "batch-7" });

    const [updated] = useWorkflowStore.getState().nodes;

    expect(updated?.data.config).toEqual({ batchId: "batch-7" });
    expect(updated?.data.label).toBe("Product input");
    expect(updated?.data.status).toBe("idle");
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it("leaves the other nodes untouched", () => {
    seedGraph([node("node-1"), node("node-2")], []);

    useWorkflowStore.getState().updateNodeConfig("node-1", { batchId: "batch-7" });

    expect(useWorkflowStore.getState().nodes[1]?.data.config).toEqual({ name: "Mug design" });
  });
});

describe("removeNode", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("removes every edge attached to the node", () => {
    seedGraph(
      [node("a"), node("b"), node("c")],
      [edge("a", "b"), edge("b", "c")]
    );

    useWorkflowStore.getState().removeNode("b");

    const state = useWorkflowStore.getState();

    expect(state.nodes.map((item) => item.id)).toEqual(["a", "c"]);
    expect(state.edges).toEqual([]);
  });

  it("keeps the edges that do not touch the node", () => {
    seedGraph(
      [node("a"), node("b"), node("c")],
      [edge("a", "b"), edge("b", "c"), edge("a", "c")]
    );

    useWorkflowStore.getState().removeNode("b");

    expect(useWorkflowStore.getState().edges).toEqual([edge("a", "c")]);
  });

  it("removes an edge whose source is the node even when the target survives", () => {
    seedGraph([node("a"), node("b")], [edge("a", "b")]);

    useWorkflowStore.getState().removeNode("a");

    expect(useWorkflowStore.getState().edges).toEqual([]);
  });

  it("clears the selection when the selected node is removed", () => {
    seedGraph([node("a"), node("b")], []);
    useWorkflowStore.getState().selectNode("b");

    useWorkflowStore.getState().removeNode("b");

    expect(useWorkflowStore.getState().selectedNodeId).toBeNull();
  });

  it("keeps the selection when a different node is removed", () => {
    seedGraph([node("a"), node("b")], []);
    useWorkflowStore.getState().selectNode("b");

    useWorkflowStore.getState().removeNode("a");

    expect(useWorkflowStore.getState().selectedNodeId).toBe("b");
  });

  it("marks the editor dirty", () => {
    seedGraph([node("a"), node("b")], [edge("a", "b")]);

    useWorkflowStore.getState().removeNode("a");

    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it("is a no-op for an unknown node id", () => {
    seedGraph([node("a"), node("b")], [edge("a", "b")]);

    useWorkflowStore.getState().removeNode("missing");

    const state = useWorkflowStore.getState();

    expect(state.nodes.map((item) => item.id)).toEqual(["a", "b"]);
    expect(state.edges).toEqual([edge("a", "b")]);
    expect(state.isDirty).toBe(true);
  });
});

describe("selectNode", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("flags only the chosen node as selected", () => {
    seedGraph([node("a"), node("b")], []);

    useWorkflowStore.getState().selectNode("b");

    const state = useWorkflowStore.getState();

    expect(state.selectedNodeId).toBe("b");
    expect(state.nodes[0]?.selected).toBe(false);
    expect(state.nodes[1]?.selected).toBe(true);
  });

  it("clears every selection when the id is null", () => {
    seedGraph([node("a"), node("b")], []);
    useWorkflowStore.getState().selectNode("b");

    useWorkflowStore.getState().selectNode(null);

    const state = useWorkflowStore.getState();

    expect(state.selectedNodeId).toBeNull();
    expect(state.nodes.every((item) => item.selected === false)).toBe(true);
  });
});

describe("node status tracking", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("setNodeStatus updates only the target node", () => {
    seedGraph([node("a"), node("b")], []);

    useWorkflowStore.getState().setNodeStatus("b", "failed");

    const state = useWorkflowStore.getState();

    expect(state.nodes[0]?.data.status).toBe("idle");
    expect(state.nodes[1]?.data.status).toBe("failed");
  });

  it("setNodeStatus does not mark the editor dirty", () => {
    seedGraph([node("a"), node("b")], []);

    useWorkflowStore.getState().setNodeStatus("a", "running");

    expect(useWorkflowStore.getState().isDirty).toBe(false);
  });

  it("setNodeStatus keeps the node config intact", () => {
    seedGraph([node("a")], []);

    useWorkflowStore.getState().setNodeStatus("a", "success");

    expect(useWorkflowStore.getState().nodes[0]?.data.config).toEqual({ name: "Mug design" });
  });

  it("resetStatuses returns every node to idle", () => {
    seedGraph([node("a"), node("b")], []);
    useWorkflowStore.getState().setNodeStatus("a", "success");
    useWorkflowStore.getState().setNodeStatus("b", "failed");

    useWorkflowStore.getState().resetStatuses();

    expect(useWorkflowStore.getState().nodes.map((item) => item.data.status)).toEqual([
      "idle",
      "idle",
    ]);
  });
});

describe("setRunning", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("toggles the run flag without touching the dirty flag", () => {
    useWorkflowStore.getState().setRunning(true);

    expect(useWorkflowStore.getState().isRunning).toBe(true);
    expect(useWorkflowStore.getState().isDirty).toBe(false);

    useWorkflowStore.getState().setRunning(false);

    expect(useWorkflowStore.getState().isRunning).toBe(false);
  });
});

describe("markSaved", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("stores the saved metadata and clears the dirty flag", () => {
    useWorkflowStore.getState().renameNode("node-1", "Draft");
    seedGraph([node("node-1")], []);

    useWorkflowStore.getState().markSaved(
      buildWorkflowDetail({ name: "Saved name", description: "Saved description" })
    );

    const state = useWorkflowStore.getState();

    expect(state.name).toBe("Saved name");
    expect(state.description).toBe("Saved description");
    expect(state.isDirty).toBe(false);
  });

  it("keeps the edited graph in place", () => {
    seedGraph([node("node-1")], [edge("node-1", "node-2")]);

    useWorkflowStore.getState().markSaved(buildWorkflowDetail());

    const state = useWorkflowStore.getState();

    expect(state.nodes.map((item) => item.id)).toEqual(["node-1"]);
    expect(state.edges).toHaveLength(1);
  });
});

describe("reset", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
  });

  it("returns the editor to its initial state", () => {
    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail());
    useWorkflowStore.getState().selectNode("node-1");
    useWorkflowStore.getState().renameNode("node-1", "Draft");
    useWorkflowStore.getState().setRunning(true);

    useWorkflowStore.getState().reset();

    const state = useWorkflowStore.getState();

    expect(state.workflowId).toBeNull();
    expect(state.name).toBe("");
    expect(state.description).toBe("");
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.isDirty).toBe(false);
    expect(state.isRunning).toBe(false);
  });

  it("keeps every action available after a reset", () => {
    useWorkflowStore.getState().reset();

    useWorkflowStore.getState().addNode(node("node-1"));

    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
  });
});
