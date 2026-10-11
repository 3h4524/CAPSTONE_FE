import { create } from "zustand";

import { HISTORY_GROUP_WINDOW_MS, HISTORY_LIMIT } from "@/constants/workflow";
import { duplicateWorkflowSelection, toWorkflowEdges, toWorkflowNodes } from "@/helpers/workflow-graph";
import type {
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeConfig,
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

const DIRTY_NODE_CHANGES = new Set<NodeChange["type"]>(["position", "remove", "add", "replace"]);
const DIRTY_EDGE_CHANGES = new Set<EdgeChange["type"]>(["remove", "add", "replace"]);
const HISTORY_NODE_CHANGES = new Set<NodeChange["type"]>(["remove", "add", "replace"]);
const HISTORY_EDGE_CHANGES = new Set<EdgeChange["type"]>(["remove", "add", "replace"]);

type HistorySnapshot = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeIds: string[];
};

type WorkflowEditorState = {
  workflowId: string | null;
  revision: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeIds: string[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastHistoryKind: string | null;
  lastHistoryAt: number;
  isDirty: boolean;
  isRunning: boolean;
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
  undo: () => void;
  redo: () => void;
  beginNodeDrag: () => void;
  commitNodeDrag: () => void;
  setNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => void;
  resetStatuses: () => void;
  setRunning: (isRunning: boolean) => void;
  markSaved: (workflow: WorkflowDetail) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  workflowId: null,
  revision: 0,
  name: "",
  description: "",
  nodes: [],
  edges: [],
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

const haveNodePositionsChanged = (before: WorkflowNode[], after: WorkflowNode[]) => {
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

export const useWorkflowStore = create<WorkflowEditorState>((set, get) => ({
  ...INITIAL_STATE,

  loadWorkflow: (workflow) => {
    dragSnapshot = null;
    set({
      ...INITIAL_STATE,
      workflowId: workflow.id,
      revision: workflow.revision,
      name: workflow.name,
      description: workflow.description,
      nodes: toWorkflowNodes(workflow.definition),
      edges: toWorkflowEdges(workflow.definition),
    });
  },

  onNodesChange: (changes) =>
    set((state) => {
      const removedIds = new Set(changes.flatMap((change) => (change.type === "remove" ? [change.id] : [])));
      const next = {
        nodes: applyNodeChanges(changes, state.nodes),
        isDirty: state.isDirty || changes.some((change) => DIRTY_NODE_CHANGES.has(change.type)),
        selectedNodeIds: state.selectedNodeIds.filter((id) => !removedIds.has(id)),
      };
      if (!changes.some((change) => HISTORY_NODE_CHANGES.has(change.type))) return next;
      return { ...next, ...pushHistory(state, "structure", false) };
    }),

  onEdgesChange: (changes) =>
    set((state) => {
      const next = {
        edges: applyEdgeChanges(changes, state.edges),
        isDirty: state.isDirty || changes.some((change) => DIRTY_EDGE_CHANGES.has(change.type)),
      };
      if (!changes.some((change) => HISTORY_EDGE_CHANGES.has(change.type))) return next;
      return { ...next, ...pushHistory(state, "structure", false) };
    }),

  connect: (connection) =>
    set((state) => ({ edges: addEdge(connection, state.edges), isDirty: true, ...pushHistory(state, "structure", false) })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: true }],
      selectedNodeIds: [node.id],
      isDirty: true,
      ...pushHistory(state, "structure", false),
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      ),
      isDirty: true,
      ...pushHistory(state, "config", true),
    })),

  renameNode: (nodeId, label) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      ),
      isDirty: true,
      ...pushHistory(state, "rename", false),
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
      isDirty: true,
      ...pushHistory(state, "structure", false),
    })),

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
      return {
        nodes: state.nodes.filter((node) => !removedIds.has(node.id)),
        edges: state.edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)),
        selectedNodeIds: [],
        isDirty: true,
        ...pushHistory(state, "structure", false),
      };
    }),

  duplicateSelectedNodes: () =>
    set((state) => {
      if (state.selectedNodeIds.length === 0) return state;
      const duplicated = duplicateWorkflowSelection(state.nodes, state.edges, state.selectedNodeIds);
      if (duplicated.addedNodeIds.length === 0) return state;
      return {
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...duplicated.nodes],
        edges: [...state.edges, ...duplicated.edges],
        selectedNodeIds: duplicated.addedNodeIds,
        isDirty: true,
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
        isDirty: true,
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
        isDirty: true,
      };
    }),

  beginNodeDrag: () => {
    dragSnapshot = takeSnapshot(get());
  },

  commitNodeDrag: () =>
    set((state) => {
      const stashed = dragSnapshot;
      dragSnapshot = null;
      if (!stashed || !haveNodePositionsChanged(stashed.nodes, state.nodes)) return state;
      return pushSnapshot(state, stashed, "structure");
    }),

  setNodeStatus: (nodeId, status) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, status } } : node
      ),
    })),

  resetStatuses: () =>
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data, status: "idle" } })),
    })),

  setRunning: (isRunning) => set({ isRunning }),

  markSaved: (workflow) =>
    set({ name: workflow.name, description: workflow.description, revision: workflow.revision, isDirty: false }),

  reset: () => {
    dragSnapshot = null;
    set(INITIAL_STATE);
  },
}));
