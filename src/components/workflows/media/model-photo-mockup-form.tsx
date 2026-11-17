"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { GenerateModelPhotoDialog } from "@/components/mockups/generate-model-photo-dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/helpers/error-message";
import { isGarmentColor } from "@/helpers/garment-colors";
import { productTypeLabel } from "@/helpers/mockup-template";
import { modelAttributesLabel } from "@/helpers/model-attributes";
import { showToast } from "@/helpers/toast";
import { useGenerateModelPhotoMockup } from "@/hooks/mutations/use-generate-model-photo-mockup";
import { useImportGeneratedMockups } from "@/hooks/mutations/use-import-generated-mockups";
import { useModelPhotoPreview } from "@/hooks/queries/use-model-photo-preview";
import { useModelPhotos } from "@/hooks/queries/use-model-photos";
import type { ModelPhotoFilter } from "@/types/mockup-templates";
import type { MockupAsset } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

/** Only a mock-up composited from a design can be put on a model photo: it knows its design and print area. */
export const isModelPhotoSource = (asset: MockupAsset) =>
  asset.sourceType === "generated" && asset.role !== "Lifestyle";

/**
 * Puts one of the product's mock-ups on a model photo without AI: the person's garment takes the mock-up's color
 * and the design is printed where it sits on the mock-up. The result is a Lifestyle image, reviewed like any other.
 */
