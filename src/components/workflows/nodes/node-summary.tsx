"use client";

import { cn } from "@/utils/cn";

type NodeSummaryProps = {
  lines: string[];
  tone?: "slate" | "amber";
};

export const NodeSummary = ({ lines, tone = "slate" }: NodeSummaryProps) => {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className={cn("truncate text-xs", tone === "amber" ? "text-amber-200/90" : "text-slate-400")}
        >
          {line}
        </p>
      ))}
    </div>
  );
};
