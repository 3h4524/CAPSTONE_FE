"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StylePresetFormDialog } from "@/components/admin/style-art-presets/style-preset-form-dialog";
import { StylePresetList } from "@/components/admin/style-art-presets/style-preset-list";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAdminStyleArtPresets } from "@/hooks/queries/use-admin-style-art-presets";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

export const StyleArtPresetsShell = () => {
  const { t } = useTranslation("common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStyleArtPreset | null>(null);
  const { data, isPending, isError, error } = useAdminStyleArtPresets();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (preset: AdminStyleArtPreset) => {
    setEditing(preset);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.styles.pageTitle")}
        description={t("admin.styles.pageDescription")}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            {t("admin.styles.newStyle")}
          </Button>
        }
      />

      <StylePresetList isPending={isPending} isError={isError} error={error} presets={data} onEdit={openEdit} />

      <StylePresetFormDialog
        open={dialogOpen}
        preset={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};
