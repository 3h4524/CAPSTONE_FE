import type { LucideIcon } from "lucide-react";

import type { Edge, Node, Viewport } from "@xyflow/react";

export type WorkflowNodeType =
  | "product-input"
  | "prompt-synthesis"
  | "design-image"
  | "design-approval"
  | "apply-mockup"
  | "approval-gate"
  | "generate-video"
  | "review-video"
  | "generate-listing"
  | "export-zip"
  | "publish-etsy"
  | "publish-printify";

export type WorkflowNodeCategory = "trigger" | "ai" | "review" | "output";

/** The two "waiting" statuses are steps that need the person: the run is paused until they act. */
export type WorkflowNodeStatus = "idle" | "running" | "success" | "failed" | "skipped" | "waiting_for_input" | "waiting_for_review" | "cancelled";

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
  version: 2;
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
  revision: number;
}

export interface WorkflowDetail extends WorkflowSummary {
  definition: WorkflowDefinition;
  createdAt: string;
}

export interface SaveWorkflowInput {
  expectedRevision?: number;
  name: string;
  description: string;
  definition: WorkflowDefinition;
}

export type WorkflowNodeData = {
  type: WorkflowNodeType;
  label: string;
  config: WorkflowNodeConfig;
  status: WorkflowNodeStatus;
  stage?: string | null;
  progress?: number;
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
  | {
      kind: "source-select";
      name: string;
      label: string;
      source: WorkflowOptionSource;
      /** The value may stay empty; `noneLabel` is the choice that clears it. */
      optional?: boolean;
      noneLabel?: string;
    }
  | { kind: "product-select"; name: string; label: string; description?: string }
  | { kind: "video-modes"; name: string; label: string }
  | { kind: "video-formats"; name: string; label: string }
  | { kind: "text"; name: string; label: string }
  | { kind: "mockup-selection"; name: string; templateColorsName: string; label: string }
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
  iconClassName: string;
}
