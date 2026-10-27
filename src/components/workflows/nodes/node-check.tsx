"use client";

import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

type NodeCheckProps = {
  label: string;
  checked: boolean;
};

export const NodeCheck = ({ label, checked }: NodeCheckProps) => (
  <div className="text-wf-dim flex items-center gap-2 text-[11px]" aria-label={`${label}: ${checked ? "on" : "off"}`}>
    <span
      aria-hidden="true"
      className={cn(
        "grid size-3.5 shrink-0 place-items-center rounded-[3px] border",
        checked ? "border-wf-accent bg-wf-accent text-white" : "border-wf-line"
      )}
    >
      {checked && <Check className="size-2.5" strokeWidth={3} />}
    </span>
    <span aria-hidden="true">{label}</span>
  </div>
);
