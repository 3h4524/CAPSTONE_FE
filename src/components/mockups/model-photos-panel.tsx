"use client";

import { useState } from "react";
import { ChevronDown, Plus, Sparkles, UserRound } from "lucide-react";

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
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate, ModelPhotoFilter } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

/**
 * The model photos one can manage: a seller's own (beside the shared library, which they can only use), or the
 * shared library for an admin.
 */
export const ModelPhotosPanel = ({ scope }: { scope: ModelPhotoScope }) => {
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
  const photos = allPhotos && filterBySource(allPhotos, source);
  const { mutate: deletePhoto, isPending: isDeleting } = useDeleteModelPhoto(scope);
  const openPopup = usePopupStore((state) => state.openPopup);
  const canChange = (photo: MockupTemplate) =>
    scope === "admin" ? photo.isSystemTemplate : photo.isMine;

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
      title: `Delete ${photo.name}?`,
      description:
        "It is no longer offered for new images. Images already made on it stay as they are.",
      positiveLabel: "Delete",
      onPositive: () => deletePhoto(photo.id),
    });

  return (
    <div className="flex flex-col gap-4 max-md:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm max-md:hidden">
          {scope === "admin"
            ? "Photos of people every seller can put their mock-ups on. Use a person facing the camera in a plain white or light garment."
            : "Photos of people your mock-ups are put on, without AI: the garment takes the mock-up’s color and design. The shared photos are listed too."}
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
            Make with AI
          </Button>
          <Button type="button" className="max-md:px-2" onClick={openCreate} disabled={isDeleting}>
            <Plus aria-hidden="true" />
            New model photo
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={areFiltersOpen}
        onClick={() => setAreFiltersOpen((open) => !open)}
        className="flex min-h-11 items-center justify-between rounded-xl border border-ink-200 bg-card px-4 text-sm font-semibold text-ink-800 md:hidden"
      >
        {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
        <ChevronDown className={cn("size-4 text-ink-400 transition-transform", areFiltersOpen && "rotate-180")} aria-hidden="true" />
      </button>
      <div className={cn("flex flex-wrap gap-x-6 gap-y-3", !areFiltersOpen && "max-md:hidden")}>
        {scope === "seller" && <PhotoSourceFilter value={source} onChange={setSource} />}
        <ModelPhotoFilterBar value={filter} onChange={setFilter} />
      </div>
      {isPending ? (
        <SectionLoading label="Loading model photos" />
      ) : isError || !photos ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-ink-200 bg-card p-8 text-center"
          role="alert"
        >
          <UserRound className="size-8 text-ink-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink-900">Model photos unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">
              We could not load the model photos. Check your connection and try again.
            </p>
          </div>
          <Button type="button" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-ink-300 bg-card p-8 text-center">
          <p className="font-semibold text-ink-900">
            {filtered ? "No model photos of these people" : "No model photos yet"}
          </p>
          <p className="text-muted-foreground text-sm">
            {filtered
              ? "Make one with AI, or add a photo of your own."
              : "Add a photo of a person in a plain white tee to put your mock-ups on it, or make one with AI."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => setGenerating(true)}>
              <Sparkles aria-hidden="true" />
              Make with AI
            </Button>
            <Button type="button" onClick={openCreate}>
              New model photo
            </Button>
          </div>
        </div>
      ) : (
        <MockupCardGrid
          key={JSON.stringify({ filter, source })}
          items={photos}
          pagerLabel="Model photo pages"
          className={cn(scope === "seller" && "xl:grid-cols-4")}
          renderItem={(photo) => (
            <MockupTemplateListItem
              key={photo.id}
              template={photo}
              busy={isDeleting}
              editable={canChange(photo)}
              onEdit={openEdit}
              onDelete={askDelete}
            />
          )}
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
        />
      )}
    </div>
  );
};
