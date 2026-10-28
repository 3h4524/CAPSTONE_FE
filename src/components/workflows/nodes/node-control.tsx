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
    className={cn("nodrag nopan nowheel", className)}
    onPointerDown={stopNodeEvent}
    onClick={stopNodeEvent}
    onDoubleClick={stopNodeEvent}
    onKeyDown={stopNodeEvent}
    onWheel={stopNodeEvent}
  >
    {children}
  </div>
);
