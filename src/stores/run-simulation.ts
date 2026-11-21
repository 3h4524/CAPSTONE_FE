import { create } from "zustand";

type RunSimulationState = {
  active: boolean;
  setActive: (active: boolean) => void;
};

export const useRunSimulationStore = create<RunSimulationState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));
