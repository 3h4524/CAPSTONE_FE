import { create } from "zustand";

import type { HandleType } from "@xyflow/react";

type WorkflowConnectionState = {
  sourceNodeId: string | null;
  sourceHandleType: HandleType | null;
  hoveredNodeId: string | null;
  hoveredNodeValid: boolean | null;
  connectableNodeIds: string[];
  start: (nodeId: string, handleType: HandleType | null, connectableNodeIds: string[]) => void;
  hover: (nodeId: string | null, valid: boolean | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  sourceNodeId: null,
  sourceHandleType: null,
  hoveredNodeId: null,
  hoveredNodeValid: null,
  connectableNodeIds: [],
};

export const useWorkflowConnectionStore = create<WorkflowConnectionState>((set) => ({
  ...INITIAL_STATE,
  start: (sourceNodeId, sourceHandleType, connectableNodeIds) =>
    set({ sourceNodeId, sourceHandleType, connectableNodeIds, hoveredNodeId: null, hoveredNodeValid: null }),
  hover: (hoveredNodeId, hoveredNodeValid) =>
    set((state) =>
      state.hoveredNodeId === hoveredNodeId && state.hoveredNodeValid === hoveredNodeValid
        ? state
        : { hoveredNodeId, hoveredNodeValid }
    ),
  reset: () => set(INITIAL_STATE),
}));
