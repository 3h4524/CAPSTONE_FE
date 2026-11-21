import { create } from "zustand";

/** A setting the content check refused, on one node of the open workflow. */
export type WorkflowContentIssue = {
  nodeId: string;
  /** The config field it is in ("instructions", "aiScenes.1.studioPrompt"), or null when only the node is known. */
  field: string | null;
  message: string;
};

type WorkflowContentIssuesState = {
  issues: WorkflowContentIssue[];
  /** Replaces the issues: each refusal says what is wrong with the workflow as it is now. */
  report: (issues: WorkflowContentIssue[]) => void;
  /** Drops the issue of one field once the seller changes it, or every issue of the node without a field. */
  resolve: (nodeId: string, field?: string) => void;
  clear: () => void;
};

export const useWorkflowContentIssuesStore = create<WorkflowContentIssuesState>((set) => ({
  issues: [],
  report: (issues) => set({ issues }),
  resolve: (nodeId, field) =>
    set((state) => {
      const issues = state.issues.filter(
        (issue) => issue.nodeId !== nodeId || (field !== undefined && issue.field !== null && issue.field !== field)
      );
      return issues.length === state.issues.length ? state : { issues };
    }),
  clear: () => set((state) => (state.issues.length === 0 ? state : { issues: [] })),
}));

/** The message of the issue on one field of a node, if the content check refused it. */
export const useContentIssue = (nodeId: string, field: string) =>
  useWorkflowContentIssuesStore(
    (state) => state.issues.find((issue) => issue.nodeId === nodeId && issue.field === field)?.message
  );

/** Whether the content check refused anything on the node. */
export const useNodeHasContentIssue = (nodeId: string) =>
  useWorkflowContentIssuesStore((state) => state.issues.some((issue) => issue.nodeId === nodeId));
