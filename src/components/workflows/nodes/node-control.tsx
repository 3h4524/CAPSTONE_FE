"use client";

import type { ReactNode, SyntheticEvent } from "react";

import { cn } from "@/utils/cn";

type NodeControlProps = {
  children: ReactNode;
  className?: string;
};

const stopNodeEvent = (event: SyntheticEvent) => {
  event.stopPropagation();
  event.nativeEvent.stopPropagation();
};

export const NodeControl = ({ children, className }: NodeControlProps) => (
  <div
    className={cn("nodrag nopan nowheel in-[.wf-select-mode]:pointer-events-none", className)}
    onDoubleClick={stopNodeEvent}
    onKeyDown={stopNodeEvent}
    onWheel={stopNodeEvent}
  >
    {children}
  </div>
);
