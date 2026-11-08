"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

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
          <span className="text-sm font-medium text-ink-900">Put on a model photo (no AI)</span>
        </AccordionTrigger>
        <AccordionContent>
          {isAdding && (
            <p role="status" className="text-muted-foreground mb-2 text-xs">
              Adding the newest mock-ups of this product…
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
                          "This product has no mock-ups yet. Make them with Apply mock-up first."
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
const NoMockupsYet = ({ adding, onAdd }: { adding: boolean; onAdd: () => void }) => (
  <div className="space-y-2">
    <p className="text-muted-foreground text-xs leading-relaxed">
      A model photo wears one of this product’s mock-ups: its garment color and its design, where it
      sits on the mock-up. This product has none yet: make them with Apply mock-up, then add them
      here.
    </p>
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full hover:translate-y-0"
      disabled={adding}
      onClick={onAdd}
    >
      {adding ? "Adding mock-ups…" : "Add this product’s mock-ups"}
    </Button>
  </div>
);

const ModelPhotoMockupFields = ({
  productId,
  garments,
}: {
  productId: string;
  garments: MockupAsset[];
}) => {
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
      showToast("warning", "Choose a model photo.");
      return;
    }
    generate(
      { productId, garmentMockupId: chosenGarment, modelPhotoId, garmentColor: null },
      {
        onSuccess: () =>
          showToast(
            "success",
            "Model photo image created. Review and approve it like any mock-up."
          ),
      }
    );
  };

  return (
    <div className="space-y-3" aria-label="Put on a model photo">
      <p className="text-muted-foreground text-xs leading-relaxed">
        The person’s garment takes the mock-up’s color and the design is printed where it sits on
        the mock-up, with the fabric’s folds. Free, and the print stays exactly as designed. The
        result is added as a Lifestyle image.
      </p>
      <div className="space-y-2">
        <Label htmlFor="model-photo-source">Mock-up to put on</Label>
        <Select
          value={chosenGarment}
          onValueChange={(value) => value && setGarmentMockupId(value)}
          disabled={isPending}
        >
          <SelectTrigger id="model-photo-source" className="w-full bg-card">
            <SelectValue placeholder="Choose a mockup" />
          </SelectTrigger>
          <SelectContent>
            {garments.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.role} · {asset.variantKey ?? asset.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {garmentHex && isGarmentColor(garmentHex) && <GarmentColorSwatch hex={garmentHex} />}
          The model’s garment takes this mock-up’s color.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink-900">Model photo</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:translate-y-0"
            disabled={isPending}
            onClick={() => setGenerating(true)}
          >
            <Sparkles aria-hidden="true" />
            Make with AI
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PhotoSourceFilter value={source} onChange={setSource} disabled={isPending} />
          <ModelPhotoFilterBar value={filter} onChange={setFilter} disabled={isPending} />
        </div>
        {isLoadingPhotos ? (
          <p className="text-muted-foreground text-xs">Loading model photos…</p>
        ) : isError ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Model photos could not be loaded.
          </p>
        ) : usable.length === 0 && (Object.keys(filter).length > 0 || source !== null) ? (
          <p className="text-muted-foreground text-xs">
            No model photos of these people yet.{" "}
            <button
              type="button"
              className="text-primary font-medium underline-offset-2 hover:underline"
              onClick={() => setGenerating(true)}
            >
              Make one with AI
            </button>
            .
          </p>
        ) : usable.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No model photos yet. Add one under{" "}
            <Link
              href="/mockups"
              className="text-primary font-medium underline-offset-2 hover:underline"
            >
              Mock-up templates → Model photos
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Model photo">
            {usable.map((photo) => (
              <button
                key={photo.id}
                type="button"
                role="radio"
                aria-checked={modelPhotoId === photo.id}
                disabled={isPending}
                onClick={() => setModelPhotoId(photo.id)}
                className={cn(
                  "relative overflow-hidden rounded-md border bg-ink-50 text-left transition-shadow",
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
                <span className="block truncate px-1.5 py-1 text-[11px] text-ink-700">
                  {modelAttributesLabel(photo.attributes) ?? photo.name} ·{" "}
                  {productTypeLabel(photo.productType)}
                </span>
                {modelPhotoId === photo.id && (
                  <span className="bg-primary absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-primary-foreground">
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
        {isPending ? "Putting it on…" : "Put on model photo"}
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
  const { data, isPending, isError, error } = useModelPhotoPreview(input, true);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const rendering = isPending || (data !== undefined && loaded !== data.url && failed !== data.url);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink-900">Preview</p>
      {isError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {getErrorMessage(error)}
        </p>
      ) : (
        <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-md border bg-ink-50">
          {data && (
            // A plain <img>: the CDN renders the composite on the first request.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.url}
              alt="The mock-up on the model photo"
              className="max-h-80 w-full object-contain"
              onLoad={() => setLoaded(data.url)}
              onError={() => setFailed(data.url)}
            />
          )}
          {rendering && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 bg-card/70 text-xs text-ink-600"
              role="status"
            >
              <Spinner className="size-4" />
              Rendering the preview…
            </div>
          )}
        </div>
      )}
      {data && failed === data.url && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          The preview could not be rendered. Try again in a moment.
        </p>
      )}
    </div>
  );
};
