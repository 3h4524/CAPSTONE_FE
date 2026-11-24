import { create } from "zustand";

import type { PromoVideo } from "@/types/video-workflow";
import type { WorkflowNodeType } from "@/types/workflow";

type SimulatedImages = Partial<Record<WorkflowNodeType, string[]>>;

type RunSimulationState = {
  active: boolean;
  images: SimulatedImages;
  video: Partial<PromoVideo> | null;
  setActive: (active: boolean) => void;
  setImages: (type: WorkflowNodeType, images: string[]) => void;
  setVideo: (video: Partial<PromoVideo> | null) => void;
  clearImages: () => void;
};

export const useRunSimulationStore = create<RunSimulationState>((set) => ({
  active: false,
  images: {},
  video: null,
  setActive: (active) => set({ active }),
  setImages: (type, images) => set((state) => ({ images: { ...state.images, [type]: images } })),
  setVideo: (video) => set({ video }),
  clearImages: () => set({ images: {}, video: null }),
}));
