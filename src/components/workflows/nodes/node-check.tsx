"use client";

import { Check } from "lucide-react";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { cn } from "@/utils/cn";

type NodeCheckProps = {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

const boxClassName = (checked: boolean) =>
  cn(
    "grid size-3.5 shrink-0 place-items-center rounded-[3px] border",
    checked ? "border-wf-accent bg-wf-accent text-wf-surface shadow-[0_0_10px_var(--wf-halo)]" : "border-wf-line"
  );

export const NodeCheck = ({ label, checked, onChange, disabled = false }: NodeCheckProps) => {
  if (!onChange) {
    return (
      <div className="text-wf-dim flex items-center gap-2 text-[11px]" aria-label={`${label}: ${checked ? "on" : "off"}`}>
        <span aria-hidden="true" className={boxClassName(checked)}>
          {checked && <Check className="size-2.5" strokeWidth={3} />}
        </span>
        <span aria-hidden="true">{label}</span>
      </div>
    );
  }

  return (
    <NodeControl>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="text-wf-dim hover:text-wf-ink flex items-center gap-2 text-left text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className={boxClassName(checked)}>
          {checked && <Check className="size-2.5" strokeWidth={3} />}
        </span>
        <span>{label}</span>
      </button>
    </NodeControl>
  );
};
