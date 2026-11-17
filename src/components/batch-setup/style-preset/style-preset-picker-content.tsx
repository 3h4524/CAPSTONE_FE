"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { StylePresetCard } from "@/components/batch-setup/style-preset/style-preset-card";
import { StylePresetDetail } from "@/components/batch-setup/style-preset/style-preset-detail";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showToast } from "@/helpers/toast";
import type { StylePreset } from "@/types/style-presets";

export const NO_STYLE_VALUE = "none";

type StylePresetPickerContentProps = {
  presets: StylePreset[];
  initialId: string | null;
  onApply: (selectedId: string | null) => void;
  onClose: () => void;
};

export const StylePresetPickerContent = ({ presets, initialId, onApply, onClose }: StylePresetPickerContentProps) => {
  const { t } = useTranslation("common");
  const [draftId, setDraftId] = useState(initialId ?? NO_STYLE_VALUE);
  const draftPreset = presets.find((preset) => preset.id === draftId) ?? null;

  const applyDraft = () => {
    onApply(draftId === NO_STYLE_VALUE ? null : draftId);
    showToast("success", t("batchSetup.style.applied"));
    onClose();
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ScrollArea className="min-h-0">
          <RadioGroup value={draftId} onValueChange={setDraftId} className="gap-2 pr-1" aria-label={t("batchSetup.style.artStyle")}>
            <StylePresetCard
              value={NO_STYLE_VALUE}
              name={t("batchSetup.style.noStyle")}
              description={t("batchSetup.style.noStyleDescription")}
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
        <Button type="button" variant="ghost" onClick={onClose}>{t("batchSetup.cancel")}</Button>
        <Button type="button" onClick={applyDraft}>{t("batchSetup.style.apply")}</Button>
      </DialogFooter>
    </>
  );
};
