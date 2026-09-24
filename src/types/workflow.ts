import type { LucideIcon } from "lucide-react";

import type { Edge, Node, Viewport } from "@xyflow/react";

export type WorkflowNodeType =
  | "product-input"
  | "prompt-synthesis"
  | "design-image"
  | "approval-gate"
  | "apply-mockup"
  | "generate-video"
  | "generate-listing"
  | "export-zip"
  | "publish-etsy"
  | "publish-printify";

export type WorkflowNodeCategory = "trigger" | "ai" | "review" | "output";

export type WorkflowNodeStatus = "idle" | "running" | "success" | "failed" | "skipped";

export type WorkflowNodeConfig = Record<string, unknown>;

export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowDefinitionNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: WorkflowPosition;
  config: WorkflowNodeConfig;
}

export interface WorkflowDefinitionEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  version: 1;
  nodes: WorkflowDefinitionNode[];
  edges: WorkflowDefinitionEdge[];
  viewport: Viewport;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  updatedAt: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  definition: WorkflowDefinition;
  createdAt: string;
}

export interface SaveWorkflowInput {
  name: string;
  description: string;
  definition: WorkflowDefinition;
}

export type WorkflowNodeData = {
  type: WorkflowNodeType;
  label: string;
  config: WorkflowNodeConfig;
  status: WorkflowNodeStatus;
};

export type WorkflowNode = Node<WorkflowNodeData, "workflow">;

export type WorkflowEdge = Edge;

export interface WorkflowIssue {
  id: string;
  nodeId: string | null;
  message: string;
}

export interface WorkflowOption {
  value: string;
  label: string;
}

export type WorkflowOptionSource = "batches" | "design-templates" | "style-presets";

export type WorkflowField =
  | { kind: "select"; name: string; label: string; options: WorkflowOption[] }
  | { kind: "source-select"; name: string; label: string; source: WorkflowOptionSource }
  | { kind: "mockup-templates"; name: string; label: string }
  | { kind: "number"; name: string; label: string; min: number; max: number; unit?: string }
  | { kind: "switch"; name: string; label: string; description: string }
  | { kind: "textarea"; name: string; label: string; placeholder: string };

export interface WorkflowNodeDefinition {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: WorkflowNodeCategory;
  hasInput: boolean;
  hasOutput: boolean;
  defaultConfig: WorkflowNodeConfig;
  fields: WorkflowField[];
}

export interface WorkflowCategoryDefinition {
  id: WorkflowNodeCategory;
  label: string;
  accentClassName: string;
}
