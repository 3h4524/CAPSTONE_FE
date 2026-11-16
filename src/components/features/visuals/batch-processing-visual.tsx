"use client";

import { FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BATCH_ROWS } from "@/data/features-content";
import { cn } from "@/utils/cn";

export const BatchProcessingVisual = () => {
  const { t } = useTranslation("common");
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="flex flex-col gap-4">
        {BATCH_ROWS.map((row, index) => (
          <div key={row.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="text-primary size-4" />
                {row.name}
              </p>
              <Badge variant={row.badgeVariant}>{t(`featuresPage.visuals.batchStatuses.${index}`, { defaultValue: row.status })}</Badge>
            </div>
            <span className="bg-muted h-2 overflow-hidden rounded-full">
              <span
                className={cn("bg-primary block h-full rounded-full", row.progressClass)}
              />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
