import {
  ASSISTANT_LAUNCHER_DEFAULT_OFFSET_PX,
  ASSISTANT_LAUNCHER_MARGIN_PX,
  ASSISTANT_LAUNCHER_SIZE_PX,
  ASSISTANT_LAUNCHER_STORAGE_KEY,
  ASSISTANT_LAUNCHER_WORKFLOW_BOTTOM_PX,
} from "@/constants/assistant";

export type LauncherPosition = { right: number; bottom: number };

export type Viewport = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export const defaultLauncherPosition = (pathname: string): LauncherPosition => ({
  right: ASSISTANT_LAUNCHER_DEFAULT_OFFSET_PX,
  bottom: pathname === "/workflows" ? ASSISTANT_LAUNCHER_WORKFLOW_BOTTOM_PX : ASSISTANT_LAUNCHER_DEFAULT_OFFSET_PX,
});

export const clampLauncherPosition = (position: LauncherPosition, viewport: Viewport): LauncherPosition => ({
  right: clamp(position.right, ASSISTANT_LAUNCHER_MARGIN_PX, viewport.width - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX),
  bottom: clamp(position.bottom, ASSISTANT_LAUNCHER_MARGIN_PX, viewport.height - ASSISTANT_LAUNCHER_SIZE_PX - ASSISTANT_LAUNCHER_MARGIN_PX),
});

export const loadLauncherPosition = (): LauncherPosition | null => {
  try {
    const raw = window.localStorage.getItem(ASSISTANT_LAUNCHER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { right, bottom } = parsed as Record<string, unknown>;
    return typeof right === "number" && typeof bottom === "number" && Number.isFinite(right) && Number.isFinite(bottom)
      ? { right, bottom }
      : null;
  } catch {
    return null;
  }
};

export const saveLauncherPosition = (position: LauncherPosition) => {
  try {
    window.localStorage.setItem(ASSISTANT_LAUNCHER_STORAGE_KEY, JSON.stringify(position));
  } catch {
    return;
  }
};
