import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type AssistantChipVariant = "default" | "outline" | "ghost" | "secondary";

type AssistantChipProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: AssistantChipVariant;
  icon?: ReactNode;
};

const CHIP_BASE =
  "h-7 gap-1.5 rounded-full px-3 text-xs font-medium shadow-none transition-colors hover:translate-y-0 disabled:opacity-40";

const CHIP_VARIANTS: Record<AssistantChipVariant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-700",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  outline: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
};

export const AssistantChip = ({ label, onClick, disabled, variant = "outline", icon }: AssistantChipProps) => (
  <Button
    type="button"
    variant="none"
    size="sm"
    className={cn(CHIP_BASE, CHIP_VARIANTS[variant])}
    disabled={disabled}
    onClick={onClick}
  >
    {icon}
    {label}
  </Button>
);
