"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Sparkles, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ModelPhotoScope } from "@/api/model-photos";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GenerateModelPhotoDialog } from "@/components/mockups/generate-model-photo-dialog";
import { MockupCardGrid } from "@/components/mockups/mockup-card-grid";
import { MockupTemplateListItem } from "@/components/mockups/mockup-template-list-item";
import {
  filterBySource,
  ModelPhotoFilterBar,
  type PhotoSource,
  PhotoSourceFilter,
} from "@/components/mockups/model-attributes-fields";
import { ModelPhotoFormDialog } from "@/components/mockups/model-photo-form-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteModelPhoto } from "@/hooks/mutations/use-model-photo-mutations";
import { useModelPhotos } from "@/hooks/queries/use-model-photos";
import { usePrintWithoutAi } from "@/hooks/queries/use-print-without-ai";
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate, ModelPhotoFilter } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

/**
 * The model photos one can manage: a seller's own (beside the shared library, which they can only use), or the
 * shared library for an admin.
 */
export const ModelPhotosPanel = ({ scope }: { scope: ModelPhotoScope }) => {
  const { t } = useTranslation("common");
  const printWithoutAi = usePrintWithoutAi(scope);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MockupTemplate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<ModelPhotoFilter>({});
  // Whose photos to show; only a seller has both the shared and their own.
  const [source, setSource] = useState<PhotoSource | null>(null);
  const filtered = Object.keys(filter).length > 0 || source !== null;
  const activeFilterCount = Object.keys(filter).length + (source === null ? 0 : 1);
  // The chips fill a phone's screen, so they open on request.
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const {
    data: allPhotos,
    isPending,
    isError,
    refetch,
  } = useModelPhotos(scope, undefined, true, filter);
  // The photo just made comes first, whatever the name order or the filters, so it can be told from the others. It may
  // not be in the list yet while the list is being read again.
  const [justMade, setJustMade] = useState<MockupTemplate | null>(null);
  const justMadeId = justMade?.id ?? null;
  const justMadeCard = useRef<HTMLDivElement>(null);
  const listed = allPhotos && filterBySource(allPhotos, source);
  const newest = justMade && (allPhotos?.find((photo) => photo.id === justMade.id) ?? justMade);
  const photos = listed && newest ? [newest, ...listed.filter((photo) => photo.id !== newest.id)] : listed;
  const { mutate: deletePhoto, isPending: isDeleting } = useDeleteModelPhoto(scope);
  const openPopup = usePopupStore((state) => state.openPopup);
  const canChange = (photo: MockupTemplate) =>
    scope === "admin" ? photo.isSystemTemplate : photo.isMine;

  useEffect(() => {
    if (!justMadeId) return;
    // Once the dialog has closed and handed the focus back, which would scroll away from the card.
    const timer = window.setTimeout(() => {
      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      justMadeCard.current?.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "center" });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [justMadeId]);

  const changeFilter = (next: ModelPhotoFilter) => {
    setJustMade(null);
    setFilter(next);
  };

  const changeSource = (next: PhotoSource | null) => {
    setJustMade(null);
    setSource(next);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (photo: MockupTemplate) => {
    setEditing(photo);
    setDialogOpen(true);
  };

  const askDelete = (photo: MockupTemplate) =>
    openPopup({
      title: t("mockups.modelPhotosPanel.deleteTitle", { name: photo.name }),
      description: t("mockups.modelPhotosPanel.deleteDescription"),
      positiveLabel: t("mockups.delete"),
      onPositive: () => {
        if (photo.id === justMadeId) setJustMade(null);
        deletePhoto(photo.id);
      },
    });

  return (
    <div className="flex flex-col gap-4 max-md:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm max-md:hidden">
          {scope === "admin"
            ? t("mockups.modelPhotosPanel.adminIntro")
            : t(printWithoutAi ? "mockups.modelPhotosPanel.sellerIntro" : "mockups.modelPhotosPanel.sellerIntroAi")}
        </p>
        <div className="flex flex-wrap gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="max-md:px-2"
            onClick={() => setGenerating(true)}
            disabled={isDeleting}
          >
            <Sparkles aria-hidden="true" />
            {t("mockups.modelPhotosPanel.makeWithAi")}
          </Button>
          <Button type="button" className="max-md:px-2" onClick={openCreate} disabled={isDeleting}>
            <Plus aria-hidden="true" />
            {t("mockups.modelPhotosPanel.newModelPhoto")}
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={areFiltersOpen}
        onClick={() => setAreFiltersOpen((open) => !open)}
        className="border-ink-200 bg-card text-ink-800 flex min-h-11 items-center justify-between rounded-xl border px-4 text-sm font-semibold md:hidden"
      >
        {activeFilterCount > 0 ? t("mockups.modelPhotosPanel.filtersCount", { count: activeFilterCount }) : t("mockups.modelPhotosPanel.filtersButton")}
        <ChevronDown className={cn("text-ink-400 size-4 transition-transform", areFiltersOpen && "rotate-180")} aria-hidden="true" />
      </button>
      <div className={cn("flex flex-wrap gap-x-6 gap-y-3", !areFiltersOpen && "max-md:hidden")}>
        {scope === "seller" && <PhotoSourceFilter value={source} onChange={changeSource} />}
        <ModelPhotoFilterBar value={filter} onChange={changeFilter} />
      </div>
      {isPending ? (
        <SectionLoading label={t("mockups.modelPhotosPanel.loadingPhotos")} />
      ) : isError || !photos ? (
        <div
          className="border-ink-200 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center"
          role="alert"
        >
          <UserRound className="text-ink-400 size-8" aria-hidden="true" />
          <div>
            <p className="text-ink-900 font-semibold">{t("mockups.modelPhotosPanel.unavailableTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("mockups.modelPhotosPanel.unavailableDescription")}
            </p>
          </div>
          <Button type="button" onClick={() => refetch()}>
            {t("mockups.modelPhotosPanel.tryAgain")}
          </Button>
        </div>
      ) : photos.length === 0 ? (
        <div className="border-ink-300 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-ink-900 font-semibold">
            {filtered ? t("mockups.modelPhotosPanel.noFilteredTitle") : t("mockups.modelPhotosPanel.noPhotosTitle")}
          </p>
          <p className="text-muted-foreground text-sm">
            {filtered
              ? t("mockups.modelPhotosPanel.noFilteredDescription")
              : t("mockups.modelPhotosPanel.noPhotosDescription")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => setGenerating(true)}>
              <Sparkles aria-hidden="true" />
              {t("mockups.modelPhotosPanel.makeWithAi")}
            </Button>
            <Button type="button" onClick={openCreate}>
              {t("mockups.modelPhotosPanel.newModelPhoto")}
            </Button>
          </div>
        </div>
      ) : (
        <MockupCardGrid
          key={JSON.stringify({ filter, source, justMadeId })}
          items={photos}
          pagerLabel={t("mockups.cardGrid.modelPhotosLabel")}
          className={cn(scope === "seller" && "xl:grid-cols-4")}
          renderItem={(photo) => {
            const card = (
              <MockupTemplateListItem
                key={photo.id}
                template={photo}
                busy={isDeleting}
                editable={canChange(photo)}
                onEdit={openEdit}
                onDelete={askDelete}
              />
            );
            if (photo.id !== justMadeId) return card;
            return (
              <div
                key={photo.id}
                ref={justMadeCard}
                className="ring-primary ring-offset-background relative grid rounded-xl ring-2 ring-offset-2"
              >
                <span className="bg-primary text-primary-foreground absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-sm">
                  {t("mockups.modelPhotosPanel.justMade")}
                </span>
                {card}
              </div>
            );
          }}
        />
      )}
      <ModelPhotoFormDialog
        open={dialogOpen}
        photo={editing}
        scope={scope}
        onClose={() => setDialogOpen(false)}
      />
      {generating && (
        <GenerateModelPhotoDialog
          open
          scope={scope}
          initial={filter}
          onClose={() => setGenerating(false)}
          onGenerated={setJustMade}
        />
      )}
    </div>
  );
};
