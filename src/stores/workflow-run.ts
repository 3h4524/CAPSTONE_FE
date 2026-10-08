import { create } from "zustand";

import type { BatchJobDetail } from "@/types/batch-jobs";
import type { GenerateAllMockupsResult } from "@/types/mockup-templates";

// What the runner is doing right now; once it reaches "watching" the job on the server drives the rest.
export type RunStep = "idle" | "preparing-job" | "saving-mockups" | "starting" | "watching";

export type MockupState = "idle" | "running" | "done" | "failed";

type WorkflowRunState = {
  /** The workflow this run belongs to, so switching workflows drops it. */
  workflowId: string | null;
  batchJobId: string | null;
  step: RunStep;
  job: BatchJobDetail | null;
  mockupState: MockupState;
  mockupResult: GenerateAllMockupsResult | null;
  begin: (workflowId: string) => void;
  attach: (workflowId: string, batchJobId: string) => void;
  setStep: (step: RunStep) => void;
  setJob: (job: BatchJobDetail | null) => void;
  setMockupState: (state: MockupState) => void;
  setMockupResult: (result: GenerateAllMockupsResult | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  workflowId: null,
  batchJobId: null,
  step: "idle" as RunStep,
  job: null,
  mockupState: "idle" as MockupState,
  mockupResult: null,
};

export const useWorkflowRunStore = create<WorkflowRunState>((set) => ({
  ...INITIAL_STATE,
  begin: (workflowId) => set({ ...INITIAL_STATE, workflowId, step: "preparing-job" }),
  attach: (workflowId, batchJobId) => set({ ...INITIAL_STATE, workflowId, batchJobId, step: "watching" }),
  setStep: (step) => set({ step }),
  setJob: (job) => set({ job }),
  setMockupState: (mockupState) => set({ mockupState }),
  setMockupResult: (mockupResult) => set({ mockupResult }),
  reset: () => set(INITIAL_STATE),
}));
