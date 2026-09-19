"use client";

import { useState } from "react";
import { ImageIcon, Plus } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { StylePresetFormDialog } from "@/components/styles/style-preset-form-dialog";
import { StylePresetListItem } from "@/components/styles/style-preset-list-item";
import { Button } from "@/components/ui/button";
import { useDeleteStylePreset } from "@/hooks/mutations/use-delete-style-preset";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import { usePopupStore } from "@/stores/popup";
import type { StylePreset } from "@/types/style-presets";

export const StylesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<StylePreset | null>(null);
  const { data: presets, isPending: isLoadingPresets, isError: isPresetsError, refetch: refetchPresets } = useStylePresets();
  const { mutate: deletePreset, isPending: isDeleting } = useDeleteStylePreset();
  const openPopup = usePopupStore((state) => state.openPopup);

  const openCreate = () => {
    setEditingPreset(null);
    setDialogOpen(true);
  };

  const openEdit = (preset: StylePreset) => {
    setEditingPreset(preset);
    setDialogOpen(true);
  };

  const askDelete = (preset: StylePreset) => {
    openPopup({
      title: `Delete ${preset.name}?`,
      description: "This removes the style permanently. System styles cannot be deleted.",
      positiveLabel: "Delete",
      onPositive: () => deletePreset(preset.id),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Styles</h1>
          <p className="text-muted-foreground mt-1 text-sm">Browse system styles and manage styles you created.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={isDeleting}>
          <Plus aria-hidden="true" />
          New style
        </Button>
      </div>
      {isLoadingPresets ? (
        <SectionLoading label="Loading art styles" />
      ) : isPresetsError || !presets ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center" role="alert">
          <ImageIcon className="size-8 text-slate-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">Art styles unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">We could not load art styles. Check your connection and try again.</p>
          </div>
          <Button type="button" onClick={() => refetchPresets()}>Try again</Button>
        </div>
      ) : presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-900">No art styles yet</p>
          <p className="text-muted-foreground text-sm">Create your first style to shape generated images.</p>
          <Button type="button" onClick={openCreate}>New style</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <StylePresetListItem key={preset.id} preset={preset} busy={isDeleting} onEdit={openEdit} onDelete={askDelete} />
          ))}
        </div>
      )}
      <StylePresetFormDialog open={dialogOpen} preset={editingPreset} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
