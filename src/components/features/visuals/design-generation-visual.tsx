"use client";

import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DESIGN_TILES } from "@/data/features-content";
import { cn } from "@/utils/cn";

export const DesignGenerationVisual = () => {
  const { t } = useTranslation("common");
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">“retro sunset, distressed”</p>
        <Badge>
          <Star className="size-3" />
          {t("featuresPage.visuals.variations")}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DESIGN_TILES.map((tile, index) => (
          <div
            key={tile.label}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-2 rounded-lg bg-gradient-to-br",
              tile.tileClass
            )}
          >
            <tile.icon className="text-foreground/70 size-8" strokeWidth={1.5} />
            <span className="text-foreground/80 text-xs font-medium">
              {t(`featuresPage.visuals.designTiles.${index}`, { defaultValue: tile.label })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{t("featuresPage.visuals.transparentPng")}</Badge>
        <Badge variant="outline">{t("featuresPage.visuals.printReady")}</Badge>
      </div>
    </Card>
  );
};
