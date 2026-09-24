import { workflowMockServer } from "@/api/mock/workflow-mock-server";
import type { SaveWorkflowInput, WorkflowDetail, WorkflowSummary } from "@/types/workflow";

export const workflowKeys = {
  all: ["workflows"] as const,
  list: () => [...workflowKeys.all, "list"] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
};

export const listWorkflows = (signal?: AbortSignal): Promise<WorkflowSummary[]> =>
  workflowMockServer.list(signal);

export const getWorkflow = (id: string, signal?: AbortSignal): Promise<WorkflowDetail> =>
  workflowMockServer.get(id, signal);

export const createWorkflow = (input: SaveWorkflowInput): Promise<WorkflowDetail> =>
  workflowMockServer.create(input);

export const updateWorkflow = (id: string, input: SaveWorkflowInput): Promise<WorkflowDetail> =>
  workflowMockServer.update(id, input);

export const deleteWorkflow = (id: string): Promise<void> => workflowMockServer.remove(id);
