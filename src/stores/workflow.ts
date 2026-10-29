import { create } from "zustand";

import { DUPLICATE_NODE_OFFSET, HISTORY_GROUP_WINDOW_MS, HISTORY_LIMIT, NODE_MOVE_DIRTY_THRESHOLD } from "@/constants/workflow";
import { duplicateWorkflowSelection, toWorkflowEdges, toWorkflowNodes } from "@/helpers/workflow-graph";
import type {
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeConfig,
  WorkflowNodeData,
  WorkflowNodeStatus,
} from "@/types/workflow";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
} from "@xyflow/react";

const HISTORY_NODE_CHANGES = new Set<NodeChange["type"]>(["remove", "add", "replace"]);
const HISTORY_EDGE_CHANGES = new Set<EdgeChange["type"]>(["remove", "add", "replace"]);

type GraphSnapshot = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

type HistorySnapshot = GraphSnapshot & {
  selectedNodeIds: string[];
};

/** Nodes copied with Ctrl+C, the connections between them, and how often they were pasted since. */
type NodeClipboard = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  pastes: number;
};

export type WorkflowEditorState = {
  workflowId: string | null;
  videoRunId: string | null;
  revision: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  savedGraph: GraphSnapshot;
  selectedNodeIds: string[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastHistoryKind: string | null;
  lastHistoryAt: number;
  isDirty: boolean;
  isRunning: boolean;
  clipboard: NodeClipboard | null;
  loadWorkflow: (workflow: WorkflowDetail) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  connect: OnConnect;
  addNode: (node: WorkflowNode) => void;
  renameNode: (nodeId: string, label: string) => void;
  updateNodeConfig: (nodeId: string, config: WorkflowNodeConfig) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectNodes: (nodeIds: string[]) => void;
  selectAllNodes: () => void;
  clearSelection: () => void;
  removeSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  undo: () => void;
  redo: () => void;
  beginNodeDrag: () => void;
  commitNodeDrag: () => void;
  setNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => void;
  setNodeRuntime: (
    nodeId: string,
    runtime: Partial<Pick<WorkflowNodeData, "status" | "stage" | "progress">>
  ) => void;
  resetStatuses: () => void;
  resetProductDependentState: () => void;
  setVideoRunId: (runId: string | null) => void;
  setRunning: (isRunning: boolean) => void;
  markSaved: (workflow: WorkflowDetail) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  workflowId: null,
  videoRunId: null,
  revision: 0,
  name: "",
  description: "",
  nodes: [],
  edges: [],
  savedGraph: { nodes: [], edges: [] },
  selectedNodeIds: [],
  past: [],
  future: [],
  lastHistoryKind: null,
  lastHistoryAt: 0,
  isDirty: false,
  isRunning: false,
};

let dragSnapshot: HistorySnapshot | null = null;

const takeSnapshot = (state: Pick<WorkflowEditorState, "nodes" | "edges" | "selectedNodeIds">): HistorySnapshot => ({
  nodes: state.nodes,
  edges: state.edges,
  selectedNodeIds: state.selectedNodeIds,
});

const pushSnapshot = (
  state: Pick<WorkflowEditorState, "past">,
  snapshot: HistorySnapshot,
  kind: string
): Partial<WorkflowEditorState> => ({
  past: [...state.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
  future: [],
  lastHistoryKind: kind,
  lastHistoryAt: Date.now(),
});

const pushHistory = (
  state: Pick<WorkflowEditorState, "past" | "lastHistoryKind" | "lastHistoryAt"> & Pick<WorkflowEditorState, "nodes" | "edges" | "selectedNodeIds">,
  kind: string,
  grouped: boolean
): Partial<WorkflowEditorState> => {
  const stamp = { lastHistoryKind: kind, lastHistoryAt: Date.now() };
  if (grouped && state.lastHistoryKind === kind && Date.now() - state.lastHistoryAt < HISTORY_GROUP_WINDOW_MS)
    return stamp;
  return pushSnapshot(state, takeSnapshot(state), kind);
};

const hasNodePositionsChanged = (before: WorkflowNode[], after: WorkflowNode[]) => {
  if (before.length !== after.length) return true;
  return after.some((node, index) => {
    const previous = before[index];
    return (
      !previous ||
      previous.id !== node.id ||
      previous.position.x !== node.position.x ||
      previous.position.y !== node.position.y
    );
  });
};

const hasMeaningfulGraphChanges = (
  before: Pick<WorkflowEditorState, "nodes" | "edges">,
  after: Pick<WorkflowEditorState, "nodes" | "edges">
) => {
  if (before.nodes.length !== after.nodes.length || before.edges.length !== after.edges.length) return true;
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const nodesChanged = before.nodes.some((node) => {
    const other = afterNodes.get(node.id);
    return (
      !other ||
      node.type !== other.type ||
      node.data.type !== other.data.type ||
      node.data.label !== other.data.label ||
      Math.hypot(node.position.x - other.position.x, node.position.y - other.position.y) > NODE_MOVE_DIRTY_THRESHOLD ||
      JSON.stringify(node.data.config) !== JSON.stringify(other.data.config)
    );
  });
  if (nodesChanged) return true;
  const afterEdges = new Set(after.edges.map((edge) => `${edge.id}:${edge.source}:${edge.target}`));
  return before.edges.some((edge) => !afterEdges.has(`${edge.id}:${edge.source}:${edge.target}`));
};

export const useWorkflowStore = create<WorkflowEditorState>((set, get) => ({
  ...INITIAL_STATE,
  // Not part of INITIAL_STATE: opening another workflow keeps it, so copied nodes can be pasted there.
  clipboard: null,

  loadWorkflow: (workflow) => {
    dragSnapshot = null;
    const nodes = toWorkflowNodes(workflow.definition);
    const edges = toWorkflowEdges(workflow.definition);
    set({
      ...INITIAL_STATE,
      workflowId: workflow.id,
      revision: workflow.revision,
      name: workflow.name,
      description: workflow.description,
      nodes,
      edges,
      savedGraph: { nodes, edges },
    });
  },

  onNodesChange: (changes) =>
    set((state) => {
      const removedIds = new Set(changes.flatMap((change) => (change.type === "remove" ? [change.id] : [])));
      const nodes = applyNodeChanges(changes, state.nodes);
      const next = {
        nodes,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges: state.edges }),
        selectedNodeIds: state.selectedNodeIds.filter((id) => !removedIds.has(id)),
      };
      if (!changes.some((change) => HISTORY_NODE_CHANGES.has(change.type))) return next;
      return { ...next, ...pushHistory(state, "structure", false) };
    }),

  onEdgesChange: (changes) =>
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      const next = {
        edges,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes: state.nodes, edges }),
      };
      if (!changes.some((change) => HISTORY_EDGE_CHANGES.has(change.type))) return next;
      return { ...next, ...pushHistory(state, "structure", false) };
    }),

  connect: (connection) =>
    set((state) => {
      const edges = addEdge(connection, state.edges);
      if (edges.length === state.edges.length) return state;
      return {
        edges,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes: state.nodes, edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  addNode: (node) =>
    set((state) => {
      const nodes = [...state.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: true }];
      return {
        nodes,
        selectedNodeIds: [node.id],
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges: state.edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      const target = state.nodes.find((node) => node.id === nodeId);
      if (!target || JSON.stringify(target.data.config) === JSON.stringify(config)) return state;
      const nodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      );
      return {
        nodes,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges: state.edges }),
        ...pushHistory(state, "config", true),
      };
    }),

  renameNode: (nodeId, label) =>
    set((state) => {
      const target = state.nodes.find((node) => node.id === nodeId);
      if (!target || target.data.label === label) return state;
      const nodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      );
      return {
        nodes,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges: state.edges }),
        ...pushHistory(state, "rename", false),
      };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.nodes.some((node) => node.id === nodeId)) return state;
      const nodes = state.nodes.filter((node) => node.id !== nodeId);
      const edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      return {
        nodes,
        edges,
        selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  selectNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: nodeId ? [nodeId] : [],
      nodes: state.nodes.map((node) => ({ ...node, selected: node.id === nodeId })),
    })),

  selectNodes: (nodeIds) =>
    set((state) => {
      const nextIds = state.nodes.filter((node) => nodeIds.includes(node.id)).map((node) => node.id);
      const isUnchanged =
        nextIds.length === state.selectedNodeIds.length &&
        nextIds.every((id) => state.selectedNodeIds.includes(id));
      if (isUnchanged) return state;
      return {
        selectedNodeIds: nextIds,
        nodes: state.nodes.map((node) => ({ ...node, selected: nextIds.includes(node.id) })),
      };
    }),

  selectAllNodes: () =>
    set((state) => ({
      selectedNodeIds: state.nodes.map((node) => node.id),
      nodes: state.nodes.map((node) => ({ ...node, selected: true })),
    })),

  clearSelection: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0) return state;
      return {
        selectedNodeIds: [],
        nodes: state.nodes.map((node) => ({ ...node, selected: false })),
      };
    }),

  removeSelectedNodes: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0) return state;
      const removedIds = new Set(state.selectedNodeIds);
      const nodes = state.nodes.filter((node) => !removedIds.has(node.id));
      const edges = state.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target));
      return {
        nodes,
        edges,
        selectedNodeIds: [],
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  duplicateSelectedNodes: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0) return state;
      const duplicated = duplicateWorkflowSelection(state.nodes, state.edges, state.selectedNodeIds);
      if (duplicated.addedNodeIds.length === 0) return state;
      const nodes = [...state.nodes.map((node) => ({ ...node, selected: false })), ...duplicated.nodes];
      const edges = [...state.edges, ...duplicated.edges];
      return {
        nodes,
        edges,
        selectedNodeIds: duplicated.addedNodeIds,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  copySelectedNodes: () =>
    set((state) => {
      const copied = new Set(state.selectedNodeIds);
      const nodes = state.nodes.filter((node) => copied.has(node.id));
      if (nodes.length === 0) return state;
      // Only the connections inside the selection come along, as with duplicating.
      const edges = state.edges.filter((edge) => copied.has(edge.source) && copied.has(edge.target));
      return { clipboard: { nodes, edges, pastes: 0 } };
    }),

  pasteNodes: () =>
    set((state) => {
      const { clipboard } = state;
      if (!clipboard || clipboard.nodes.length === 0) return state;
      // Each paste lands one step further than the last, so pasting twice does not stack the copies.
      const pastes = clipboard.pastes + 1;
      const pasted = duplicateWorkflowSelection(clipboard.nodes, clipboard.edges, clipboard.nodes.map((node) => node.id), DUPLICATE_NODE_OFFSET * pastes);
      const nodes = [...state.nodes.map((node) => ({ ...node, selected: false })), ...pasted.nodes];
      const edges = [...state.edges, ...pasted.edges];
      return {
        nodes,
        edges,
        selectedNodeIds: pasted.addedNodeIds,
        clipboard: { ...clipboard, pastes },
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges }),
        ...pushHistory(state, "structure", false),
      };
    }),

  undo: () =>
    set((state) => {
      if (state.isRunning || state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        nodes: previous.nodes,
        edges: previous.edges,
        selectedNodeIds: previous.selectedNodeIds,
        past: state.past.slice(0, -1),
        future: [...state.future, takeSnapshot(state)],
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, previous),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.isRunning || state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      if (!next) return state;
      return {
        nodes: next.nodes,
        edges: next.edges,
        selectedNodeIds: next.selectedNodeIds,
        past: [...state.past.slice(-(HISTORY_LIMIT - 1)), takeSnapshot(state)],
        future: state.future.slice(0, -1),
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, next),
      };
    }),

  beginNodeDrag: () => {
    dragSnapshot = takeSnapshot(get());
  },

  commitNodeDrag: () =>
    set((state) => {
      const stashed = dragSnapshot;
      dragSnapshot = null;
      if (!stashed || !hasNodePositionsChanged(stashed.nodes, state.nodes)) return state;
      return pushSnapshot(state, stashed, "structure");
    }),

  setNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, status } } : node
      ),
    })),

  setNodeRuntime: (nodeId, runtime) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...runtime } } : node
      ),
    })),

  resetStatuses: () =>
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data, status: "idle" } })),
    })),

  resetProductDependentState: () =>
    set((state) => {
      const nodes: WorkflowNode[] = state.nodes.map((node) => {
        if (node.data.type !== "apply-mockup") return { ...node, data: { ...node.data, status: "idle" } };
        return { ...node, data: { ...node.data, status: "idle", config: { ...node.data.config, mockupIds: [], artworkGroupKey: "" } } };
      });
      return {
        nodes,
        isDirty: hasMeaningfulGraphChanges(state.savedGraph, { nodes, edges: state.edges }),
        videoRunId: null,
      };
    }),

  setVideoRunId: (videoRunId) => set({ videoRunId }),

  setRunning: (isRunning) => set({ isRunning }),

  markSaved: (workflow) =>
    set((state) => ({
      name: workflow.name,
      description: workflow.description,
      revision: workflow.revision,
      savedGraph: { nodes: state.nodes, edges: state.edges },
      isDirty: false,
    })),

  reset: () => {
    dragSnapshot = null;
    set(INITIAL_STATE);
  },
}));
