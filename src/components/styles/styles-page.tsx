"use client";

import { useState } from "react";
import { ImageIcon, Plus, Search } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { StylePresetFormDialog } from "@/components/styles/style-preset-form-dialog";
import { StylePresetListItem } from "@/components/styles/style-preset-list-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteStylePreset } from "@/hooks/mutations/use-delete-style-preset";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import { useIsPhone } from "@/hooks/use-is-phone";
import { usePopupStore } from "@/stores/popup";
import type { StylePreset } from "@/types/style-presets";

const STYLE_FILTERS = [
  { value: "all", label: "All", matches: () => true },
  { value: "system", label: "System", matches: (preset: StylePreset) => preset.isSystemTemplate },
  { value: "custom", label: "Custom", matches: (preset: StylePreset) => !preset.isSystemTemplate },
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number]["value"];

export const StylesPage = () => {
  const isPhone = useIsPhone();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StyleFilter>("all");
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

  // Search and filters are a phone's way through a long single column; a desktop grid shows it all at once.
  const activeFilter = STYLE_FILTERS.find((item) => item.value === filter) ?? STYLE_FILTERS[0];
  const needle = search.trim().toLowerCase();
  const shownPresets = isPhone
    ? (presets ?? []).filter((preset) => activeFilter.matches(preset) && `${preset.name} ${preset.description}`.toLowerCase().includes(needle))
    : (presets ?? []);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Styles</h1>
          <p className="text-muted-foreground mt-1 text-sm max-md:hidden">Browse system styles and manage styles you created.</p>
          {presets && (
            <p className="text-muted-foreground mt-0.5 text-sm tabular-nums md:hidden">
              {presets.length} {presets.length === 1 ? "style" : "styles"}
            </p>
          )}
        </div>
        <Button type="button" onClick={openCreate} disabled={isDeleting}>
          <Plus aria-hidden="true" />
          <span>
            New<span className="max-md:hidden"> style</span>
          </span>
        </Button>
      </div>
      {isPhone && presets && presets.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-3 left-3 size-4" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search styles" aria-label="Search styles" className="h-10 pl-9" />
          </div>
          <div className="flex gap-2" role="group" aria-label="Filter styles">
            {STYLE_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${filter === item.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground"}`}
              >
                {item.label}
                <span className="text-xs tabular-nums opacity-80">{presets.filter(item.matches).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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
      ) : shownPresets.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
          <p className="font-semibold text-slate-900">No styles match</p>
          <p className="text-muted-foreground text-sm">Try another search or filter.</p>
          <Button type="button" variant="link" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shownPresets.map((preset) => (
            <StylePresetListItem key={preset.id} preset={preset} busy={isDeleting} onEdit={openEdit} onDelete={askDelete} />
          ))}
        </div>
      )}
      <StylePresetFormDialog open={dialogOpen} preset={editingPreset} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
