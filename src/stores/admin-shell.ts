import { create } from "zustand";

type AdminShellOptions = {
  hidesPhoneTabs: boolean;
  titleOverride: string | null;
};

type AdminShellState = AdminShellOptions & {
  setOptions: (options: AdminShellOptions) => void;
  resetOptions: () => void;
};

const DEFAULT_OPTIONS: AdminShellOptions = { hidesPhoneTabs: false, titleOverride: null };

export const useAdminShellStore = create<AdminShellState>((set) => ({
  ...DEFAULT_OPTIONS,
  setOptions: (options) => set(options),
  resetOptions: () => set(DEFAULT_OPTIONS),
}));
