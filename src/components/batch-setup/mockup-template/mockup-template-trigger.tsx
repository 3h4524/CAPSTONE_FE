"use client";

import { ChevronDown, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { selectionLabel } from "@/helpers/mockup-template";

type MockupTemplateTriggerProps = {
  selectedCount: number;
  onOpen: () => void;
};

export const MockupTemplateTrigger = ({ selectedCount, onOpen }: MockupTemplateTriggerProps) => (
  <Button type="button" variant="outline" onClick={onOpen} className="w-full justify-between">
    <span className="flex min-w-0 items-center gap-2">
      <Layers className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="truncate">{selectionLabel(selectedCount)}</span>
    </span>
    <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
  </Button>
);
