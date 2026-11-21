"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PREVIEW_DESIGNS } from "@/data/landing-content";

/** One row of finished designs: short enough to sit level with the text beside it. */
export const DesignGenerationVisual = () => {
  const { t } = useTranslation("common");
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("featuresPage.visuals.designPrompt")}</p>
        <Badge>
          <Sparkles className="size-3" />
          {t("featuresPage.visuals.designCount", { count: PREVIEW_DESIGNS.length })}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PREVIEW_DESIGNS.map((design) => (
          <div key={design.name} className="overflow-hidden rounded-lg border">
            {/* 4:3 like the artwork itself, so every design fills its tile the same way. */}
            <div className="bg-print-surface relative aspect-4/3">
              <Image
                src={design.imageSrc}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 45vw, 160px"
                className="object-cover"
              />
            </div>
            <div className="border-t px-2.5 py-2">
              <p className="truncate text-xs font-semibold">{design.name}</p>
              <p className="text-muted-foreground text-[11px]">
                {t(`landing.productTypes.${design.productTypeKey}`, { defaultValue: design.productType })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{t("featuresPage.visuals.printReady")}</Badge>
        <Badge variant="outline">{t("featuresPage.visuals.mockupsIncluded")}</Badge>
      </div>
    </Card>
  );
};
