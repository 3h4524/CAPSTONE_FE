"use client";

import { ChevronDown, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";

type StylePresetTriggerProps = {
  selectedName: string | null;
  onOpen: () => void;
};

export const StylePresetTrigger = ({ selectedName, onOpen }: StylePresetTriggerProps) => (
  <Button type="button" variant="outline" onClick={onOpen} className="w-full justify-between">
    <span className="flex min-w-0 items-center gap-2">
      <Palette className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="truncate">{selectedName ?? "Choose art style"}</span>
    </span>
    <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
  </Button>
);
