import { create } from "zustand";

type WorkflowRunViewState = {
  effectsEnabled: boolean;
  followPaused: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
  setFollowPaused: (paused: boolean) => void;
};

export const useWorkflowRunViewStore = create<WorkflowRunViewState>((set) => ({
  effectsEnabled: true,
  followPaused: false,
  setEffectsEnabled: (effectsEnabled) => set({ effectsEnabled, followPaused: false }),
  setFollowPaused: (followPaused) => set({ followPaused }),
}));
