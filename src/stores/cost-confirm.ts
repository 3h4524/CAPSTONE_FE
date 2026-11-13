import { create } from "zustand";

/** One line of what something costs: a step, a product or a design. */
export type CostLine = {
  label: string;
  /** How the amount is made up, e.g. "2 videos × 3 AI clips (18 s)". */
  detail?: string;
  amountUsd: number;
};

export type CostConfirmRequest = {
  title: string;
  description?: string;
  lines: CostLine[];
  totalUsd: number;
  /** The provider's billing note, under the total. */
  note?: string;
  confirmLabel?: string;
};

type CostConfirmState = {
  request: CostConfirmRequest | null;
  resolve: ((confirmed: boolean) => void) | null;
  ask: (request: CostConfirmRequest) => Promise<boolean>;
  answer: (confirmed: boolean) => void;
};

/** The cost the seller is asked to confirm before something paid starts; one question at a time. */
export const useCostConfirmStore = create<CostConfirmState>((set, get) => ({
  request: null,
  resolve: null,
  ask: (request) =>
    new Promise<boolean>((resolve) => {
      // A newer question replaces one still open, which then counts as declined.
      get().resolve?.(false);
      set({ request, resolve });
    }),
  answer: (confirmed) => {
    get().resolve?.(confirmed);
    set({ request: null, resolve: null });
  },
}));

/** Shows the cost and resolves true when the seller confirms it, false when they cancel or close it. */
export const askCostConfirm = (request: CostConfirmRequest) => useCostConfirmStore.getState().ask(request);
