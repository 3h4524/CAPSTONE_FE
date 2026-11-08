"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  createMockupTemplate,
  mockupTemplateKeys,
  type SaveMockupTemplateInput,
  setMockupTemplateView,
  updateMockupTemplate,
} from "@/api/mockup-templates";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupSidesStrip } from "@/components/mockups/mockup-sides-strip";
import {
  hasPhoto,
  MockupViewPhotoEditor,
  type ViewDraft,
  viewDraftOf,
} from "@/components/mockups/mockup-view-photo-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import {
  areaFits,
  areaLabel,
  MAIN_AREA_KEY,
  mockupViewLabel,
  TEMPLATE_VIEWS,
  templateView,
} from "@/helpers/mockup-template";
import { hasFeature } from "@/helpers/plan-features";
import { showToast } from "@/helpers/toast";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { productTypes } from "@/schemas/batches";
import { type MockupTemplateFormValues, mockupTemplateSchema } from "@/schemas/mockup-template";
import type { MockupTemplate, MockupView } from "@/types/mockup-templates";
import { zodResolver } from "@hookform/resolvers/zod";

const productTypeLabels: Record<string, string> = {
  tshirt: "T-shirt",
  hoodie: "Hoodie",
  mug: "Mug",
  poster: "Poster",
  tote_bag: "Tote bag",
  phone_case: "Phone case",
};

type Drafts = Record<MockupView, ViewDraft>;

const draftsOf = (template: MockupTemplate | null): Drafts => {
  const sideOf = (view: MockupView) =>
    template?.views?.find((side) => templateView(side) === view) ?? null;
  return Object.fromEntries(
    TEMPLATE_VIEWS.map((view) => [
      view,
      viewDraftOf(view, view === "front" ? template : sideOf(view)),
    ])
  ) as Drafts;
};

type MockupTemplateFormDialogProps = {
  open: boolean;
  template: MockupTemplate | null;
  onClose: () => void;
};

