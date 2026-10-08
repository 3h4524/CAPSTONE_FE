"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";

type ResizableWidthOptions = {
  /** localStorage key that remembers the width between visits. */
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** Width the rest of the page needs; the panel never grows into it. */
  reservedWidth?: number;
};

const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

const clampWidth = (value: number, minWidth: number, maxWidth: number, reservedWidth: number) =>
  Math.round(Math.max(minWidth, Math.min(value, maxWidth, window.innerWidth - reservedWidth)));

const readStoredWidth = (storageKey: string): number | null => {
  try {
    const stored = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
};

const writeStoredWidth = (storageKey: string, width: number) => {
  try {
    window.localStorage.setItem(storageKey, String(width));
  } catch {
    // The width just is not remembered (private window, blocked storage).
  }
};

// The width of a panel that sits at the right edge and is resized by dragging its left edge. The
// returned props belong on the drag handle: pointer and keyboard (arrow keys) resize it, a double
// click restores the default.
export const useResizableWidth = ({ storageKey, defaultWidth, minWidth, maxWidth, reservedWidth = 0 }: ResizableWidthOptions) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const stored = readStoredWidth(storageKey);
    if (stored !== null) setWidth(clampWidth(stored, minWidth, maxWidth, reservedWidth));
  }, [storageKey, minWidth, maxWidth, reservedWidth]);

  const resizeTo = (next: number) => setWidth(clampWidth(next, minWidth, maxWidth, reservedWidth));

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    dragRef.current = { startX: event.clientX, startWidth: width };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the drag still follows the pointer while it stays over the handle.
    }
    setIsDragging(true);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // The panel is on the right, so dragging left makes it wider.
    resizeTo(drag.startWidth + drag.startX - event.clientX);
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    writeStoredWidth(storageKey, width);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = clampWidth(width + (event.key === "ArrowLeft" ? step : -step), minWidth, maxWidth, reservedWidth);
    setWidth(next);
    writeStoredWidth(storageKey, next);
  };

  const reset = () => {
    setWidth(defaultWidth);
    writeStoredWidth(storageKey, defaultWidth);
  };

  return {
    width,
    isDragging,
    separatorProps: {
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-valuenow": width,
      "aria-valuemin": minWidth,
      "aria-valuemax": maxWidth,
      tabIndex: 0,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown: handleKeyDown,
      onDoubleClick: reset,
    },
  };
};
