import { create } from "zustand";

type RunGroupLiveState = {
  /** The run group whose changes arrive over the workflow hub right now; null while disconnected. */
  connectedGroupId: string | null;
  setConnectedGroupId: (groupId: string | null) => void;
};

// While the hub delivers a group's changes, its runs need no polling; when it drops, polling takes over.
export const useRunGroupLive = create<RunGroupLiveState>((set) => ({
  connectedGroupId: null,
  setConnectedGroupId: (connectedGroupId) => set({ connectedGroupId }),
}));
