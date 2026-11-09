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
  default: "bg-ink-900 text-card hover:bg-ink-700",
  secondary: "bg-ink-100 text-ink-800 hover:bg-ink-200",
  outline: "border border-ink-300 bg-card text-ink-700 hover:border-ink-400 hover:bg-ink-50",
  ghost: "bg-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-800",
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
