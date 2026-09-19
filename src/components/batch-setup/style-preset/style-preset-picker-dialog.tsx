"use client";

import { ImageIcon } from "lucide-react";

import { StylePresetPickerContent } from "@/components/batch-setup/style-preset/style-preset-picker-content";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStylePresets } from "@/hooks/queries/use-style-presets";

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
