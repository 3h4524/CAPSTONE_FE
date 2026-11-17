"use client";

import Image from "next/image";
import { Pencil, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ViStatusBadge } from "@/components/admin/style-art-presets/vi-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/helpers/error-message";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

type StylePresetListProps = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  presets: AdminStyleArtPreset[] | undefined;
  onEdit: (preset: AdminStyleArtPreset) => void;
};

export const StylePresetList = ({ isPending, isError, error, presets, onEdit }: StylePresetListProps) => {
  const { t } = useTranslation("common");

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-rose-700">{getErrorMessage(error, t("admin.styles.list.loadErrorFallback"))}</p>;
  }

  if (!presets?.length) {
    return (
      <div className="border-ink-200 text-ink-600 flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center text-sm">
        <Sparkles className="text-ink-400 size-5" />
        {t("admin.styles.list.emptyState")}
      </div>
    );
  }

  return (
    <div className="border-ink-200 overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t("admin.styles.list.previewHeader")}</TableHead>
            <TableHead>{t("admin.styles.list.nameHeader")}</TableHead>
            <TableHead className="w-20">{t("admin.styles.list.usedHeader")}</TableHead>
            <TableHead className="w-40">{t("admin.styles.list.viStatusHeader")}</TableHead>
            <TableHead className="w-20 text-right">{t("admin.styles.list.editHeader")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presets.map((preset) => (
            <TableRow key={preset.id} className={preset.isActive ? undefined : "opacity-60"}>
              <TableCell>
                {preset.previewImageUrl ? (
                  <Image
                    src={preset.previewImageUrl}
                    alt={preset.name}
                    width={48}
                    height={48}
                    sizes="48px"
                    className="border-ink-200 size-12 rounded-md border object-cover"
                  />
                ) : (
                  <div className="bg-ink-100 text-ink-400 flex size-12 items-center justify-center rounded-md text-[10px] font-semibold">
                    {t("admin.styles.list.noImage")}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-ink-900 font-medium">{preset.name}</div>
                <div className="text-ink-500 max-w-md truncate text-xs">{preset.description}</div>
                {!preset.isActive && <div className="text-[10px] font-semibold text-rose-700">{t("admin.styles.list.inactiveBadge")}</div>}
              </TableCell>
              <TableCell className="text-ink-700 tabular-nums">{preset.usageCount}</TableCell>
              <TableCell>
                <ViStatusBadge status={preset.viStatus} />
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" size="icon" aria-label={t("admin.styles.list.editAriaLabel", { name: preset.name })} onClick={() => onEdit(preset)}>
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
