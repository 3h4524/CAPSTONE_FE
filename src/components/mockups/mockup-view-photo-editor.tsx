"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { type MockupTemplateScope, previewGarmentMask } from "@/api/mockup-templates";
import { MockupPhotoDropzone } from "@/components/mockups/mockup-photo-dropzone";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { PrintAreaList } from "@/components/mockups/print-area-list";
import { Button } from "@/components/ui/button";
import {
  areaLabel,
  MAIN_AREA_KEY,
  mockupViewLabel,
  parsePrintLayout,
} from "@/helpers/mockup-template";
import type {
  GarmentMaskPreview,
  MockupArea,
  MockupTemplate,
  MockupView,
} from "@/types/mockup-templates";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type Size = { width: number; height: number };

/** One side of a template as it is being edited: its photo and print areas. */
export type ViewDraft = {
  view: MockupView;
  /** The template saved for this side, or null for one not saved yet. */
  templateId: string | null;
  /** A photo picked now, replacing the saved one. */
  file: File | null;
  savedUrl: string | null;
  savedSize: Size | null;
  savedMaskUrl: string | null;
  realisticPrintReady: boolean;
  areas: MockupArea[];
  /** The photo size the areas' numbers are in; null until a photo has been measured. */
  areasBasis: Size | null;
  /** A saved side being taken off. */
  removed: boolean;
};

export const defaultMainArea = (): MockupArea => ({
  key: MAIN_AREA_KEY,
  name: null,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  source: "same",
});

/** A side as saved, or an empty one. */
export const viewDraftOf = (view: MockupView, template: MockupTemplate | null): ViewDraft => ({
  view,
  templateId: template?.id ?? null,
  file: null,
  savedUrl: template?.baseImageUrl ?? null,
  savedSize: template ? { width: template.outputWidthPx, height: template.outputHeightPx } : null,
  savedMaskUrl: template?.garmentMaskUrl ?? null,
  realisticPrintReady: template?.realisticPrintReady ?? false,
  areas: (template && parsePrintLayout(template.printAreaConfig)?.areas) || [defaultMainArea()],
  areasBasis: template ? { width: template.outputWidthPx, height: template.outputHeightPx } : null,
  removed: false,
});

/** Whether the side has a photo, saved or picked now. */
export const hasPhoto = (draft: ViewDraft) =>
  !draft.removed && (draft.file !== null || draft.savedUrl !== null);

type MockupViewPhotoEditorProps = {
  draft: ViewDraft;
  update: (change: (draft: ViewDraft) => ViewDraft) => void;
  /** Whether the server may analyze photos (the dialog is open and the plan allows custom templates). */
  analyze: boolean;
  disabled?: boolean;
  allowRecolor: boolean;
  garmentColor: string | null;
  /** Called with the photo size now shown, or null while there is none. */
  onPhotoSize?: (size: Size | null) => void;
  /** Takes the side's photo off; none for the front, which every template has. */
  onRemove?: () => void;
  /** Shown under the photo: the strip that switches between the sides. */
  sides: ReactNode;
  /** Shown at the top of the settings column, above the print areas. */
  settingsTop: ReactNode;
  /** Shown at the bottom of the settings column, below the print areas. */
  settingsBottom: ReactNode;
  /** Whose endpoints analyze the photo: the seller's or the admin's. */
  scope?: MockupTemplateScope;
  /** The photo and print areas are fixed (a Printify template's are Printify's): shown, not changed. */
  photoLocked?: boolean;
};

