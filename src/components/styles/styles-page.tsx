"use client";

import { useState } from "react";
import { ImageIcon, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { PageHeader } from "@/components/commons/layout/page-header";
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

const PHONE_PAGE_SIZE = 5;

const STYLE_FILTERS = [
  { value: "all", labelKey: "styles.filters.all", matches: () => true },
  { value: "system", labelKey: "styles.filters.system", matches: (preset: StylePreset) => preset.isSystemTemplate },
  { value: "custom", labelKey: "styles.filters.custom", matches: (preset: StylePreset) => !preset.isSystemTemplate },
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number]["value"];

export const StylesPage = () => {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StyleFilter>("all");
  const [page, setPage] = useState(1);
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
      title: t("styles.deleteTitle", { name: preset.name }),
      description: t("styles.deleteDescription"),
      positiveLabel: t("styles.delete"),
      onPositive: () => deletePreset(preset.id),
    });
  };

  // Search and filters are a phone's way through a long single column; a desktop grid shows it all at once.
  const activeFilter = STYLE_FILTERS.find((item) => item.value === filter) ?? STYLE_FILTERS[0];
  const needle = search.trim().toLowerCase();
  const shownPresets = isPhone
    ? (presets ?? []).filter((preset) => activeFilter.matches(preset) && `${preset.name} ${preset.description}`.toLowerCase().includes(needle))
    : (presets ?? []);
  const pageCount = isPhone ? Math.max(1, Math.ceil(shownPresets.length / PHONE_PAGE_SIZE)) : 1;
  // Deleting the last style of the last page would otherwise leave an empty page.
  const currentPage = Math.min(page, pageCount);
  const pagePresets = isPhone ? shownPresets.slice((currentPage - 1) * PHONE_PAGE_SIZE, currentPage * PHONE_PAGE_SIZE) : shownPresets;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-1">
        <PageHeader
          title={t("styles.pageTitle")}
          description={t("styles.pageDescription")}
          actions={
            <Button type="button" size="page-action" onClick={openCreate} disabled={isDeleting}>
              <Plus aria-hidden="true" />
              <span>
                {t("styles.newShort")}<span className="max-md:hidden">{t("styles.styleSuffix")}</span>
              </span>
            </Button>
          }
        />
        {presets && (
          <p className="text-muted-foreground text-sm tabular-nums md:hidden">
            {t("styles.styleCount", { count: presets.length })}
          </p>
        )}
      </div>
      {isPhone && presets && presets.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-3 left-3 size-4" aria-hidden="true" />
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("styles.searchStyles")} aria-label={t("styles.searchStyles")} className="h-10 pl-9" />
          </div>
          <div className="flex gap-2" role="group" aria-label={t("styles.filterStyles")}>
            {STYLE_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => { setFilter(item.value); setPage(1); }}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${filter === item.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground"}`}
              >
                {t(item.labelKey)}
                <span className="text-xs tabular-nums opacity-80">{presets.filter(item.matches).length}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {isLoadingPresets ? (
        <SectionLoading label={t("styles.loadingArtStyles")} />
      ) : isPresetsError || !presets ? (
        <div className="border-ink-200 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center" role="alert">
          <ImageIcon className="text-ink-400 size-8" aria-hidden="true" />
          <div>
            <p className="text-ink-900 font-semibold">{t("styles.loadErrorTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("styles.loadErrorDescription")}</p>
          </div>
          <Button type="button" onClick={() => refetchPresets()}>{t("styles.tryAgain")}</Button>
        </div>
      ) : presets.length === 0 ? (
        <div className="border-ink-300 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-ink-900 font-semibold">{t("styles.emptyTitle")}</p>
          <p className="text-muted-foreground text-sm">{t("styles.emptyDescription")}</p>
          <Button type="button" onClick={openCreate}>{t("styles.newStyle")}</Button>
        </div>
      ) : shownPresets.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
          <p className="text-ink-900 font-semibold">{t("styles.noMatchTitle")}</p>
          <p className="text-muted-foreground text-sm">{t("styles.noMatchDescription")}</p>
          <Button type="button" variant="link" size="sm" onClick={() => { setSearch(""); setFilter("all"); setPage(1); }}>
            {t("styles.clearFilters")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagePresets.map((preset) => (
            <StylePresetListItem key={preset.id} preset={preset} busy={isDeleting} onEdit={openEdit} onDelete={askDelete} />
          ))}
        </div>
      )}
      {isPhone && <PhonePager page={currentPage} pageCount={pageCount} onPageChange={setPage} label={t("styles.stylePages")} />}
      <StylePresetFormDialog open={dialogOpen} preset={editingPreset} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
