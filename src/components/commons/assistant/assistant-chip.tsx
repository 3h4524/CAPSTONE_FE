import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AssistantChipProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  icon?: ReactNode;
};

export const AssistantChip = ({ label, onClick, disabled, variant, icon }: AssistantChipProps) => (
  <Button
    type="button"
    variant={variant ?? "outline"}
    size="sm"
    className="h-7 rounded-full px-3 text-xs"
    disabled={disabled}
    onClick={onClick}
  >
    {icon}
    {label}
  </Button>
);
