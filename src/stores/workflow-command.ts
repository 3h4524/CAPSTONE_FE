import { create } from "zustand";

export type WorkflowCommandKind = "save" | "run";

export type WorkflowCommand = { id: string; workflowId: string; kind: WorkflowCommandKind };

type WorkflowCommandState = {
  command: WorkflowCommand | null;
  request: (command: WorkflowCommand) => void;
  clear: (id: string) => void;
};

export const useWorkflowCommandStore = create<WorkflowCommandState>((set, get) => ({
  command: null,
  request: (command) => set({ command }),
  clear: (id) => {
    if (get().command?.id === id) set({ command: null });
  },
}));