export const ModelPhotoMockupForm = ({
  productId,
  assets,
}: {
  productId: string;
  assets: MockupAsset[];
}) => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState("");
  const garments = assets.filter(isModelPhotoSource);
  // Mock-ups Apply mock-up made since they were last added (a new template or color) are added on opening, so
  // the newest are the ones offered.
  const { mutate: addMockups, isPending: isAdding } = useImportGeneratedMockups();
  const addedFor = useRef<string | null>(null);
  const openSection = (value: string) => {
    setOpen(value);
    if (value !== "model-photo" || addedFor.current === productId) return;
    addedFor.current = productId;
    addMockups(productId);
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={openSection}
      className="rounded-lg border px-3"
    >
      <AccordionItem value="model-photo">
        <AccordionTrigger className="py-2.5 hover:no-underline">
          <span className="text-ink-900 text-sm font-medium">{t("workflowMedia.modelPhotoForm.title")}</span>
        </AccordionTrigger>
        <AccordionContent>
          {isAdding && (
            <p role="status" className="text-muted-foreground mb-2 text-xs">
              {t("workflowMedia.modelPhotoForm.addingNewest")}
            </p>
          )}
          {garments.length === 0 ? (
            isAdding ? null : (
              <NoMockupsYet
                adding={isAdding}
                onAdd={() =>
                  addMockups(productId, {
                    onSuccess: ({ mockups }) => {
                      if (!mockups.some(isModelPhotoSource))
                        showToast(
                          "info",
                          t("workflowMedia.modelPhotoForm.noMockupsToast")
                        );
                    },
                  })
                }
              />
            )
          ) : (
            // Keyed by the newest mock-up, so the choice follows it when new ones are added.
            <ModelPhotoMockupFields
              key={garments[0].id}
              productId={productId}
              garments={garments}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// The product's mock-ups are made by Apply mock-up; they are listed here once added from the job.
const NoMockupsYet = ({ adding, onAdd }: { adding: boolean; onAdd: () => void }) => {
  const { t } = useTranslation("common");
  return (
  <div className="space-y-2">
    <p className="text-muted-foreground text-xs leading-relaxed">
      {t("workflowMedia.modelPhotoForm.noMockupsDescription")}
    </p>
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full hover:translate-y-0"
      disabled={adding}
      onClick={onAdd}
    >
      {adding ? t("workflowMedia.modelPhotoForm.addingMockups") : t("workflowMedia.modelPhotoForm.addMockups")}
    </Button>
  </div>
  );
};

const ModelPhotoMockupFields = ({
  productId,
  garments,
}: {
  productId: string;
  garments: MockupAsset[];
}) => {
  const { t } = useTranslation("common");
  const [garmentMockupId, setGarmentMockupId] = useState("");
  const [pickedPhotoId, setModelPhotoId] = useState("");
  const [filter, setFilter] = useState<ModelPhotoFilter>({});
  const [source, setSource] = useState<PhotoSource | null>(null);
  const [generating, setGenerating] = useState(false);
  const {
    data: photos,
    isPending: isLoadingPhotos,
    isError,
  } = useModelPhotos("seller", undefined, true, filter);
  const { mutate: generate, isPending } = useGenerateModelPhotoMockup();

  const chosenGarment = garments.some((asset) => asset.id === garmentMockupId)
    ? garmentMockupId
    : garments[0].id;
  const usable = filterBySource(photos ?? [], source).filter(
    (photo) => photo.realisticPrintReady && photo.allowRecolor
  );
  // The only model photo there is is the one to use.
  const modelPhotoId = usable.some((photo) => photo.id === pickedPhotoId)
    ? pickedPhotoId
    : usable.length === 1
      ? usable[0].id
      : "";
  // The model wears the mock-up's own garment color; the server reads it from the mock-up.
  const garmentHex = garments.find((asset) => asset.id === chosenGarment)?.variantKey ?? null;

  const submit = () => {
    if (!modelPhotoId) {
      showToast("warning", t("workflowMedia.modelPhotoForm.chooseModelPhoto"));
      return;
    }
    generate(
      { productId, garmentMockupId: chosenGarment, modelPhotoId, garmentColor: null },
      {
        onSuccess: () =>
          showToast(
            "success",
            t("workflowMedia.modelPhotoForm.created")
          ),
      }
    );
  };

  return (
    <div className="space-y-3" aria-label={t("workflowMedia.modelPhotoForm.putOnAria")}>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {t("workflowMedia.modelPhotoForm.description")}
      </p>
      <div className="space-y-2">
        <Label htmlFor="model-photo-source">{t("workflowMedia.modelPhotoForm.mockupToPutOn")}</Label>
        <Select
          value={chosenGarment}
          onValueChange={(value) => value && setGarmentMockupId(value)}
          disabled={isPending}
        >
          <SelectTrigger id="model-photo-source" className="bg-card w-full">
            <SelectValue placeholder={t("workflowMedia.modelPhotoForm.chooseMockup")} />
          </SelectTrigger>
          <SelectContent>
            {garments.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {t(`workflowMedia.assetRoles.${asset.role}`, { defaultValue: asset.role })} · {asset.variantKey ?? asset.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {garmentHex && isGarmentColor(garmentHex) && <GarmentColorSwatch hex={garmentHex} />}
          {t("workflowMedia.modelPhotoForm.garmentColorNote")}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-ink-900 text-sm font-medium">{t("workflowMedia.modelPhotoForm.modelPhoto")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:translate-y-0"
            disabled={isPending}
            onClick={() => setGenerating(true)}
          >
            <Sparkles aria-hidden="true" />
            {t("workflowMedia.modelPhotoForm.makeWithAi")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PhotoSourceFilter value={source} onChange={setSource} disabled={isPending} />
          <ModelPhotoFilterBar value={filter} onChange={setFilter} disabled={isPending} />
        </div>
        {isLoadingPhotos ? (
          <p className="text-muted-foreground text-xs">{t("workflowMedia.modelPhotoForm.loadingPhotos")}</p>
        ) : isError ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {t("workflowMedia.modelPhotoForm.photosLoadError")}
          </p>
        ) : usable.length === 0 && (Object.keys(filter).length > 0 || source !== null) ? (
          <p className="text-muted-foreground text-xs">
            {t("workflowMedia.modelPhotoForm.noMatchingPhotos")}{" "}
            <button
              type="button"
              className="text-primary font-medium underline-offset-2 hover:underline"
              onClick={() => setGenerating(true)}
            >
              {t("workflowMedia.modelPhotoForm.makeOneWithAi")}
            </button>
            .
          </p>
        ) : usable.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("workflowMedia.modelPhotoForm.noPhotosAddUnder")}{" "}
            <Link
              href="/mockups"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              {t("workflowMedia.modelPhotoForm.mockupTemplatesModelPhotos")}
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("workflowMedia.modelPhotoForm.modelPhoto")}>
            {usable.map((photo) => (
              <button
                key={photo.id}
                type="button"
                role="radio"
                aria-checked={modelPhotoId === photo.id}
                disabled={isPending}
                onClick={() => setModelPhotoId(photo.id)}
                className={cn(
                  "bg-ink-50 relative overflow-hidden rounded-md border text-left transition-shadow",
                  modelPhotoId === photo.id
                    ? "border-primary ring-primary/25 ring-2"
                    : "hover:border-ink-400"
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
                <span className="text-ink-700 block truncate px-1.5 py-1 text-[11px]">
                  {modelAttributesLabel(photo.attributes) ?? photo.name} ·{" "}
                  {t(`batches.productTypes.${photo.productType.toLowerCase()}`, { defaultValue: productTypeLabel(photo.productType) })}
                </span>
                {modelPhotoId === photo.id && (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex size-5 items-center justify-center rounded-full">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {modelPhotoId && (
        <ModelPhotoPreview
          productId={productId}
          garmentMockupId={chosenGarment}
          modelPhotoId={modelPhotoId}
          garmentColor={null}
        />
      )}
      <Button
        type="button"
        size="sm"
        className="w-full hover:translate-y-0"
        disabled={isPending || !modelPhotoId}
        onClick={submit}
      >
        {isPending ? t("workflowMedia.modelPhotoForm.puttingOn") : t("workflowMedia.modelPhotoForm.putOn")}
      </Button>
      {generating && (
        <GenerateModelPhotoDialog
          open
          scope="seller"
          initial={filter}
          onClose={() => setGenerating(false)}
          onGenerated={(photo) => setModelPhotoId(photo.id)}
        />
      )}
    </div>
  );
};

// What putting it on would make, before anything is saved. The CDN renders it the first time it is asked for.
const ModelPhotoPreview = (input: {
  productId: string;
  garmentMockupId: string;
  modelPhotoId: string;
  garmentColor: string | null;
}) => {
  const { t } = useTranslation("common");
  const { data, isPending, isError, error } = useModelPhotoPreview(input, true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const rendering = isPending || (data !== undefined && loaded !== data.url && failed !== data.url);

  return (
    <div className="space-y-1.5">
      <p className="text-ink-900 text-sm font-medium">{t("workflowMedia.modelPhotoForm.preview")}</p>
      {isError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="bg-ink-50 relative flex min-h-40 items-center justify-center overflow-hidden rounded-md border">
          {data && (
            // A plain <img>: the CDN renders the composite on the first request.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.url}
              alt={t("workflowMedia.modelPhotoForm.previewAlt")}
              className="max-h-80 w-full object-contain"
              onLoad={() => setLoaded(data.url)}
              onError={() => setFailed(data.url)}
            />
          )}
          {rendering && (
            <div
              className="bg-card/70 text-ink-600 absolute inset-0 flex items-center justify-center gap-2 text-xs"
              role="status"
            >
              <Spinner className="size-4" />
              {t("workflowMedia.modelPhotoForm.rendering")}
            </div>
          )}
        </div>
      )}
      {data && failed === data.url && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t("workflowMedia.modelPhotoForm.renderFailed")}
        </p>
      )}
    </div>
  );
};
