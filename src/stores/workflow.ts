import { create } from "zustand";

import { toWorkflowEdges, toWorkflowNodes } from "@/helpers/workflow-graph";
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
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  isRunning: boolean;
  loadWorkflow: (workflow: WorkflowDetail) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  connect: OnConnect;
  addNode: (node: WorkflowNode) => void;
  updateNodeConfig: (nodeId: string, config: WorkflowNodeConfig) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setNodeStatus: (nodeId: string, status: WorkflowNodeStatus) => void;
  resetStatuses: () => void;
  setRunning: (isRunning: boolean) => void;
  markSaved: (workflow: WorkflowDetail) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  workflowId: null,
  name: "",
  description: "",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  isRunning: false,
};

export const useWorkflowStore = create<WorkflowEditorState>((set) => ({
  ...INITIAL_STATE,

  loadWorkflow: (workflow) =>
    set({
      ...INITIAL_STATE,
      workflowId: workflow.id,
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
        selectedNodeId:
          state.selectedNodeId && removedIds.has(state.selectedNodeId) ? null : state.selectedNodeId,
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
      selectedNodeId: node.id,
      isDirty: true,
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      ),
      isDirty: true,
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    })),

  selectNode: (nodeId) =>
    set((state) => ({
      selectedNodeId: nodeId,
      nodes: state.nodes.map((node) => ({ ...node, selected: node.id === nodeId })),
    })),

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
    set({ name: workflow.name, description: workflow.description, isDirty: false }),

  reset: () => set(INITIAL_STATE),
}));
