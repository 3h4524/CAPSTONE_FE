"use client";

import { getVideoOutputFormats } from "@/helpers/video-output-formats";
import { cn } from "@/utils/cn";

export const VideoOutputFormatCards = ({ value, mode, onChange }: { value: string; mode?: string; onChange: (value: string) => void }) => {
  const formats = getVideoOutputFormats(mode);
  return <div className={cn("grid gap-2", formats.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3")} role="radiogroup" aria-label="Video output format">
    {formats.map(format => {
      const selected = value === format.value;
      return <button key={format.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(format.value)}
        className={cn("focus-visible:ring-ring flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2", selected ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
        <span className={cn("bg-primary/10 border-primary/50 block shrink-0 rounded-sm border", format.width > format.height ? "w-9" : "h-9")}
          style={{ aspectRatio: `${format.width} / ${format.height}` }} aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{format.label}</span>
          <span className="text-muted-foreground block text-[11px] leading-4">{format.aspectRatio}</span>
          <span className="text-muted-foreground block text-[11px] leading-4">{format.dimensions}</span>
        </span>
      </button>;
    })}
  </div>;
};
