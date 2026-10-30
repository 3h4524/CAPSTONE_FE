import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { describeCanvasOperation } from "@/helpers/assistant-canvas-patch";
import type { AssistantCanvasOperation } from "@/types/assistant";
import type { WorkflowField, WorkflowNode } from "@/types/workflow";

const MAX_TEXT_LENGTH = 60;
const SHORT_ID_LENGTH = 8;

export type CanvasChange = { title: string; details: string[] };

type ConfigObject = Record<string, unknown>;

const isConfigObject = (value: unknown): value is ConfigObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const flatten = (config: ConfigObject, prefix = ""): [string, unknown][] =>
  Object.entries(config).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isConfigObject(value) ? flatten(value, path) : [[path, value] as [string, unknown]];
  });

const readPath = (config: ConfigObject, path: string): unknown =>
  path.split(".").reduce<unknown>((current, key) => (isConfigObject(current) ? current[key] : undefined), config);

const clip = (text: string) => (text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text);

const formatValue = (field: WorkflowField | undefined, value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return field?.kind === "source-select" && field.noneLabel ? field.noneLabel : "not set";
  }
  if (field?.kind === "select") return field.options.find((option) => option.value === value)?.label ?? String(value);
  if (field?.kind === "switch") return value === true ? "On" : "Off";
  if (field?.kind === "number") return field.unit ? `${String(value)} ${field.unit}` : String(value);
  if (field?.kind === "source-select" || field?.kind === "product-select") return `item ${String(value).slice(0, SHORT_ID_LENGTH)}…`;
  if (field?.kind === "mockup-selection" && Array.isArray(value)) return `${value.length} template${value.length === 1 ? "" : "s"}`;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  return typeof value === "string" ? `"${clip(value)}"` : String(value);
};

const describeConfigChanges = (operation: AssistantCanvasOperation, nodes: WorkflowNode[]): string[] => {
  const node = nodes.find((item) => item.id === operation.nodeId);
  if (!node || !operation.config) return [];
  const fields = WORKFLOW_NODE_DEFINITIONS[node.data.type]?.fields ?? [];
  return flatten(operation.config).map(([path, next]) => {
    const field = fields.find((item) => item.name === path);
    const label = field?.label ?? path;
    return `${label}: ${formatValue(field, readPath(node.data.config, path))} → ${formatValue(field, next)}`;
  });
};

export const describeCanvasChange = (
  operation: AssistantCanvasOperation,
  nodes: WorkflowNode[],
  operations: AssistantCanvasOperation[] = []
): CanvasChange => ({
  title: describeCanvasOperation(operation, nodes, operations),
  details: operation.op === "update_config" ? describeConfigChanges(operation, nodes) : [],
});
