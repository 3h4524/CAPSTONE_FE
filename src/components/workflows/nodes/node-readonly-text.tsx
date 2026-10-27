"use client";

import { cn } from "@/utils/cn";

type NodeReadonlyTextProps = {
  value?: string;
  placeholder: string;
};

export const NodeReadonlyText = ({ value, placeholder }: NodeReadonlyTextProps) => (
  <div className="border-wf-line min-h-8 rounded-md border px-2.5 py-1.5">
    <p
      className={cn(
        "line-clamp-2 text-[11px] leading-4",
        value ? "text-wf-dim" : "text-wf-faint"
      )}
    >
      {value || placeholder}
    </p>
  </div>
);
