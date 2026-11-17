"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StylePreset } from "@/types/style-presets";

type StylePresetDetailProps = {
  preset: StylePreset | null;
};

export const StylePresetDetail = ({ preset }: StylePresetDetailProps) => {
  const { t } = useTranslation("common");
  if (!preset) {
    return (
      <div className="bg-ink-50 flex h-full flex-col justify-center gap-2 rounded-xl p-5 text-sm">
        <p className="text-ink-900 font-semibold">{t("batchSetup.style.noStyle")}</p>
        <p className="text-muted-foreground">{t("batchSetup.style.noStyleDetail")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="bg-ink-50 flex flex-col gap-4 rounded-xl p-5" aria-live="polite">
        {preset.previewImageUrl && (
          <Image src={preset.previewImageUrl} alt={preset.name} width={640} height={360} unoptimized className="aspect-video w-full rounded-lg object-cover" />
        )}
        <div>
          <p className="text-ink-900 font-semibold">{preset.name}</p>
          <p className="text-muted-foreground mt-1 text-sm">{preset.description}</p>
        </div>
        {preset.recommendations.length > 0 && (
          <div>
            <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{t("batchSetup.style.bestFor")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preset.recommendations.map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{t("batchSetup.style.addedToPrompt")}</p>
          <code className="bg-card text-ink-700 ring-ink-200 mt-2 block rounded-lg p-3 text-xs ring-1 ring-inset">
            {preset.styleModifiers}
          </code>
        </div>
      </div>
    </ScrollArea>
  );
};
