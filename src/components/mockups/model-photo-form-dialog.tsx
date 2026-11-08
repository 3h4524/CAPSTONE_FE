"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { type ModelPhotoScope, previewModelPhoto } from "@/api/model-photos";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import {
  type GarmentSelection,
  GarmentSelectionEditor,
  selectionToDataUrl,
  selectionToPng,
} from "@/components/mockups/garment-selection-editor";
import { MockupPhotoDropzone } from "@/components/mockups/mockup-photo-dropzone";
import { ModelAttributesFields } from "@/components/mockups/model-attributes-fields";
import { PrintQuadEditor } from "@/components/mockups/print-quad-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chestPrintArea, selectionBounds } from "@/helpers/garment-selection";
import {
  isAutomaticPlacement,
  isRectangleQuad,
  isValidQuad,
  parsePrintArea,
  parsePrintQuad,
  type PrintQuad,
  productTypeLabel,
  quadBounds,
  quadFromArea,
} from "@/helpers/mockup-template";
import { cleanAttributes, isCompleteAttributes } from "@/helpers/model-attributes";
import { showToast } from "@/helpers/toast";
import { useSaveModelPhoto } from "@/hooks/mutations/use-model-photo-mutations";
import { productTypes } from "@/schemas/batches";
import { type MockupTemplateFormValues, mockupTemplateSchema } from "@/schemas/mockup-template";
import type {
  GarmentMaskPreview,
  MockupPrintArea,
  MockupTemplate,
  ModelAttributes,
} from "@/types/mockup-templates";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// Below this share of the photo, the server refuses the selection as too small to be a garment.
const MIN_SELECTION_COVERAGE = 0.02;
// Below this longer side, a model photo's garment edge and print come out visibly rough.
const MIN_SHARP_PHOTO_SIDE = 1200;

/**
 * How the garment is chosen: the one saved with the photo, found automatically by the server, or selected by hand.
 */
type GarmentMode = "saved" | "auto" | "manual";

type ModelPhotoFormDialogProps = {
  open: boolean;
  /** The model photo to change, or null for a new one. */
  photo: MockupTemplate | null;
  scope: ModelPhotoScope;
  onClose: () => void;
};

/**
 * Creates or changes a model photo: a person wearing a plain, light garment. The garment is found automatically
 * (the seller can select it by hand instead), so only it is recolored and printed on. Designs are placed
 * automatically by measuring the shirt, or in a print area the seller marks.
 */
