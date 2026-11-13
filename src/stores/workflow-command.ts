import { create } from "zustand";

export type WorkflowCommandKind = "save" | "run" | "continue";

export type WorkflowCommand = {
  id: string;
  workflowId: string;
  kind: WorkflowCommandKind;
  stage?: string;
  batchJobId?: string | null;
  runGroupId?: string | null;
  runId?: string | null;
};

export type PanelContinueRequest = { id: string; workflowId: string; requestedAt: number };

type WorkflowCommandState = {
  command: WorkflowCommand | null;
  panelContinue: PanelContinueRequest | null;
  request: (command: WorkflowCommand) => void;
  clear: (id: string) => void;
  requestPanelContinue: (request: PanelContinueRequest) => void;
  clearPanelContinue: (id: string) => void;
};

export const useWorkflowCommandStore = create<WorkflowCommandState>((set, get) => ({
  command: null,
  panelContinue: null,
  request: (command) => set({ command }),
  clear: (id) => {
    if (get().command?.id === id) set({ command: null });
  },
  requestPanelContinue: (panelContinue) => set({ panelContinue }),
  clearPanelContinue: (id) => {
    if (get().panelContinue?.id === id) set({ panelContinue: null });
  },
}));
