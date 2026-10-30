import { ASSISTANT_DISPLAY_MODE_STORAGE_KEY, ASSISTANT_DOCK_ENABLED } from "@/constants/assistant";

export type AssistantDisplayMode = "panel" | "bubble";

export const effectiveDisplayMode = (mode: AssistantDisplayMode): AssistantDisplayMode =>
  ASSISTANT_DOCK_ENABLED ? mode : "bubble";

export const isDockedPanelOpen = (state: { isOpen: boolean; displayMode: AssistantDisplayMode }) =>
  state.isOpen && effectiveDisplayMode(state.displayMode) === "panel";

export const isBubbleOpen = (state: { isOpen: boolean; displayMode: AssistantDisplayMode }) =>
  state.isOpen && effectiveDisplayMode(state.displayMode) === "bubble";

const isDisplayMode = (value: unknown): value is AssistantDisplayMode => value === "panel" || value === "bubble";

export const loadDisplayMode = (): AssistantDisplayMode | null => {
  try {
    const stored = window.localStorage.getItem(ASSISTANT_DISPLAY_MODE_STORAGE_KEY);
    return isDisplayMode(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const saveDisplayMode = (mode: AssistantDisplayMode) => {
  try {
    window.localStorage.setItem(ASSISTANT_DISPLAY_MODE_STORAGE_KEY, mode);
  } catch {
    return;
  }
};