// One side of a template, laid out side by side: its photo, large, with the print areas drawn on it and the sides
// strip under it; and the settings beside it. A newly picked photo is analyzed on the server right away: its garment
// mask gives the box to center print areas in, and previews a recolor before saving.
export const MockupViewPhotoEditor = ({
  draft,
  update,
  analyze,
  disabled = false,
  allowRecolor,
  garmentColor,
  onPhotoSize,
  onRemove,
  sides,
  settingsTop,
  settingsBottom,
  scope = "seller",
  photoLocked = false,
}: MockupViewPhotoEditorProps) => {
  const replaceInputId = useId();
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [pickedSize, setPickedSize] = useState<Size | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [maskPreview, setMaskPreview] = useState<GarmentMaskPreview | null>(null);
  const [maskPreviewPending, setMaskPreviewPending] = useState(false);
  const [activeKey, setActiveKey] = useState(MAIN_AREA_KEY);
  const file = draft.removed ? null : draft.file;
  const savedUrl = draft.removed ? null : draft.savedUrl;

  useEffect(() => {
    setPickedSize(null);
    if (!file) {
      setPhotoObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPhotoObjectUrl(objectUrl);
    let cancelled = false;
    void createImageBitmap(file)
      .then((bitmap) => {
        if (!cancelled) setPickedSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const savedMaskUrl = !file ? draft.savedMaskUrl : null;
  const needsPreview = analyze && (file !== null || savedUrl !== null) && !savedMaskUrl;

  useEffect(() => {
    setMaskPreview(null);
    if (!needsPreview) {
      setMaskPreviewPending(false);
      return;
    }
    const controller = new AbortController();
    setMaskPreviewPending(true);
    void (async () => {
      try {
        let photo = file;
        if (!photo) {
          const blob = await (
            await fetch(savedUrl as string, { signal: controller.signal })
          ).blob();
          photo = new File([blob], "base-photo", { type: blob.type });
        }
        const preview = await previewGarmentMask(photo, controller.signal, scope);
        if (!controller.signal.aborted) setMaskPreview(preview);
      } catch {
        // No preview is not an error here: saving still analyzes the photo and reports problems.
      } finally {
        if (!controller.signal.aborted) setMaskPreviewPending(false);
      }
    })();
    return () => controller.abort();
  }, [needsPreview, file, savedUrl, scope]);

  const shownPhoto = photoObjectUrl ?? savedUrl;
  const shownSize = file ? pickedSize : savedUrl ? draft.savedSize : null;
  const shownWidth = shownSize?.width ?? 0;
  const shownHeight = shownSize?.height ?? 0;

  useEffect(() => {
    onPhotoSize?.(shownWidth && shownHeight ? { width: shownWidth, height: shownHeight } : null);
  }, [shownWidth, shownHeight, onPhotoSize]);

  // A photo of another size keeps every print area on the same part of the picture; the first photo of a side gets a
  // centered box to start from.
  useEffect(() => {
    if (!shownWidth || !shownHeight) return;
    update((current) => {
      const basis = current.areasBasis;
      if (basis && basis.width === shownWidth && basis.height === shownHeight) return current;
      const fit = (area: MockupArea, kx: number, ky: number): MockupArea => {
        const width = Math.max(1, Math.min(shownWidth, Math.round(area.width * kx)));
        const height = Math.max(1, Math.min(shownHeight, Math.round(area.height * ky)));
        return {
          ...area,
          x: Math.max(0, Math.min(shownWidth - width, Math.round(area.x * kx))),
          y: Math.max(0, Math.min(shownHeight - height, Math.round(area.y * ky))),
          width,
          height,
        };
      };
      const side = Math.round(Math.min(shownWidth, shownHeight) * 0.35);
      const areas = basis
        ? current.areas.map((area) =>
            fit(area, shownWidth / basis.width, shownHeight / basis.height)
          )
        : [
            {
              ...current.areas[0],
              x: Math.round((shownWidth - side) / 2),
              y: Math.round((shownHeight - side) / 2),
              width: side,
              height: side,
            },
            ...current.areas.slice(1),
          ];
      return { ...current, areas, areasBasis: { width: shownWidth, height: shownHeight } };
    });
  }, [shownWidth, shownHeight, update]);

  const maskUrl = maskPreview?.maskDataUrl ?? savedMaskUrl;
  const recolorProblem = maskPreview && !maskPreview.recolorable ? maskPreview.reason : null;
  const tint =
    allowRecolor && garmentColor && maskUrl ? { color: garmentColor, maskUrl } : undefined;
  const activeIndex = Math.max(
    0,
    draft.areas.findIndex((area) => area.key === activeKey)
  );
  const active = draft.areas[activeIndex] ?? draft.areas[0];
  const setAreas = (areas: MockupArea[]) => update((current) => ({ ...current, areas }));
  const setActiveArea = (patch: Partial<MockupArea>) =>
    update((current) => ({
      ...current,
      areas: current.areas.map((area) => (area.key === active.key ? { ...area, ...patch } : area)),
    }));

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setFileError("Choose an image file for the photo.");
      return;
    }
    if (picked.size > MAX_PHOTO_BYTES) {
      setFileError("The photo cannot exceed 10 MB.");
      return;
    }
    setFileError(null);
    update((current) => ({ ...current, file: picked, removed: false }));
  };

  const label = mockupViewLabel(draft.view);

  return (
    <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
      {/* The photo, as large as the dialog allows, with the sides under it. */}
      <section
        aria-label={`${label} photo`}
        className="bg-ink-50 flex min-h-0 flex-col gap-3 px-4 py-4 outline-none md:overflow-y-auto"
      >
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-ink-900 text-sm font-semibold">{label}</p>
            {maskPreviewPending && (
              <p className="text-muted-foreground text-xs">
                Finding the garment in the photo… this takes a few seconds.
              </p>
            )}
          </div>
          {shownPhoto && !photoLocked && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor={replaceInputId}
                className="bg-card text-ink-700 hover:bg-ink-50 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-xs aria-disabled:pointer-events-none aria-disabled:opacity-50"
                aria-disabled={disabled}
              >
                <ImagePlus className="size-3.5" aria-hidden="true" />
                Replace photo
                <input
                  id={replaceInputId}
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  className="sr-only"
                  onChange={(event) => {
                    pickFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {onRemove && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-card h-8 gap-1.5 px-2.5 text-xs text-red-600 hover:text-red-700"
                  disabled={disabled}
                  onClick={onRemove}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove side
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center">
          {shownPhoto && active ? (
            <div className="my-auto max-w-full">
              <PrintAreaEditor
                key={`${shownPhoto}:${shownWidth}x${shownHeight}`}
                imageUrl={shownPhoto}
                imageClassName="max-h-[max(10rem,calc(min(88dvh,780px)-21rem))]"
                value={active}
                onChange={(next) =>
                  setActiveArea({ x: next.x, y: next.y, width: next.width, height: next.height })
                }
                rotation={active.rotation}
                onRotationChange={(rotation) => setActiveArea({ rotation })}
                label={areaLabel(active, activeIndex)}
                otherAreas={draft.areas
                  .map((area, index) => ({
                    key: area.key,
                    label: areaLabel(area, index),
                    area,
                    rotation: area.rotation,
                  }))
                  .filter((area) => area.key !== active.key)}
                onSelectArea={setActiveKey}
                disabled={disabled || photoLocked}
                garmentTint={tint}
                pixelSize={shownSize ?? undefined}
                garmentMaskUrl={maskUrl ?? undefined}
              />
            </div>
          ) : (
            <div className="my-auto w-full max-w-md space-y-2">
              <MockupPhotoDropzone
                label={
                  draft.view === "front"
                    ? "Photo of the front"
                    : `Photo of the ${label.toLowerCase()}`
                }
                previewUrl={null}
                error={fileError}
                disabled={disabled || photoLocked}
                onSelect={pickFile}
                onRemove={() => undefined}
              />
              <p className="text-muted-foreground text-xs">
                {photoLocked
                  ? "The sides of a Printify template are Printify's own photos. Add this one from the template's Printify settings."
                  : draft.view === "front"
                  ? "A real product photo, garment on a plain background. Images up to 10 MB."
                  : `Add a photo of the ${label.toLowerCase()} to print on it too: every design gets a mock-up of this side.`}
              </p>
            </div>
          )}
          {shownPhoto && fileError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {fileError}
            </p>
          )}
        </div>

        <div className="flex justify-center">{sides}</div>
      </section>

      {/* Settings beside the photo. */}
      <aside className="space-y-4 border-t px-5 py-4 md:overflow-y-auto md:border-t-0 md:border-l">
        {settingsTop}
        {shownPhoto && active ? (
          <PrintAreaList
            mode="template"
            areas={draft.areas}
            activeKey={active.key}
            onSelect={setActiveKey}
            onChange={setAreas}
            disabled={disabled || photoLocked}
          />
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            Print areas for the {label.toLowerCase()} appear once it has a photo.
          </p>
        )}
        {allowRecolor && recolorProblem && (
          <p role="alert" className="text-sm text-red-600">
            The {label.toLowerCase()} photo can’t be recolored: {recolorProblem} Use a white or
            light-gray garment on a plain background.
          </p>
        )}
        {settingsBottom}
      </aside>
    </div>
  );
};
