"use client";
import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, SlidersHorizontal, Sparkles } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { HorizontalStrip } from "@/components/commons/data-display/horizontal-strip";
import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import {
  filterBySource,
  ModelPhotoFilterBar,
  type PhotoSource,
  PhotoSourceFilter,
  PhotoSourceTag,
} from "@/components/mockups/model-attributes-fields";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/helpers/error-message";
import { modelAttributesLabel } from "@/helpers/model-attributes";
import { hasFeature } from "@/helpers/plan-features";
import { showToast } from "@/helpers/toast";
import { useGenerateLifestyleMockup } from "@/hooks/mutations/use-generate-lifestyle-mockup";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useModelPhotos } from "@/hooks/queries/use-model-photos";
import type { LifestyleMockupFormValues } from "@/schemas/video-workflow";
import { lifestyleMockupSchema, MAX_LIFESTYLE_MOCKUPS } from "@/schemas/video-workflow";
import type { ModelPhotoFilter } from "@/types/mockup-templates";
import type { MockupAsset } from "@/types/video-workflow";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

// Lifestyle images made at the same time: as many Ideogram images as design generation runs at once (Ideogram
// allows 10 in flight per key; two are left spare).
const LIFESTYLE_PARALLEL_REQUESTS = 8;

/** A mock-up the person in the photo can be dressed in. */
export interface LifestyleGarment {
  id: string;
  productId: string;
  label: string;
  /** The mock-up's picture, shown with its name so it is recognized at a glance. */
  imageUrl: string | null;
}

/** The product mock-ups of a video's product, Hero first: a lifestyle image already shows a person, so it is left out. */
export const lifestyleGarmentsOf = (assets: MockupAsset[]): LifestyleGarment[] =>
  assets
    .filter((asset) => asset.role !== "Lifestyle")
    .sort((left, right) => Number(right.role === "Hero") - Number(left.role === "Hero"))
    .map((asset) => ({
      id: asset.id,
      productId: asset.productId,
      label: `${asset.role} · ${asset.variantKey ?? asset.id.slice(0, 8)}`,
      imageUrl: asset.previewUrl,
    }));

