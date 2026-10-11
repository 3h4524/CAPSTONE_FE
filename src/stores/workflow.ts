import { create } from "zustand";

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

type WorkflowEditorState = {
  workflowId: string | null;
  revision: number;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeIds: string[];
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
  isDirty: false,
  isRunning: false,
};

export const useWorkflowStore = create<WorkflowEditorState>((set) => ({
  ...INITIAL_STATE,

  loadWorkflow: (workflow) =>
    set({
      ...INITIAL_STATE,
      workflowId: workflow.id,
      revision: workflow.revision,
      name: workflow.name,
      description: workflow.description,
      nodes: toWorkflowNodes(workflow.definition),
      edges: toWorkflowEdges(workflow.definition),
    }),

  onNodesChange: (changes) =>
    set((state) => {
      const removedIds = new Set(changes.flatMap((change) => (change.type === "remove" ? [change.id] : [])));
      return {
        nodes: applyNodeChanges(changes, state.nodes),
        isDirty: state.isDirty || changes.some((change) => DIRTY_NODE_CHANGES.has(change.type)),
        selectedNodeIds: state.selectedNodeIds.filter((id) => !removedIds.has(id)),
      };
    }),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: state.isDirty || changes.some((change) => DIRTY_EDGE_CHANGES.has(change.type)),
    })),

  connect: (connection) =>
    set((state) => ({ edges: addEdge(connection, state.edges), isDirty: true })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: true }],
      selectedNodeIds: [node.id],
      isDirty: true,
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      ),
      isDirty: true,
    })),

  renameNode: (nodeId, label) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      ),
      isDirty: true,
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
      isDirty: true,
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
      };
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

  reset: () => set(INITIAL_STATE),
}));
