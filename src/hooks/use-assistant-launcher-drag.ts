"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from "react";

import { ASSISTANT_LAUNCHER_DRAG_THRESHOLD_PX, ASSISTANT_LAUNCHER_KEY_STEP_PX } from "@/constants/assistant";
import {
  clampLauncherPosition,
  defaultLauncherPosition,
  type LauncherPosition,
  loadLauncherPosition,
  saveLauncherPosition,
} from "@/helpers/assistant-launcher-position";
import { useAssistantStore } from "@/stores/assistant";

type DragStart = { pointerX: number; pointerY: number; position: LauncherPosition };

const currentViewport = () => ({ width: window.innerWidth, height: window.innerHeight });

const ARROW_DELTAS: Record<string, { right: number; bottom: number }> = {
  ArrowLeft: { right: 1, bottom: 0 },
  ArrowRight: { right: -1, bottom: 0 },
  ArrowUp: { right: 0, bottom: 1 },
  ArrowDown: { right: 0, bottom: -1 },
};

export const useAssistantLauncherDrag = (pathname: string) => {
  const stored = useAssistantStore((state) => state.launcherPosition);
  const setLauncherPosition = useAssistantStore((state) => state.setLauncherPosition);
  const dragStart = useRef<DragStart | null>(null);
  const moved = useRef(false);
  const position = stored ?? defaultLauncherPosition(pathname);

  useEffect(() => {
    const saved = loadLauncherPosition();
    if (saved) setLauncherPosition(clampLauncherPosition(saved, currentViewport()));
  }, [setLauncherPosition]);

  useEffect(() => {
    const keepInside = () => {
      const { launcherPosition } = useAssistantStore.getState();
      if (launcherPosition) setLauncherPosition(clampLauncherPosition(launcherPosition, currentViewport()));
    };
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, [setLauncherPosition]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, position };
    moved.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = dragStart.current;
    if (!start) return;
    const deltaX = event.clientX - start.pointerX;
    const deltaY = event.clientY - start.pointerY;
    if (!moved.current && Math.hypot(deltaX, deltaY) < ASSISTANT_LAUNCHER_DRAG_THRESHOLD_PX) return;
    moved.current = true;
    setLauncherPosition(
      clampLauncherPosition({ right: start.position.right - deltaX, bottom: start.position.bottom - deltaY }, currentViewport())
    );
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const finalPosition = useAssistantStore.getState().launcherPosition;
    if (moved.current && finalPosition) saveLauncherPosition(finalPosition);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const delta = ARROW_DELTAS[event.key];
    if (!event.shiftKey || !delta) return;
    event.preventDefault();
    const next = clampLauncherPosition(
      {
        right: position.right + delta.right * ASSISTANT_LAUNCHER_KEY_STEP_PX,
        bottom: position.bottom + delta.bottom * ASSISTANT_LAUNCHER_KEY_STEP_PX,
      },
      currentViewport()
    );
    setLauncherPosition(next);
    saveLauncherPosition(next);
  };

  const consumeClick = () => {
    const wasDrag = moved.current;
    moved.current = false;
    return wasDrag;
  };

  return { position, handlers: { onPointerDown, onPointerMove, onPointerUp, onKeyDown }, consumeClick };
};
