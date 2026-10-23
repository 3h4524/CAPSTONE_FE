"use client";

import { cn } from "@/utils/cn";

type NodeSummaryProps = {
  lines: string[];
  tone?: "slate" | "amber";
};

export const NodeSummary = ({ lines, tone = "slate" }: NodeSummaryProps) => {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1">
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className={cn(
            "truncate text-xs leading-4",
            tone === "amber" ? "text-amber-800" : "text-slate-600"
          )}
        >
          {line}
        </p>
      ))}
    </div>
  );
};
