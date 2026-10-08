import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import type { WorkflowField, WorkflowNodeConfig, WorkflowNodeDefinition, WorkflowNodeType } from "@/types/workflow";

export const readString = (value: unknown): string => (typeof value === "string" ? value : "");

export const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const readTemplateColors = (value: unknown): Record<string, string[]> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([templateId, colors]) => [templateId, readStringArray(colors)]))
    : {};

export const readBoolean = (value: unknown): boolean => value === true;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const readInstructionsPreview = (config: WorkflowNodeConfig): string =>
  readString(config.instructions).trim();

const MAX_NODE_LABEL_LENGTH = 60;

export const sanitizeNodeLabel = (value: string, fallback: string): string => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.slice(0, MAX_NODE_LABEL_LENGTH);
};

export const isWorkflowNodeType = (value: string): value is WorkflowNodeType =>
  Object.hasOwn(WORKFLOW_NODE_DEFINITIONS, value);

export const getWorkflowNodeDefinition = (type: string): WorkflowNodeDefinition | undefined =>
  isWorkflowNodeType(type) ? WORKFLOW_NODE_DEFINITIONS[type] : undefined;

// A field named "standardOptions.transition" edits a value inside the `standardOptions` key.
const getFieldKeys = (field: WorkflowField): string[] =>
  (field.kind === "mockup-selection" ? [field.name, field.templateColorsName] : [field.name]).map((name) => name.split(".")[0]);

// Keeps only the keys the node still declares (in its fields or its defaults), over its defaults, so a
// workflow saved before a key existed (or after one was removed) still loads into a config the schema accepts.
export const normalizeNodeConfig = (type: WorkflowNodeType, config: WorkflowNodeConfig): WorkflowNodeConfig => {
  const definition = WORKFLOW_NODE_DEFINITIONS[type];
  const normalized: WorkflowNodeConfig = { ...definition.defaultConfig };
  new Set([...Object.keys(definition.defaultConfig), ...definition.fields.flatMap(getFieldKeys)]).forEach((key) => {
    if (key in config) normalized[key] = config[key];
  });
  return normalized;
};

export const summarizeNodeConfig = (type: WorkflowNodeType, config: WorkflowNodeConfig): string[] => {
  const definition = getWorkflowNodeDefinition(type);
  if (!definition) return [];
  return definition.fields.flatMap((field) => {
    const value = config[field.name];

    switch (field.kind) {
      case "select": {
        const option = field.options.find((item) => item.value === value);
        return option ? [`${field.label}: ${option.label}`] : [];
      }
      case "source-select":
        if (readString(value)) return [`${field.label} selected`];
        return [field.optional ? `${field.label}: ${field.noneLabel ?? "none"}` : `${field.label} not set`];
      case "mockup-selection": {
        const count = readStringArray(value).length;
        if (count === 0) return [`${field.label} not set`];
        const colors = Object.values(readTemplateColors(config[field.templateColorsName])).reduce((total, list) => total + list.length, 0);
        return [
          `${count} ${field.label.toLowerCase()}`,
          ...(colors > 0 ? [`${colors} garment color${colors === 1 ? "" : "s"}`] : []),
        ];
      }
      case "number": {
        const amount = readNumber(value);
        return amount === undefined ? [] : [`${field.label}: ${amount}${field.unit ?? ""}`];
      }
      case "switch":
        return readBoolean(value) ? [field.label] : [];
      case "textarea":
      case "text":
      case "product-select":
      case "video-modes":
      case "video-formats":
        return [];
    }
  });
};
