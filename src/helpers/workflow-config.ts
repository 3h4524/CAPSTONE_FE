import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import type { WorkflowNodeConfig, WorkflowNodeDefinition, WorkflowNodeType } from "@/types/workflow";

export const readString = (value: unknown): string => (typeof value === "string" ? value : "");

export const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const readBoolean = (value: unknown): boolean => value === true;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const readInstructionsPreview = (config: WorkflowNodeConfig): string =>
  readString(config.instructions).trim();

export const isWorkflowNodeType = (value: string): value is WorkflowNodeType =>
  Object.hasOwn(WORKFLOW_NODE_DEFINITIONS, value);

export const getWorkflowNodeDefinition = (type: string): WorkflowNodeDefinition | undefined =>
  isWorkflowNodeType(type) ? WORKFLOW_NODE_DEFINITIONS[type] : undefined;

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
        return [readString(value) ? `${field.label} selected` : `${field.label} not set`];
      case "mockup-templates": {
        const count = readStringArray(value).length;
        return [count > 0 ? `${count} ${field.label.toLowerCase()}` : `${field.label} not set`];
      }
      case "number": {
        const amount = readNumber(value);
        return amount === undefined ? [] : [`${field.label}: ${amount}${field.unit ?? ""}`];
      }
      case "switch":
        return readBoolean(value) ? [field.label] : [];
      case "textarea":
        return [];
    }
  });
};
