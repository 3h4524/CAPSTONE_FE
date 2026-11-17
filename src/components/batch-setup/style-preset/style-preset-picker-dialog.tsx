"use client";

import { ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  const { data: presets, isPending: isLoadingPresets, isError: isPresetsError, refetch: refetchPresets } = useStylePresets(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{t("batchSetup.style.choose")}</DialogTitle>
          <DialogDescription>{t("batchSetup.style.chooseDescription")}</DialogDescription>
        </DialogHeader>
        {isLoadingPresets ? (
          <SectionLoading label={t("batchSetup.style.loading")} />
        ) : isPresetsError || !presets ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
            <ImageIcon className="text-ink-400 size-8" aria-hidden="true" />
            <div>
              <p className="text-ink-900 font-semibold">{t("batchSetup.style.unavailable")}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t("batchSetup.style.unavailableDescription")}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("batchSetup.close")}</Button>
              <Button type="button" onClick={() => refetchPresets()}>{t("batchSetup.tryAgain")}</Button>
            </div>
          </div>
        ) : (
          <StylePresetPickerContent presets={presets} initialId={initialId} onApply={onApply} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};
