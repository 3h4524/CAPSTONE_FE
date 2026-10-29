import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export const VideoPreviewFrame = ({ width, height, children, maxHeightRem = 28, className }: {
  width: number;
  height: number;
  children: ReactNode;
  maxHeightRem?: number;
  className?: string;
}) => {
  const safeWidth = width > 0 ? width : 1080;
  const safeHeight = height > 0 ? height : 2160;
  return <div className={cn("mx-auto w-full overflow-hidden rounded-xl border bg-slate-950 shadow-sm", className)}
    style={{ aspectRatio: `${safeWidth} / ${safeHeight}`, maxWidth: `${Math.min(40, maxHeightRem * safeWidth / safeHeight)}rem` }}>
    {children}
  </div>;
};
