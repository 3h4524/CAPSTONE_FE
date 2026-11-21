import { RUN_EFFECTS_STORAGE_KEY } from "@/constants/workflow-run-effects";

export const loadRunEffectsEnabled = (): boolean | null => {
  try {
    const stored = window.localStorage.getItem(RUN_EFFECTS_STORAGE_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
    return null;
  } catch {
    return null;
  }
};

export const saveRunEffectsEnabled = (enabled: boolean) => {
  try {
    window.localStorage.setItem(RUN_EFFECTS_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    return;
  }
};
