"use client";

import type { ReactNode } from "react";

import { useResizableWidth } from "@/hooks/use-resizable-width";
import { cn } from "@/utils/cn";

type ResizableAsideProps = {
  children: ReactNode;
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  reservedWidth?: number;
  label: string;
};

// A right-hand panel whose left edge can be dragged (or moved with the arrow keys) to resize it.
// Only shown from the xl breakpoint; smaller screens open the same content in a sheet instead.
export const ResizableAside = ({ children, storageKey, defaultWidth, minWidth, maxWidth, reservedWidth, label }: ResizableAsideProps) => {
  const { width, isDragging, separatorProps } = useResizableWidth({ storageKey, defaultWidth, minWidth, maxWidth, reservedWidth });

  return (
    <aside style={{ width }} className="relative hidden shrink-0 border-l xl:block">
      <div
        {...separatorProps}
        aria-label={`Resize ${label}`}
        title="Drag to resize, double-click to reset"
        className={cn(
          "group absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize touch-none outline-none",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:transition-colors",
          "hover:after:bg-primary/40 focus-visible:after:bg-primary/60",
          isDragging && "after:bg-primary"
        )}
      />
      {children}
    </aside>
  );
};