export const ModelPhotoFormDialog = ({
  open,
  photo,
  scope,
  onClose,
}: ModelPhotoFormDialogProps) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [person, setPerson] = useState<GarmentMaskPreview | null>(null);
  const [personPending, setPersonPending] = useState(false);
  const [garmentMode, setGarmentMode] = useState<GarmentMode>("auto");
  // Whether the garment shown starts from the one saved with the photo; otherwise from the one found automatically.
  const [fromSaved, setFromSaved] = useState(false);
  // Changed to start the garment over from what was found automatically.
  const [garmentRun, setGarmentRun] = useState(0);
  // The garment shown on the photo, as found or as selected by hand; null until there is one.
  const [selection, setSelection] = useState<GarmentSelection | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  // Automatic: each design is placed by measuring the shirt on both photos, so no print area is needed.
  const [autoPlacement, setAutoPlacement] = useState(true);
  // Who is in the photo, for filtering the library.
  const [attributes, setAttributes] = useState<ModelAttributes>({ people: "single" });
  const [attributesError, setAttributesError] = useState<string | null>(null);
  // The print area's corners once the seller has moved one; until then they are the print-area rectangle's.
  const [quad, setQuad] = useState<PrintQuad | null>(null);
  // Whether the seller has placed the print area themselves; until then it follows the selected garment.
  const areaPlaced = useRef(false);
  const { mutate: save, isPending: isSaving } = useSaveModelPhoto(scope);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MockupTemplateFormValues>({
    resolver: zodResolver(mockupTemplateSchema),
    defaultValues: { name: "", productType: "tshirt", x: 0, y: 0, width: 100, height: 100 },
  });

  useEffect(() => {
    const area = photo ? parsePrintArea(photo.printAreaConfig) : null;
    reset({
      name: photo?.name ?? "",
      productType: (photo?.productType as MockupTemplateFormValues["productType"]) ?? "tshirt",
      x: area?.x ?? 0,
      y: area?.y ?? 0,
      width: area?.width ?? 100,
      height: area?.height ?? 100,
    });
    setPhotoFile(null);
    setGarmentMode(photo ? "saved" : "auto");
    setFromSaved(photo !== null);
    setSelection(null);
    setSelectionError(null);
    setFileError(null);
    setAutoPlacement(photo ? isAutomaticPlacement(photo.printAreaConfig) : true);
    setAttributes(photo?.attributes ? cleanAttributes(photo.attributes) : { people: "single" });
    setAttributesError(null);
    setQuad(photo ? parsePrintQuad(photo.printAreaConfig) : null);
    areaPlaced.current = photo !== null;
  }, [open, photo, reset]);

  useEffect(() => {
    setPhotoSize(null);
    if (!photoFile) {
      setPhotoObjectUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoObjectUrl(objectUrl);
    let cancelled = false;
    void createImageBitmap(photoFile)
      .then((bitmap) => {
        if (!cancelled) setPhotoSize({ width: bitmap.width, height: bitmap.height });
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  const savedPhotoUrl = photo?.baseImageUrl ?? null;
  const shownPhoto = photoObjectUrl ?? savedPhotoUrl;
  const shownSize = photoFile
    ? photoSize
    : photo
      ? { width: photo.outputWidthPx, height: photo.outputHeightPx }
      : null;

  // The server finds the person on the photo, so a click on a white shirt does not spill onto a white wall.
  useEffect(() => {
    setPerson(null);
    if (!open || !shownPhoto) {
      setPersonPending(false);
      return;
    }
    const controller = new AbortController();
    setPersonPending(true);
    void (async () => {
      try {
        let file = photoFile;
        if (!file) {
          const blob = await (
            await fetch(savedPhotoUrl as string, { signal: controller.signal })
          ).blob();
          file = new File([blob], "model-photo", { type: blob.type });
        }
        const preview = await previewModelPhoto(scope, file, controller.signal);
        if (!controller.signal.aborted) setPerson(preview);
      } catch {
        // Without the person the garment can still be selected; only the background is not kept out.
        if (!controller.signal.aborted)
          setPerson({ recolorable: false, reason: null, maskDataUrl: null });
      } finally {
        if (!controller.signal.aborted) setPersonPending(false);
      }
    })();
    return () => controller.abort();
  }, [open, shownPhoto, photoFile, savedPhotoUrl, scope]);

  // Finding it automatically needs the server to have found it on the preview; otherwise it is selected by hand.
  const garmentFound = Boolean(person?.garmentDataUrl);
  const mode: GarmentMode =
    garmentMode === "auto" && person && !personPending && !garmentFound ? "manual" : garmentMode;

  // The garment on the photo, for the print area editor's garment box and its off-garment warning.
  const selectionUrl = useMemo(
    () => (selection ? selectionToDataUrl(selection) : null),
    [selection]
  );
  const garmentMaskUrl =
    mode === "saved"
      ? (photo?.garmentMaskUrl ?? null)
      : (selectionUrl ?? (mode === "auto" ? (person?.garmentDataUrl ?? null) : null));

  const setArea = (next: MockupPrintArea) => {
    setValue("x", next.x, { shouldValidate: true });
    setValue("y", next.y, { shouldValidate: true });
    setValue("width", next.width, { shouldValidate: true });
    setValue("height", next.height, { shouldValidate: true });
  };
  const area: MockupPrintArea = {
    x: watch("x"),
    y: watch("y"),
    width: watch("width"),
    height: watch("height"),
  };
  const shownQuad = quad ?? quadFromArea(area);
  // Moving a corner places the print area by hand; its rectangle becomes the box around the corners.
  const changeQuad = (next: PrintQuad) => {
    areaPlaced.current = true;
    setQuad(next);
    setArea(quadBounds(next));
  };

  const changeSelection = (next: GarmentSelection | null) => {
    setSelection(next);
    setSelectionError(null);
    // Until the seller places it, the print area sits on the chest of what is selected.
    if (next && shownSize && !areaPlaced.current) {
      const bounds = selectionBounds(next.mask, next.width);
      if (bounds) setArea(chestPrintArea(bounds, shownSize.width / next.width));
    }
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("The photo cannot exceed 10 MB.");
      return;
    }
    setFileError(null);
    setGarmentMode("auto");
    setFromSaved(false);
    setSelection(null);
    setQuad(null);
    areaPlaced.current = false;
    setPhotoFile(file);
  };

  const creating = photo === null;
  const pending = isSaving || isEncoding;
  // Selecting by hand from the saved garment and changing nothing keeps the saved garment.
  const keepGarment = mode === "saved" || (mode === "manual" && fromSaved && !selection);
  const findGarment = mode === "auto";

  // Starts the garment over from the one found automatically, which the server finds again on saving.
  const startFromFoundGarment = () => {
    setSelection(null);
    setSelectionError(null);
    setFromSaved(false);
    setGarmentMode("auto");
    setGarmentRun((run) => run + 1);
  };

  const submit = handleSubmit(async (values) => {
    if (creating && !photoFile) {
      setFileError("Add a photo of a person wearing a plain, light garment.");
      return;
    }
    if (!isCompleteAttributes(attributes)) {
      setAttributesError(
        attributes.people === "group"
          ? "Choose who the group is: a family, friends or a couple."
          : "Choose the person's age group and gender."
      );
      return;
    }
    if (
      !keepGarment &&
      !findGarment &&
      (!selection || selection.coverage < MIN_SELECTION_COVERAGE)
    ) {
      setSelectionError(
        selection
          ? "Select more of the garment."
          : "Click the garment on the photo to select it: it is what takes the mock-up’s color."
      );
      return;
    }
    // Corners only matter when the design goes in a print area marked by hand, and only when it is not a rectangle.
    const printQuad = !autoPlacement && quad && !isRectangleQuad(quad) ? quad : null;
    if (printQuad && shownSize && !isValidQuad(printQuad, shownSize.width, shownSize.height)) {
      showToast("warning", "Put the print area's corners back in order before saving.");
      return;
    }
    let garmentSelection: Blob | null = null;
    if (mode === "manual" && selection) {
      try {
        setIsEncoding(true);
        garmentSelection = await selectionToPng(selection);
      } catch {
        showToast("error", "The selection could not be prepared. Try again.");
        return;
      } finally {
        setIsEncoding(false);
      }
    }
    save(
      {
        id: photo?.id ?? null,
        name: values.name,
        productType: values.productType,
        x: values.x,
        y: values.y,
        width: values.width,
        height: values.height,
        photo: photoFile,
        garmentSelection,
        findGarment,
        autoPlacement,
        printQuad,
        attributes: cleanAttributes(attributes),
      },
      { onSuccess: onClose }
    );
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>{creating ? "New model photo" : `Edit ${photo.name}`}</DialogTitle>
          <DialogDescription>
            A person wearing a plain white or light garment, facing the camera. Mock-ups are put on
            it without AI: the garment takes the mock-up’s color and design.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-1 py-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInputField
                  id="model-photo-name"
                  label="Name"
                  type="text"
                  placeholder="Studio, white tee, front"
                  registration={register("name")}
                  error={errors.name}
                  required
                />
                <div className="space-y-2">
                  <Label htmlFor="model-photo-product-type">Product type *</Label>
                  <Select
                    value={watch("productType")}
                    onValueChange={(value) =>
                      value &&
                      setValue("productType", value as MockupTemplateFormValues["productType"], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="model-photo-product-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {productTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <MockupPhotoDropzone
                label="Photo of a person"
                previewUrl={shownPhoto}
                error={fileError}
                disabled={pending}
                onSelect={pickFile}
                onRemove={() => setPhotoFile(null)}
              />
              <section className="space-y-2" aria-label="Who is in the photo">
                <ModelAttributesFields
                  value={attributes}
                  disabled={pending}
                  onChange={(next) => {
                    setAttributes(next);
                    setAttributesError(null);
                  }}
                />
                {attributesError && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {attributesError}
                  </p>
                )}
                {attributes.people === "group" && person?.garmentCount != null && (
                  <p role="status" className="text-xs text-ink-600">
                    {person.garmentCount === 1
                      ? "Found 1 shirt. People standing close together count as one: leave a gap between them so each one gets the design."
                      : `Found ${person.garmentCount} shirts: each one gets the design.`}
                  </p>
                )}
              </section>
              {shownSize && Math.max(shownSize.width, shownSize.height) < MIN_SHARP_PHOTO_SIDE && (
                <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
                  This photo is small ({shownSize.width} × {shownSize.height} px): the garment’s
                  edge and the print will look rough. Use a photo at least {MIN_SHARP_PHOTO_SIDE} px
                  on its longer side.
                </p>
              )}
              {shownPhoto && (
                <section className="space-y-2" aria-labelledby="model-photo-garment">
                  <div>
                    <p id="model-photo-garment" className="text-sm font-medium text-ink-900">
                      1. The garment
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Only the garment (blue) takes the mock-up’s color and print; skin and the
                      background keep theirs.
                      {personPending &&
                        " Finding the garment on the photo… this takes a few seconds."}
                      {mode === "auto" &&
                        garmentFound &&
                        " It was found automatically, and is found again at the photo’s full size when you save."}
                      {mode === "saved" && " This is the garment saved with the photo."}
                      {mode === "manual" &&
                        !garmentFound &&
                        person &&
                        " It could not be found automatically: click it on the photo to select it."}
                      {mode === "manual" &&
                        person &&
                        !person.maskDataUrl &&
                        " The person could not be found either, so take care not to select the background."}
                    </p>
                  </div>
                  {personPending || !person ? null : (
                    <GarmentSelectionEditor
                      key={`${fromSaved ? "saved" : "found"}-${garmentRun}`}
                      photoUrl={shownPhoto}
                      personMaskUrl={person.maskDataUrl}
                      initialSelectionUrl={fromSaved ? (photo?.garmentMaskUrl ?? null) : null}
                      suggestedSelectionUrl={person.garmentDataUrl ?? null}
                      disabled={pending}
                      readOnly={mode !== "manual"}
                      onChange={changeSelection}
                    />
                  )}
                  {!personPending && person && (
                    <div className="flex flex-wrap gap-2">
                      {mode !== "auto" && garmentFound && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs hover:translate-y-0"
                          disabled={pending}
                          onClick={startFromFoundGarment}
                        >
                          {mode === "saved"
                            ? "Find the garment again"
                            : "Use the garment found automatically"}
                        </Button>
                      )}
                      {mode !== "manual" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs hover:translate-y-0"
                          disabled={pending}
                          onClick={() => setGarmentMode("manual")}
                        >
                          Adjust by hand
                        </Button>
                      )}
                    </div>
                  )}
                  {selectionError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      {selectionError}
                    </p>
                  )}
                </section>
              )}
              {shownPhoto && shownSize && (
                <section className="space-y-3" aria-labelledby="model-photo-placement">
                  <p id="model-photo-placement" className="text-sm font-medium text-ink-900">
                    2. Where the design goes
                  </p>
                  <RadioGroup
                    value={autoPlacement ? "auto" : "manual"}
                    onValueChange={(value) => setAutoPlacement(value === "auto")}
                    disabled={pending}
                    className="gap-2"
                  >
                    {[
                      {
                        value: "auto",
                        label: "As on each mock-up (automatic)",
                        description:
                          "The shirt is measured on both photos: the design keeps its size relative to the chest and its distance below the collar, as on the mock-up. Nothing to mark.",
                      },
                      {
                        value: "manual",
                        label: "In a print area I mark",
                        description:
                          "Drag its four corners onto the chest: for a pose the automatic placement gets wrong, such as a person turned a little to the side.",
                      },
                    ].map((option) => (
                      <label
                        key={option.value}
                        htmlFor={`model-photo-placement-${option.value}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                      >
                        <RadioGroupItem
                          id={`model-photo-placement-${option.value}`}
                          value={option.value}
                          className="mt-0.5"
                        />
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium text-ink-900">
                            {option.label}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  {!autoPlacement &&
                    (garmentMaskUrl ? (
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs">
                          Cover the same part of the garment as your mock-up templates’ print area
                          (for a tee, the chest). A design is placed in it as it is on the mock-up.
                        </p>
                        <div
                          onPointerDown={() => {
                            areaPlaced.current = true;
                          }}
                        >
                          <PrintQuadEditor
                            key={`${shownPhoto}:${shownSize.width}x${shownSize.height}`}
                            imageUrl={shownPhoto}
                            value={shownQuad}
                            onChange={changeQuad}
                            disabled={pending}
                            pixelSize={shownSize}
                            garmentMaskUrl={garmentMaskUrl}
                          />
                        </div>
                        {(errors.x || errors.y || errors.width || errors.height) && (
                          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                            Draw a print area on the photo.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Select the garment first: the print area then sits on its chest, ready to
                        adjust.
                      </p>
                    ))}
                </section>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || personPending}>
              {pending ? "Preparing the photo…" : creating ? "Create model photo" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
