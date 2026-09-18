"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { StylePresetCard } from "@/components/batch-setup/style-preset/style-preset-card";
import { StylePresetDetail } from "@/components/batch-setup/style-preset/style-preset-detail";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showToast } from "@/helpers/toast";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import type { StylePreset } from "@/types/style-presets";

const NO_STYLE_VALUE = "none";

type StylePresetPickerDialogProps = {
  open: boolean;
  initialId: string | null;
  onOpenChange: (open: boolean) => void;
  onApply: (selectedId: string | null) => void;
};

export const StylePresetPickerDialog = ({ open, initialId, onOpenChange, onApply }: StylePresetPickerDialogProps) => {
  const { data: presets, isPending: isLoadingPresets, isError: isPresetsError, refetch: refetchPresets } = useStylePresets(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Choose art style</DialogTitle>
          <DialogDescription>Pick a preset to shape every image made from this template.</DialogDescription>
        </DialogHeader>
        {isLoadingPresets ? (
          <SectionLoading label="Loading art styles" />
        ) : isPresetsError || !presets ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
            <ImageIcon className="size-8 text-slate-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">Art styles unavailable</p>
              <p className="text-muted-foreground mt-1 text-sm">We could not load art styles. Check your connection and try again.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="button" onClick={() => refetchPresets()}>Try again</Button>
            </div>
          </div>
        ) : (
          <StylePresetPickerContent presets={presets} initialId={initialId} onApply={onApply} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};

type StylePresetPickerContentProps = {
  presets: StylePreset[];
  initialId: string | null;
  onApply: (selectedId: string | null) => void;
  onClose: () => void;
};

const StylePresetPickerContent = ({ presets, initialId, onApply, onClose }: StylePresetPickerContentProps) => {
  const [draftId, setDraftId] = useState(initialId ?? NO_STYLE_VALUE);
  const draftPreset = presets.find((preset) => preset.id === draftId) ?? null;

  const applyDraft = () => {
    onApply(draftId === NO_STYLE_VALUE ? null : draftId);
    showToast("success", "Art style applied.");
    onClose();
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ScrollArea className="min-h-0">
          <RadioGroup value={draftId} onValueChange={setDraftId} className="gap-2 pr-1" aria-label="Art style">
            <StylePresetCard
              value={NO_STYLE_VALUE}
              name="No style"
              description="Use the prompt exactly as written, with no extra style keywords."
              previewImageUrl={null}
              selected={draftId === NO_STYLE_VALUE}
            />
            {presets.map((preset) => (
              <StylePresetCard
                key={preset.id}
                value={preset.id}
                name={preset.name}
                description={preset.description}
                previewImageUrl={preset.previewImageUrl}
                selected={draftId === preset.id}
              />
            ))}
          </RadioGroup>
        </ScrollArea>
        <div className="hidden min-h-0 md:block">
          <StylePresetDetail preset={draftPreset} />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={applyDraft}>Apply style</Button>
      </DialogFooter>
    </>
  );
};
