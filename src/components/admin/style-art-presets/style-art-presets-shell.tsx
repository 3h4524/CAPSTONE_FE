"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { StylePresetFormDialog } from "@/components/admin/style-art-presets/style-preset-form-dialog";
import { StylePresetList } from "@/components/admin/style-art-presets/style-preset-list";
import { Button } from "@/components/ui/button";
import { useAdminStyleArtPresets } from "@/hooks/queries/use-admin-style-art-presets";
import type { AdminStyleArtPreset } from "@/types/admin-style-art-presets";

export const StyleArtPresetsShell = () => {
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight sm:text-2xl">System styles</h2>
          <p className="text-ink-600 max-w-3xl text-sm leading-relaxed">
            System art styles shown to every seller. English and Vietnamese fields are saved separately; sellers see whichever language the app is set to.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          New style
        </Button>
      </header>

      <StylePresetList isPending={isPending} isError={isError} error={error} presets={data} onEdit={openEdit} />

      <StylePresetFormDialog
        open={dialogOpen}
        preset={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};
