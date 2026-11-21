import { create } from "zustand";

import type { WorkflowPosition } from "@/types/workflow";

type ProcessDotsState = {
  dots: Record<string, WorkflowPosition>;
  place: (edgeId: string, point: WorkflowPosition) => void;
  remove: (edgeId: string) => void;
};

export const useProcessDotsStore = create<ProcessDotsState>((set) => ({
  dots: {},
  place: (edgeId, point) => set((state) => ({ dots: { ...state.dots, [edgeId]: point } })),
  remove: (edgeId) =>
    set((state) => {
      if (!(edgeId in state.dots)) return state;
      const dots = { ...state.dots };
      delete dots[edgeId];
      return { dots };
    }),
}));
