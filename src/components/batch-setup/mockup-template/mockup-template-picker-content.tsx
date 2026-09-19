"use client";

import { useState } from "react";

import { MockupTemplateCard } from "@/components/batch-setup/mockup-template/mockup-template-card";
import { MockupTemplateDetail } from "@/components/batch-setup/mockup-template/mockup-template-detail";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MAX_MOCKUP_SELECTION } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplatePickerContentProps = {
  templates: MockupTemplate[];
  initialIds: string[];
  pending: boolean;
  onApply: (selectedIds: string[]) => void;
  onClose: () => void;
};

export const MockupTemplatePickerContent = ({ templates, initialIds, pending, onApply, onClose }: MockupTemplatePickerContentProps) => {
  const [draftIds, setDraftIds] = useState(initialIds);
  const focusedTemplate = templates.find((template) => draftIds.includes(template.id)) ?? null;
  const tooMany = draftIds.length > MAX_MOCKUP_SELECTION;

  const toggleId = (id: string) =>
    setDraftIds((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ScrollArea className="min-h-0">
          <div className="flex flex-col gap-2 pr-1" role="group" aria-label="Mock-up templates">
            {templates.map((template) => (
              <MockupTemplateCard
                key={template.id}
                template={template}
                selected={draftIds.includes(template.id)}
                onToggle={toggleId}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="hidden min-h-0 md:block">
          <MockupTemplateDetail template={focusedTemplate} />
        </div>
      </div>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {draftIds.length} of {MAX_MOCKUP_SELECTION} selected
        {tooMany ? " — remove some to apply." : draftIds.length === 0 ? " — select at least one template." : ""}
      </p>
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" disabled={pending || draftIds.length === 0 || tooMany} onClick={() => onApply(draftIds)}>
          Apply mock-ups
        </Button>
      </DialogFooter>
    </>
  );
};
