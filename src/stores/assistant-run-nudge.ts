import { create } from "zustand";

type AssistantRunNudgeState = {
  watchedWorkflowId: string | null;
  seenKey: string | null;
  watch: (workflowId: string) => void;
  markSeen: (key: string) => void;
};

export const useAssistantRunNudgeStore = create<AssistantRunNudgeState>((set) => ({
  watchedWorkflowId: null,
  seenKey: null,
  watch: (workflowId) => set({ watchedWorkflowId: workflowId }),
  markSeen: (key) => set({ seenKey: key }),
}));
