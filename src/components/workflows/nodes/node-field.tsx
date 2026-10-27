"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/utils/cn";

type NodeFieldProps = {
  value?: string;
  placeholder: string;
  chevron?: boolean;
};

export const NodeField = ({ value, placeholder, chevron = false }: NodeFieldProps) => (
  <div className="border-wf-line flex h-8 min-w-0 items-center gap-2 rounded-md border px-2.5">
    <span
      className={cn(
        "min-w-0 flex-1 truncate text-[11px] leading-none",
        value ? "text-wf-ink font-medium" : "text-wf-faint"
      )}
    >
      {value || placeholder}
    </span>
    {chevron && <ChevronDown className="text-wf-faint size-3 shrink-0" aria-hidden="true" />}
  </div>
);
