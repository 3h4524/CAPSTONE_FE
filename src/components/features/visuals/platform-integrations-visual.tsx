"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CONNECTED_PLATFORMS } from "@/data/features-content";

export const PlatformIntegrationsVisual = () => {
  const { t } = useTranslation("common");
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3">
        {CONNECTED_PLATFORMS.map((platform) => (
          <div
            key={platform.name}
            className="border-border flex min-w-0 flex-col gap-2 rounded-lg border p-4 max-sm:p-3"
          >
            <platform.icon className="text-primary size-6" strokeWidth={1.75} />
            <p className="text-sm font-semibold">{platform.name}</p>
            <p className="text-muted-foreground text-xs">
              {t(`featuresPage.visuals.platformDetails.${platform.name.toLowerCase()}`, { defaultValue: platform.detail })}
            </p>
            <Badge className="w-fit">
              <Check className="size-3" />
              {t("featuresPage.visuals.connected")}
            </Badge>
          </div>
        ))}
      </div>
      <div className="border-border flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
        <p className="text-muted-foreground text-sm">
          {t("featuresPage.visuals.moreMarketplaces")}
        </p>
        <Badge variant="outline">{t("featuresPage.visuals.connect")}</Badge>
      </div>
    </Card>
  );
};