// A template is a photo of the front of a garment and, optionally, photos of its back and sleeves. Each side has its own
// print areas; a run makes a mock-up of every side. Each other side is saved as a template of its own, kept with this one.
export const MockupTemplateFormDialog = ({
  open,
  template,
  onClose,
}: MockupTemplateFormDialogProps) => {
  const queryClient = useAppQueryClient();
  const [drafts, setDrafts] = useState<Drafts>(() => draftsOf(template));
  const [activeView, setActiveView] = useState<MockupView>("front");
  const [allowRecolor, setAllowRecolor] = useState(false);
  const [garmentColor, setGarmentColor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [frontSize, setFrontSize] = useState<{ width: number; height: number } | null>(null);
  // A template created by a save that then failed on one of its sides: saving again changes it rather than making another.
  const createdFrontId = useRef<string | null>(null);

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
    const next = draftsOf(template);
    const main = next.front.areas[0];
    reset({
      name: template?.name ?? "",
      productType: (template?.productType as MockupTemplateFormValues["productType"]) ?? "tshirt",
      x: main.x,
      y: main.y,
      width: main.width,
      height: main.height,
    });
    setDrafts(next);
    setActiveView("front");
    setAllowRecolor(template?.allowRecolor ?? false);
    setGarmentColor(template?.garmentColor ?? null);
    setFormError(null);
    createdFrontId.current = null;
  }, [open, template, reset]);

  // The form checks the front's main print area; it follows the front's areas.
  const frontMain =
    drafts.front.areas.find((area) => area.key === MAIN_AREA_KEY) ?? drafts.front.areas[0];
  useEffect(() => {
    setValue("x", frontMain.x, { shouldValidate: true });
    setValue("y", frontMain.y, { shouldValidate: true });
    setValue("width", frontMain.width, { shouldValidate: true });
    setValue("height", frontMain.height, { shouldValidate: true });
  }, [frontMain.x, frontMain.y, frontMain.width, frontMain.height, setValue]);

  // One stable updater per side, so the editor's effects do not run again on every render.
  const updaters = useMemo(
    () =>
      Object.fromEntries(
        TEMPLATE_VIEWS.map((view) => [
          view,
          (change: (draft: ViewDraft) => ViewDraft) => {
            setFormError(null);
            setDrafts((current) => ({ ...current, [view]: change(current[view]) }));
          },
        ])
      ) as Record<MockupView, (change: (draft: ViewDraft) => ViewDraft) => void>,
    []
  );
  const updaterFor = (view: MockupView) => updaters[view];

  const creating = template === null;
  const { data: entitlements } = useEntitlements();
  // Making and editing the Seller's own templates is a Pro feature; the backend refuses it on other plans.
  const locked = entitlements !== undefined && !hasFeature(entitlements, "custom_mockup_templates");
  const pending = saving;

  // A small picture of each side for the strip under the photo: its new photo, or the saved one.
  const pickedFiles = TEMPLATE_VIEWS.map((view) =>
    drafts[view].removed ? null : drafts[view].file
  );
  const [pickedUrls, setPickedUrls] = useState<(string | null)[]>([]);
  const pickedKey = pickedFiles
    .map((file) => (file ? `${file.name}:${file.size}:${file.lastModified}` : ""))
    .join("|");
  useEffect(() => {
    const urls = pickedFiles.map((file) => (file ? URL.createObjectURL(file) : null));
    setPickedUrls(urls);
    return () => urls.forEach((url) => url && URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the files change exactly when their key does
  }, [pickedKey]);
  const thumbnailOf = (view: MockupView) => {
    const draft = drafts[view];
    return draft.removed
      ? null
      : (pickedUrls[TEMPLATE_VIEWS.indexOf(view)] ?? (draft.file ? null : draft.savedUrl));
  };

  const saveSides = async (frontId: string, values: MockupTemplateFormValues) => {
    for (const view of TEMPLATE_VIEWS.filter((item) => item !== "front")) {
      const draft = drafts[view];
      if (draft.removed && draft.templateId) {
        await setMockupTemplateView(frontId, view, null);
        updaterFor(view)(() => viewDraftOf(view, null));
        continue;
      }
      if (!hasPhoto(draft)) continue;
      const main = draft.areas[0];
      const input: SaveMockupTemplateInput = {
        name: `${values.name.trim()} - ${mockupViewLabel(view)}`,
        productType: values.productType,
        x: main.x,
        y: main.y,
        width: main.width,
        height: main.height,
        baseImage: draft.file,
        allowRecolor,
        garmentColor: allowRecolor ? garmentColor : null,
        view,
        areas: draft.areas,
      };
      if (draft.templateId) {
        await updateMockupTemplate(draft.templateId, input);
      } else {
        // Made and linked to the front in one request, so it never shows up as a template of its own.
        const created = await createMockupTemplate({ ...input, mainTemplateId: frontId });
        updaterFor(view)((current) => ({ ...current, templateId: created.id }));
      }
    }
  };

  const submit = handleSubmit(async (values) => {
    if (creating && !createdFrontId.current && !drafts.front.file) {
      setActiveView("front");
      setFormError("Add a photo of the front for the new template.");
      return;
    }
    // Every side's areas must lie on its photo and print something.
    for (const view of TEMPLATE_VIEWS) {
      const draft = drafts[view];
      if (!hasPhoto(draft)) continue;
      const size = view === "front" ? (frontSize ?? draft.areasBasis) : draft.areasBasis;
      const outside = size
        ? draft.areas.findIndex((area) => !areaFits(area, size.width, size.height))
        : -1;
      if (outside >= 0) {
        setActiveView(view);
        setFormError(
          `${mockupViewLabel(view)}: ${areaLabel(draft.areas[outside], outside)} reaches off the photo. Move it onto the photo or make it smaller.`
        );
        return;
      }
      if (draft.areas.every((area) => area.source === "none")) {
        setActiveView(view);
        setFormError(
          `${mockupViewLabel(view)}: every print area prints nothing. Let at least one print the mock-up's design.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const front = drafts.front;
      const input: SaveMockupTemplateInput = {
        name: values.name,
        productType: values.productType,
        x: values.x,
        y: values.y,
        width: values.width,
        height: values.height,
        baseImage: front.file,
        allowRecolor,
        garmentColor: allowRecolor ? garmentColor : null,
        view: "front",
        areas: front.areas,
      };
      const frontId = template?.id ?? createdFrontId.current;
      const saved = frontId
        ? await updateMockupTemplate(frontId, input)
        : await createMockupTemplate(input);
      createdFrontId.current = saved.id;
      await saveSides(saved.id, values);
      await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", `${saved.name} was ${creating ? "created" : "saved"}.`);
      onClose();
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  const draft = drafts[activeView];

  const sidesStrip = (
    <MockupSidesStrip
      active={activeView}
      onSelect={setActiveView}
      sides={TEMPLATE_VIEWS.map((view) => ({
        view,
        thumbnail: hasPhoto(drafts[view]) ? thumbnailOf(view) : null,
        title: hasPhoto(drafts[view]) ? undefined : `${mockupViewLabel(view)}: add a photo`,
      }))}
    />
  );

  const settingsTop = (
    <div className="space-y-3">
      <FormInputField
        id="mockup-name"
        label="Name"
        type="text"
        placeholder="Classic tee"
        registration={register("name")}
        error={errors.name}
        required
      />
      <div className="space-y-2">
        <Label htmlFor="mockup-product-type">Product type *</Label>
        <Select
          value={watch("productType")}
          onValueChange={(value) =>
            value &&
            setValue("productType", value as MockupTemplateFormValues["productType"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="mockup-product-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {productTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const settingsBottom = (
    <div className="space-y-3">
      {(errors.x || errors.y || errors.width || errors.height) && (
        <p role="alert" className="text-sm text-red-600">
          Draw a print area on the front photo.
        </p>
      )}
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id="mockup-allow-recolor"
          checked={allowRecolor}
          onCheckedChange={(checked) => setAllowRecolor(checked === true)}
          disabled={pending}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <Label htmlFor="mockup-allow-recolor">Allow garment recolor</Label>
          <p className="text-muted-foreground text-xs">
            Any garment color, on every side. Needs a white or light-gray garment on a plain
            background.
          </p>
        </div>
      </div>
      {allowRecolor && (
        <div className="space-y-2 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Garment color</p>
            <p className="text-muted-foreground text-xs">
              Used unless a batch picks its own colors. None keeps the photo’s color.
            </p>
          </div>
          <GarmentColorPicker
            selected={garmentColor ? [garmentColor] : []}
            disabled={pending}
            onToggle={(hex) =>
              setGarmentColor((current) =>
                current?.toLowerCase() === hex.toLowerCase() ? null : hex
              )
            }
          />
        </div>
      )}
      {template && !template.realisticPrintReady && !drafts.front.file && (
        <p className="text-muted-foreground text-xs">
          Saving also prepares realistic printing (fabric folds and shadows) for this photo.
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !saving && onClose()}>
      <DialogContent className="flex h-[min(88dvh,780px)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>{creating ? "New mock-up template" : `Edit ${template.name}`}</DialogTitle>
          <DialogDescription>
            Mark where designs go on each photo. Add the back or a sleeve to print there too: each
            side makes its own mock-up.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <MockupViewPhotoEditor
            key={activeView}
            draft={draft}
            update={updaterFor(activeView)}
            analyze={open && !locked}
            disabled={pending}
            allowRecolor={allowRecolor}
            garmentColor={garmentColor}
            onPhotoSize={activeView === "front" ? setFrontSize : undefined}
            onRemove={
              activeView === "front"
                ? undefined
                : () =>
                    updaterFor(activeView)((current) => ({
                      ...viewDraftOf(activeView, null),
                      templateId: current.templateId,
                      removed: current.templateId !== null,
                    }))
            }
            sides={sidesStrip}
            settingsTop={settingsTop}
            settingsBottom={settingsBottom}
          />
          <DialogFooter className="flex-wrap items-center gap-2 border-t px-5 py-3">
            {formError ? (
              <p role="alert" className="mr-auto max-w-xl text-sm text-red-600">
                {formError}
              </p>
            ) : locked ? (
              <p className="text-muted-foreground mr-auto text-xs">
                Custom mock-up templates are part of Pro.
              </p>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || locked}>
              {pending ? "Analyzing photos…" : creating ? "Create template" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
