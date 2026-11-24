import { create } from "zustand";

import type { WorkflowNodeType } from "@/types/workflow";

type SimulatedImages = Partial<Record<WorkflowNodeType, string[]>>;

type RunSimulationState = {
  active: boolean;
  images: SimulatedImages;
  setActive: (active: boolean) => void;
  setImages: (type: WorkflowNodeType, images: string[]) => void;
  clearImages: () => void;
};

export const useRunSimulationStore = create<RunSimulationState>((set) => ({
  active: false,
  images: {},
  setActive: (active) => set({ active }),
  setImages: (type, images) => set((state) => ({ images: { ...state.images, [type]: images } })),
  clearImages: () => set({ images: {} }),
}));
