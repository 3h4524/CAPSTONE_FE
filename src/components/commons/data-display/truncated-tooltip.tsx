"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TruncatedTooltipProps = {
  value: string;
  className?: string;
  contentClassName?: string;
  emptyFallback?: string;
};

export function TruncatedTooltip({
  value,
  className = "truncate",
  contentClassName,
  emptyFallback = "—",
}: TruncatedTooltipProps) {
  if (!value) return <span className="text-muted-foreground">{emptyFallback}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={value}
          className={`focus-visible:ring-ring block cursor-default focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none ${className}`}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent className={`max-h-60 max-w-sm overflow-y-auto break-words whitespace-normal ${contentClassName ?? ""}`}>
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
