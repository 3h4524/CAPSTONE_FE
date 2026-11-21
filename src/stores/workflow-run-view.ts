import { create } from "zustand";

type WorkflowRunViewState = {
  effectsEnabled: boolean;
  followPaused: boolean;
  panelsRevealed: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
  setFollowPaused: (paused: boolean) => void;
  setPanelsRevealed: (revealed: boolean) => void;
  resetForRun: () => void;
};

export const useWorkflowRunViewStore = create<WorkflowRunViewState>((set) => ({
  effectsEnabled: true,
  followPaused: false,
  panelsRevealed: false,
  setEffectsEnabled: (effectsEnabled) => set({ effectsEnabled, followPaused: false, panelsRevealed: false }),
  setFollowPaused: (followPaused) => set({ followPaused }),
  setPanelsRevealed: (panelsRevealed) => set({ panelsRevealed }),
  resetForRun: () => set({ followPaused: false, panelsRevealed: false }),
}));
