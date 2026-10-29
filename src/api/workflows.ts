import { api } from "@/api/client";
import type { SaveWorkflowInput, WorkflowDetail, WorkflowSummary } from "@/types/workflow";

export const workflowKeys = {
  all: ["workflows"] as const,
  list: () => [...workflowKeys.all, "list"] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
};

export const listWorkflows = async (signal?: AbortSignal): Promise<WorkflowSummary[]> => (await api.get<WorkflowSummary[]>("/api/workflows", { signal })).data;

export const getWorkflow = async (id: string, signal?: AbortSignal): Promise<WorkflowDetail> => (await api.get<WorkflowDetail>(`/api/workflows/${id}`, { signal })).data;

export const createWorkflow = async (input: SaveWorkflowInput): Promise<WorkflowDetail> => (await api.post<WorkflowDetail>("/api/workflows", input)).data;

export const updateWorkflow = async (id: string, input: SaveWorkflowInput): Promise<WorkflowDetail> => (await api.put<WorkflowDetail>(`/api/workflows/${id}`, input)).data;

export const deleteWorkflow = async (id: string, revision: number): Promise<void> => { await api.delete(`/api/workflows/${id}`, { params: { revision } }); };