// The mock-ups to choose from as pictures large enough to tell apart, each with its name; the chosen ones are
// outlined and ticked. A long list scrolls; its rows keep their height (the cards clip their content, so the
// grid would otherwise squeeze every row to fit the box).
const GarmentPicker = ({
  garments,
  value,
  onChange,
  disabled,
}: {
  garments: LifestyleGarment[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) => (
  <div
    role="group"
    aria-label="Product mockups to wear"
    className="grid max-h-[65vh] auto-rows-max grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-3 md:grid-cols-4"
  >
    {garments.map((garment) => {
      const chosen = value.includes(garment.id);
      // Kept in the list's order, so the images are made in the order shown.
      const toggle = () =>
        onChange(
          chosen
            ? value.filter((id) => id !== garment.id)
            : garments.filter((g) => g.id === garment.id || value.includes(g.id)).map((g) => g.id)
        );
      return (
        <button
          key={garment.id}
          type="button"
          role="checkbox"
          aria-checked={chosen}
          disabled={disabled || (!chosen && value.length >= MAX_LIFESTYLE_MOCKUPS)}
          title={garment.label}
          onClick={toggle}
          className={cn(
            "relative overflow-hidden rounded-md border bg-card text-left transition-shadow disabled:opacity-60",
            chosen ? "border-primary ring-primary/25 ring-2" : "hover:border-ink-400"
          )}
        >
          {garment.imageUrl ? (
            <Image
              src={garment.imageUrl}
              alt=""
              width={240}
              height={240}
              unoptimized
              className="aspect-square w-full bg-ink-50 object-contain"
            />
          ) : (
            <span className="flex aspect-square w-full items-center justify-center bg-ink-50 text-xs text-ink-500">
              No picture
            </span>
          )}
          <span className="block truncate px-1.5 py-1 text-[11px] text-ink-700">
            {garment.label}
          </span>
          {chosen && (
            <span className="bg-primary absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-primary-foreground">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// The chosen mock-ups, shown small: the same mock-ups are listed just above in the results, so the full choice
// opens in a dialog instead of repeating them here.
const GarmentChooser = ({
  garments,
  value,
  onChange,
  disabled,
  id,
}: {
  garments: LifestyleGarment[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  id?: string;
}) => {
  const [choosing, setChoosing] = useState(false);
  const chosen = garments.filter((garment) => value.includes(garment.id));
  const shown = chosen.slice(0, 4);
  return (
    <>
      <div id={id} className="flex items-center gap-3 rounded-md border bg-card p-2">
        {shown.length === 0 ? (
          <span className="flex size-20 shrink-0 items-center justify-center rounded border border-dashed bg-ink-50 text-[11px] text-ink-500">
            None
          </span>
        ) : (
          <span className="flex shrink-0 gap-1.5">
            {shown.map((garment) =>
              garment.imageUrl ? (
                <Image
                  key={garment.id}
                  src={garment.imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className={cn(
                    "shrink-0 rounded border bg-ink-50 object-contain",
                    shown.length === 1 ? "size-20" : "size-14"
                  )}
                />
              ) : (
                <span
                  key={garment.id}
                  className="flex size-14 shrink-0 items-center justify-center rounded border bg-ink-50 text-[10px] text-ink-500"
                >
                  No picture
                </span>
              )
            )}
          </span>
        )}
        <span className="line-clamp-2 min-w-0 flex-1 text-sm text-ink-800">
          {chosen.length === 0
            ? "Choose a mockup"
            : chosen.length === 1
              ? chosen[0].label
              : `${chosen.length} mockups${chosen.length > shown.length ? ` (+${chosen.length - shown.length} more)` : ""}`}
        </span>
        {garments.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 hover:translate-y-0"
            disabled={disabled}
            onClick={() => setChoosing(true)}
          >
            Change
          </Button>
        )}
      </div>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose the mockups to wear</DialogTitle>
            <DialogDescription>
              One lifestyle image is made for each mockup ticked, up to {MAX_LIFESTYLE_MOCKUPS}: the
              model wears its garment, color and print.
            </DialogDescription>
          </DialogHeader>
          <GarmentPicker
            garments={garments}
            value={value}
            disabled={disabled}
            onChange={onChange}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">{value.length} selected</span>
            <Button
              type="button"
              size="sm"
              className="hover:translate-y-0"
              onClick={() => setChoosing(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SOURCE_OPTIONS: { value: "upload" | "library"; label: string; hint: string }[] = [
  { value: "upload", label: "Upload a photo", hint: "Your own photo of people" },
  { value: "library", label: "From model photos", hint: "Ready-made people, no upload" },
];

// One numbered step of the form: what to do, then the controls for it.
const Step = ({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="space-y-2.5">
    <div className="flex items-start gap-2.5">
      <span className="bg-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-primary-foreground">
        {number}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {hint && <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>}
      </div>
    </div>
    <div className="pl-7.5">{children}</div>
  </section>
);

// The photo to upload as a drop area; once chosen, it is shown with a way to change it.
const UploadPhoto = ({
  value,
  onChange,
  disabled,
}: {
  value: File | undefined;
  onChange: (file: File | undefined) => void;
  disabled: boolean;
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  return (
    <label
      className={cn(
        // Relative, so the hidden input sits inside it: focusing it never scrolls the panel away.
        "relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ink-300 bg-ink-50 p-3 transition-colors hover:border-ink-400",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <input
        type="file"
        aria-label="Photo of a model"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {preview ? (
        <Image
          src={preview}
          alt=""
          width={64}
          height={80}
          unoptimized
          className="h-20 w-16 shrink-0 rounded border bg-card object-cover"
        />
      ) : (
        <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded border bg-card text-ink-400">
          <ImagePlus className="size-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1 text-xs leading-relaxed">
        <span className="block truncate font-medium text-ink-800">
          {value ? value.name : "Choose a photo"}
        </span>
        <span className="text-muted-foreground block">
          {value
            ? "Click to choose another."
            : "JPEG, PNG or WebP, up to 8 MB. A sharper photo gives a sharper image."}
        </span>
      </span>
    </label>
  );
};

// The model photos to dress (the shared ones and the Seller's own), narrowed to the people wanted; one is chosen.
const LibraryModelPicker = ({
  value,
  onChange,
  disabled,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
  disabled: boolean;
}) => {
  const [filter, setFilter] = useState<ModelPhotoFilter>({});
  const [source, setSource] = useState<PhotoSource | null>(null);
  const { data: allPhotos, isPending, isError } = useModelPhotos("seller", undefined, true, filter);
  const photos = allPhotos && filterBySource(allPhotos, source);
  // The filters are folded away: most people just pick a photo.
  const [filtering, setFiltering] = useState(false);
  const active = Object.values(filter).filter(Boolean).length + (source ? 1 : 0);
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {photos ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : ""}
        </span>
        <Button
          type="button"
          variant={filtering || active > 0 ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs hover:translate-y-0"
          aria-expanded={filtering}
          onClick={() => setFiltering((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {active > 0 ? `Filters (${active})` : "Filters"}
        </Button>
      </div>
      {filtering && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-md border bg-ink-50 p-2.5">
          <PhotoSourceFilter value={source} onChange={setSource} disabled={disabled} />
          <ModelPhotoFilterBar value={filter} onChange={setFilter} disabled={disabled} />
        </div>
      )}
      {isPending ? (
        <p className="text-muted-foreground text-xs">Loading model photos…</p>
      ) : isError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Model photos could not be loaded.
        </p>
      ) : (photos ?? []).length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No model photos match. Change the filters, or add or make one under Mock-up templates →
          Model photos.
        </p>
      ) : (
        <HorizontalStrip
          role="radiogroup"
          aria-label="Model photo to dress"
          itemsLabel="model photos"
          itemCount={(photos ?? []).length}
        >
          {(photos ?? []).map((photo) => {
            const chosen = photo.id === value;
            return (
              <button
                key={photo.id}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={disabled}
                title={photo.name}
                onClick={() => onChange(photo.id)}
                className={cn(
                  "relative w-36 shrink-0 snap-start overflow-hidden rounded-md border bg-ink-50 text-left transition-shadow disabled:opacity-60",
                  chosen ? "border-primary ring-primary/25 ring-2" : "hover:border-ink-400"
                )}
              >
                <Image
                  src={photo.baseImageUrl}
                  alt={photo.name}
                  width={160}
                  height={200}
                  unoptimized
                  className="aspect-4/5 w-full object-cover"
                />
                <PhotoSourceTag system={photo.isSystemTemplate} className="absolute top-1 left-1" />
                <span className="block truncate px-1.5 py-1 text-[11px] text-ink-700">
                  {modelAttributesLabel(photo.attributes) ?? photo.name}
                </span>
                {chosen && (
                  <span className="bg-primary absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-primary-foreground">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </HorizontalStrip>
      )}
    </div>
  );
};

/**
 * Dresses the people in a photo (uploaded, or one of the model photos) in each of the chosen mock-ups, with Ideogram:
 * one image per mock-up. With `showResults`, the lifestyle images already made for the chosen mock-ups' products are
 * shown under the form.
 */
export const LifestyleMockupForm = ({
  garments,
  showResults = false,
}: {
  garments: LifestyleGarment[];
  showResults?: boolean;
}) => {
  const form = useForm<LifestyleMockupFormValues>({
    resolver: zodResolver(lifestyleMockupSchema),
    values: {
      garmentMockupIds: garments[0] ? [garments[0].id] : [],
      source: "upload",
      file: undefined,
      modelPhotoId: undefined,
      rightsConfirmed: false,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const { mutateAsync: generate } = useGenerateLifestyleMockup();
  // How far a run has got: images finished out of those asked for; null when none is running.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const isPending = progress !== null;
  const chosenIds = useWatch({ control: form.control, name: "garmentMockupIds" }) ?? [];
  const source = useWatch({ control: form.control, name: "source" });
  const chosen = garments.filter((garment) => chosenIds.includes(garment.id));
  const productIds = [...new Set(chosen.map((garment) => garment.productId))];
  const { data: entitlements } = useEntitlements();
  // Lifestyle mockups are a Pro feature; the backend refuses them on other plans.
  const locked = entitlements !== undefined && !hasFeature(entitlements, "lifestyle_mockup");
  if (garments.length === 0) return null;

  // One request per mock-up, up to LIFESTYLE_PARALLEL_REQUESTS at once (as many Ideogram images as design generation
  // runs at a time); each one that finishes starts the next. A failure is reported and the rest still go ahead.
  const generateAll = async ({
    garmentMockupIds,
    source: from,
    file,
    modelPhotoId,
  }: LifestyleMockupFormValues) => {
    const person = from === "library" ? { modelPhotoId } : { file };
    const wanted = garments.filter((garment) => garmentMockupIds.includes(garment.id));
    const failures: string[] = [];
    let next = 0;
    let done = 0;
    setProgress({ done: 0, total: wanted.length });
    const worker = async () => {
      while (next < wanted.length) {
        const garment = wanted[next++];
        try {
          await generate(
            { productId: garment.productId, garmentMockupId: garment.id, ...person },
            { onError: () => undefined }
          );
        } catch (error) {
          failures.push(`${garment.label}: ${getErrorMessage(error)}`);
        }
        done += 1;
        setProgress({ done, total: wanted.length });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(LIFESTYLE_PARALLEL_REQUESTS, wanted.length) }, worker)
    );
    setProgress(null);
    const made = wanted.length - failures.length;
    if (made > 0) {
      // The same people can dress the next mock-ups: a library photo stays chosen; an upload is asked for again.
      form.reset({
        garmentMockupIds,
        source: from,
        file: undefined,
        modelPhotoId,
        rightsConfirmed: false,
      });
      showToast(
        "success",
        `${made} lifestyle image${made === 1 ? "" : "s"} created. Check the print before you use ${made === 1 ? "it" : "them"}.`
      );
    }
    if (failures.length > 0)
      showToast("error", `${failures.length} could not be made. ${failures.join(" · ")}`);
  };
  // Folded away by default: it is an extra, paid step.
  return (
    <Accordion type="single" collapsible className="rounded-lg border px-3">
      <AccordionItem value="lifestyle">
        <AccordionTrigger className="py-2.5 hover:no-underline">
          <span className="text-sm font-medium text-ink-900">AI lifestyle image</span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <Form {...form}>
            <form
              className="space-y-5 pb-1"
              aria-label="AI lifestyle image"
              onSubmit={form.handleSubmit(generateAll)}
            >
              <p className="text-muted-foreground text-xs leading-relaxed">
                AI puts your product on real people: the cut and color come from the mockup, the
                print from its design.
              </p>
              <Step
                number={1}
                title="Choose the mockups"
                hint={`One image is made for each, up to ${MAX_LIFESTYLE_MOCKUPS}.`}
              >
                <FormField
                  control={form.control}
                  name="garmentMockupIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <GarmentChooser
                          garments={garments}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Step>
              <Step
                number={2}
                title="Choose who wears them"
                hint="Everyone in a group photo wears the product."
              >
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div
                          role="group"
                          aria-label="People to dress"
                          className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1"
                        >
                          {SOURCE_OPTIONS.map((option) => {
                            const picked = field.value === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={picked}
                                aria-label={option.label}
                                disabled={isPending}
                                onClick={() => field.onChange(option.value)}
                                className={cn(
                                  "rounded-md px-2 py-1.5 text-left transition-colors disabled:opacity-60",
                                  picked
                                    ? "bg-card shadow-sm ring-1 ring-ink-200"
                                    : "hover:bg-card/60"
                                )}
                              >
                                <span
                                  className={cn(
                                    "block text-xs font-semibold",
                                    picked ? "text-ink-900" : "text-ink-600"
                                  )}
                                >
                                  {option.label}
                                </span>
                                <span className="text-muted-foreground block text-[11px] leading-snug">
                                  {option.hint}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="mt-3">
                  {source === "library" ? (
                    <FormField
                      control={form.control}
                      name="modelPhotoId"
                      render={({ field }) => (
                        <FormItem className="grid-cols-[minmax(0,1fr)]">
                          <FormControl>
                            <LibraryModelPicker
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="file"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <UploadPhoto
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rightsConfirmed"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  disabled={isPending}
                                  onCheckedChange={(checked) => field.onChange(checked === true)}
                                  className="mt-0.5"
                                />
                              </FormControl>
                              <FormLabel className="text-xs leading-relaxed font-normal text-ink-700">
                                I have the rights to this photo, and the consent of a parent or
                                guardian for anyone under 18 in it.
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </Step>
              <Step number={3} title="Make the images">
                <div className="space-y-2">
                  {chosen.length > 0 && !locked && (
                    <p className="flex items-baseline justify-between gap-2 rounded-md bg-ink-50 px-2.5 py-1.5 text-xs">
                      <span className="text-ink-700">
                        {chosen.length} image{chosen.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-muted-foreground">
                        about ${(chosen.length * 0.03).toFixed(2)} on your Ideogram key
                      </span>
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full hover:translate-y-0"
                    disabled={isPending || chosen.length === 0 || locked}
                  >
                    {!locked && !progress && <Sparkles aria-hidden="true" />}
                    {progress
                      ? progress.total > 1
                        ? `Generating… ${progress.done} of ${progress.total} done`
                        : "Generating…"
                      : locked
                        ? "Lifestyle images are part of Pro"
                        : chosen.length > 1
                          ? `Generate ${chosen.length} lifestyle images`
                          : "Generate lifestyle image"}
                  </Button>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    AI can change the print slightly, so check each image before you use it.
                  </p>
                </div>
              </Step>
            </form>
          </Form>
          {showResults &&
            productIds.map((productId) => (
              <LifestyleResults
                key={productId}
                productId={productId}
                title={
                  productIds.length > 1
                    ? `Lifestyle images · ${chosen.find((garment) => garment.productId === productId)?.label ?? "product"}`
                    : undefined
                }
              />
            ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// The lifestyle images made for one product, newest first; each opens large in a viewer on the page.
const LifestyleResults = ({
  productId,
  title = "Lifestyle images of this product",
}: {
  productId: string;
  title?: string;
}) => {
  const { data: assets } = useMockupAssets(productId);
  const [viewing, setViewing] = useState<number | null>(null);
  const made = (assets ?? []).filter((asset) => asset.role === "Lifestyle");
  if (made.length === 0) return null;
  const gallery = made.map((asset, index) => ({
    id: asset.id,
    url: asset.previewUrl,
    alt: "Lifestyle image",
    caption: `Lifestyle image ${index + 1}`,
    width: asset.width,
    height: asset.height,
  }));
  return (
    <section className="space-y-2 border-t pt-4" aria-label="Lifestyle images">
      <p className="text-xs font-medium text-ink-700">{title}</p>
      <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3">
        {made.map((asset, index) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => setViewing(index)}
            className="block cursor-zoom-in overflow-hidden rounded-md border bg-ink-50 transition-colors hover:border-ink-400"
            aria-label={`View lifestyle image ${index + 1} larger`}
          >
            <Image
              src={asset.previewUrl}
              alt="Lifestyle image"
              width={asset.width}
              height={asset.height}
              unoptimized
              className="h-40 w-full object-contain"
            />
          </button>
        ))}
      </div>
      <ImageLightbox images={gallery} index={viewing} onIndexChange={setViewing} />
    </section>
  );
};
