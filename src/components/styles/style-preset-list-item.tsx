"use client";

import Image from "next/image";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { StylePreset } from "@/types/style-presets";
import { cn } from "@/utils/cn";

type StylePresetListItemProps = {
  preset: StylePreset;
  busy?: boolean;
  onEdit: (preset: StylePreset) => void;
  onDelete: (preset: StylePreset) => void;
};

export const StylePresetListItem = ({ preset, busy = false, onEdit, onDelete }: StylePresetListItemProps) => {
  const { t } = useTranslation("common");
  return (
  <Card className="relative overflow-hidden max-md:gap-0 max-md:rounded-2xl max-md:py-0">
    {preset.previewImageUrl ? (
      <Image
        src={preset.previewImageUrl}
        alt={preset.name}
        width={640}
        height={360}
        unoptimized
        className="aspect-video w-full object-cover max-md:aspect-[21/9]"
      />
    ) : (
      <span aria-hidden="true" className={cn("from-ink-200 via-ink-100 to-ink-200 block aspect-video w-full bg-gradient-to-br max-md:aspect-[21/9]")} />
    )}
    {preset.isMine && (
      <div className="absolute top-2 right-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon-sm" className="bg-card rounded-full shadow-sm" disabled={busy} aria-label={t("styles.actionsFor", { name: preset.name })}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(preset)}>
              <Pencil />
              {t("styles.editStyle")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(preset)}>
              <Trash2 />
              {t("styles.deleteStyle")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
    <CardContent className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <p className="text-ink-900 min-w-0 flex-1 truncate font-semibold">{preset.name}</p>
        <Badge variant={preset.isSystemTemplate ? "secondary" : "default"}>
          {preset.isSystemTemplate ? (
            t("styles.system")
          ) : (
            <>
              <span className="md:hidden">{t("styles.custom")}</span>
              <span className="max-md:hidden">{t("styles.mine")}</span>
            </>
          )}
        </Badge>
      </div>
      <p className="text-muted-foreground line-clamp-2 text-sm">{preset.description}</p>
      <p className="text-muted-foreground text-xs tabular-nums md:hidden">
        {t("styles.usedCount", { count: preset.usageCount })}
      </p>
      {preset.isMine && (
        <div className="mt-1 flex gap-2 max-md:hidden">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onEdit(preset)}>
            <Pencil aria-hidden="true" />
            {t("styles.edit")}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(preset)}>
            <Trash2 aria-hidden="true" />
            {t("styles.delete")}
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
  );
};
