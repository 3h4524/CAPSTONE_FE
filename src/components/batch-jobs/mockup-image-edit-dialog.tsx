"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2, Undo2 } from "lucide-react";

import {
  resetMockupOverride,
  saveMockupOverride,
  saveMockupOverrides,
} from "@/api/mockup-templates";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker } from "@/components/mockups/garment-color-picker";
import { MockupBackgroundPicker } from "@/components/mockups/mockup-background-picker";
import { MockupSidesStrip } from "@/components/mockups/mockup-sides-strip";
import { PrintAreaEditor } from "@/components/mockups/print-area-editor";
import { type AreaDesignOption, PrintAreaList } from "@/components/mockups/print-area-list";
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
import { garmentColorName } from "@/helpers/garment-colors";
import {
  currentMockupSetup,
  findDuplicateMockup,
  isMockupChangeScope,
  type MockupChangeScope,
  type MockupOverrideChange,
  mockupsInScope,
  samePrintArea,
  spreadMockupChange,
} from "@/helpers/mockup-overrides";
import {
  cardOfMockup,
  groupMockupSides,
  type MockupSide,
  sideOfTemplate,
  templateForView,
  templateSidesIndex,
} from "@/helpers/mockup-sides";
import {
  areaLabel,
  MAIN_AREA_KEY,
  mockupViewLabel,
  parsePrintLayout,
  productTypeLabel,
  resolveMockupAreas,
  sameAreas,
  withViewTemplates,
} from "@/helpers/mockup-template";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import type {
  GenerateAllMockupsResult,
  MockupArea,
  MockupImage,
  MockupOverride,
  MockupPrintArea,
  MockupView,
} from "@/types/mockup-templates";

type MockupImageEditDialogProps = {
  batchJobId: string;
  /** The mock-up being changed; the dialog is open while there is one. Its other sides are changed with it. */
  image: MockupImage | null;
  /** All of the job's mock-ups: the background and design position can be copied onto those of the same template, and none may end up the same as another. */
  images: MockupImage[];
  productName: string;
  productType: string;
  /** The design on the mock-up, shown in the print area while it is moved. */
  designImageUrl: string | null;
  /** The job's other designs, which a print area such as a sleeve can print instead. */
  designOptions?: AreaDesignOption[];
  onOpenChange: (open: boolean) => void;
  /** The job's mock-ups, made again with the change, and how many mock-ups it changed. */
  onSaved: (result: GenerateAllMockupsResult, changedCount: number) => void;
};

// How a side's print areas were set, on the template photo they were set on: every area as the seller left it, or (as
// saved before there were several areas) only the main one moved.
type EditedAreas = {
  templateId: string;
  own: MockupArea[] | null;
  movedMain: MockupPrintArea | null;
};

const sameColor = (left: string | null | undefined, right: string | null | undefined) =>
  (left ?? "").toLowerCase() === (right ?? "").toLowerCase();

const sameSetup = (left: MockupOverride, right: MockupOverride) =>
  left.mockupTemplateId === right.mockupTemplateId &&
  sameColor(left.garmentColor, right.garmentColor) &&
  sameColor(left.backgroundColor, right.backgroundColor) &&
  samePrintArea(left.printArea ?? null, right.printArea ?? null) &&
  sameAreas(left.areas ?? null, right.areas ?? null);

// Changes one mock-up of a batch job apart from the job's settings, together with its other sides (front, back,
// sleeves): the template, garment color and background are shared by the sides, and each side's design sits on its
// own photo. The background and design position can be copied onto the job's other mock-ups of the same template in
// the same save. A change that would make two mock-ups alike is not saved. The job keeps the changes, so making the
// job's mock-ups again does not undo them.
export const MockupImageEditDialog = ({
  batchJobId,
  image,
  images,
  productName,
  productType,
  designImageUrl,
  designOptions = [],
  onOpenChange,
  onSaved,
}: MockupImageEditDialogProps) => {
  const open = image !== null;
  // Only templates for this product's own type: any other is refused. The photos of their other sides come with them.
  const { data: listed, isPending: isLoadingTemplates } = useMockupTemplates(
    productType || undefined,
    open
  );
  // Every template, to know which of the other mock-ups' templates can take a background, and the sides of each.
  const { data: allListed } = useMockupTemplates(undefined, open);
  const allTemplates = allListed ? withViewTemplates(allListed) : [];
  const templatesById = new Map(allTemplates.map((item) => [item.id, item]));
  const sidesIndex = templateSidesIndex(allListed ?? []);
  const cards = groupMockupSides(images, sidesIndex);
  const card = image ? cardOfMockup(cards, image.id) : null;
  const sides: MockupSide[] = card?.sides ?? (image ? [{ view: "front", image }] : []);
  const cardImageIds = new Set(sides.map((side) => side.image.id));

  const [mainId, setMainId] = useState("");
  const [garmentColor, setGarmentColor] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MockupView>("front");
  const [edits, setEdits] = useState<Partial<Record<MockupView, EditedAreas | null>>>({});
  const [removedViews, setRemovedViews] = useState<MockupView[]>([]);
  const [activeKey, setActiveKey] = useState(MAIN_AREA_KEY);
  const [scope, setScope] = useState<MockupChangeScope>("this");

  // Starts from how the mock-up and its other sides are made now, changing them alone. Set again once the templates
  // are known, which tells which mock-ups are its other sides.
  const sideIds = sides.map((side) => side.image.id).join("|");
  useEffect(() => {
    if (!image) return;
    const current = currentMockupSetup(image);
    setMainId(
      sideOfTemplate(sidesIndex, current.mockupTemplateId)?.mainId ?? current.mockupTemplateId
    );
    setGarmentColor(current.garmentColor);
    setBackground(current.backgroundColor ?? null);
    setActiveView(sides.find((side) => side.image.id === image.id)?.view ?? "front");
    setEdits(
      Object.fromEntries(
        sides.map((side) => {
          const setup = currentMockupSetup(side.image);
          return [
            side.view,
            setup.areas || setup.printArea
              ? {
                  templateId: setup.mockupTemplateId,
                  own: setup.areas ?? null,
                  movedMain: setup.printArea ?? null,
                }
              : null,
          ];
        })
      )
    );
    setRemovedViews([]);
    setActiveKey(MAIN_AREA_KEY);
    setScope("this");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set again only for another mock-up or once its sides are known
  }, [image, sideIds]);

  const main =
    listed?.find((item) => item.id === mainId) ??
    allListed?.find((item) => item.id === mainId) ??
    null;
  const photoOf = (view: MockupView) => (main ? templateForView(main, view) : null);
  const areasOf = (view: MockupView, own = true) => {
    const photo = photoOf(view);
    const layout = photo ? parsePrintLayout(photo.printAreaConfig) : null;
    if (!photo || !layout) return [];
    const mine = own && edits[view]?.templateId === photo.id ? edits[view] : null;
    return resolveMockupAreas(layout, mine?.own, mine?.movedMain);
  };
  // What a side is made with after the save; null when it is not made at all.
  const changeOf = (view: MockupView): MockupOverride | null => {
    const photo = photoOf(view);
    if (!photo || removedViews.includes(view)) return null;
    const areas = areasOf(view);
    const moved = !sameAreas(areas, areasOf(view, false));
    // One straight area printing the design is kept as a moved print area, as before there were several.
    const plainMove = areas.length === 1 && areas[0].rotation === 0 && areas[0].source === "same";
    return {
      mockupTemplateId: photo.id,
      garmentColor: photo.allowRecolor && photo.garmentMaskUrl ? garmentColor : null,
      backgroundColor: photo.allowBackground ? background : null,
      // Left where the template puts them, the design follows the template's print areas.
      printArea:
        moved && plainMove
          ? { x: areas[0].x, y: areas[0].y, width: areas[0].width, height: areas[0].height }
          : null,
      areas: moved && !plainMove ? areas.map((item) => ({ ...item, name: null })) : null,
    };
  };

  // What the save changes: each side that is made differently, or no longer made.
  const changes: MockupOverrideChange[] = sides.flatMap((side) => {
    const current = currentMockupSetup(side.image);
    const next = changeOf(side.view);
    if (!next)
      return [
        {
          slotKey: side.image.slotKey ?? "",
          replacedMockupImageId: side.image.id,
          override: { ...current, removed: true },
        },
      ];
    return sameSetup(next, current)
      ? []
      : [
          {
            slotKey: side.image.slotKey ?? "",
            replacedMockupImageId: side.image.id,
            override: next,
          },
        ];
  });
  const changedSides = changes.filter((change) => !change.override.removed);
  // Copied onto the job's other mock-ups on the same photos; this mock-up's own sides are changed above.
  const spread = (() => {
    const bySlot = new Map<string, MockupOverrideChange>();
    for (const change of changedSides) {
      const side = sides.find((item) => item.image.id === change.replacedMockupImageId);
      if (!side) continue;
      const targets = mockupsInScope(
        images,
        side.image,
        change.override.mockupTemplateId,
        scope
      ).filter((item) => !cardImageIds.has(item.id));
      for (const copy of spreadMockupChange(change.override, targets, templatesById))
        if (!bySlot.has(copy.slotKey)) bySlot.set(copy.slotKey, copy);
    }
    return [...bySlot.values()];
  })();
  // A second picture of the same thing is not made: the seller picks another color, or removes this one instead.
  const duplicate = (() => {
    for (const change of changedSides) {
      const side = sides.find((item) => item.image.id === change.replacedMockupImageId);
      const found = side
        ? findDuplicateMockup(images, side.image, change.override, spread, templatesById)
        : null;
      if (found) return found;
    }
    return null;
  })();
  const duplicateName = duplicate
    ? [
        templatesById.get(duplicate.setup.mockupTemplateId)?.name ?? "the same template",
        duplicate.setup.garmentColor ? garmentColorName(duplicate.setup.garmentColor) : null,
      ]
        .filter(Boolean)
        .join(" in ")
    : "";
  const keptSides = sides.filter((side) => changeOf(side.view) !== null);
  const printsNothing = keptSides.some((side) =>
    areasOf(side.view).every(
      (item) => item.source === "none" || (item.source === "design" && !item.designImageId)
    )
  );
  const missingSides = main ? sides.filter((side) => !photoOf(side.view)) : [];
  const mainPhotoIds = new Set(main ? [main.id, ...(main.views ?? []).map((side) => side.id)] : []);
  const othersOnTemplate = cards.filter(
    (other) =>
      other.key !== card?.key &&
      other.sides.some((side) => mainPhotoIds.has(currentMockupSetup(side.image).mockupTemplateId))
  ).length;

  const save = useMutation<GenerateAllMockupsResult, { removeAll: boolean }>({
    mutationFn: ({ removeAll }) => {
      const all = removeAll
        ? sides.map((side) => ({
            slotKey: side.image.slotKey ?? "",
            replacedMockupImageId: side.image.id,
            override: { ...currentMockupSetup(side.image), removed: true },
          }))
        : [...changes, ...spread];
      return all.length === 1
        ? saveMockupOverride(batchJobId, all[0])
        : saveMockupOverrides(batchJobId, all);
    },
    onSuccess: (result, { removeAll }) =>
      onSaved(result, removeAll ? sides.length : changes.length + spread.length),
  });
  // Each side made its own way goes back to the job's settings.
  const edited = sides.filter((side) => side.image.override && side.image.slotKey);
  const reset = useMutation<GenerateAllMockupsResult, void>({
    mutationFn: async () => {
      let result: GenerateAllMockupsResult | null = null;
      for (const side of edited)
        result = await resetMockupOverride(batchJobId, side.image.slotKey ?? "", side.image.id);
      return result!;
    },
    onSuccess: (result) => onSaved(result, edited.length),
  });
  const busy = save.isPending || reset.isPending;

  const chooseTemplate = (id: string) => {
    const next = listed?.find((item) => item.id === id);
    setMainId(id);
    setActiveKey(MAIN_AREA_KEY);
    // What the new template can't do is dropped.
    if (!next?.allowRecolor || !next.garmentMaskUrl) setGarmentColor(null);
    if (!next?.allowBackground) setBackground(null);
  };

  // The side being worked on.
  const photo = photoOf(activeView);
  const removed = removedViews.includes(activeView);
  const areas = areasOf(activeView);
  const movedAreas = !sameAreas(areas, areasOf(activeView, false));
  const activeIndex = Math.max(
    0,
    areas.findIndex((item) => item.key === activeKey)
  );
  const active = areas[activeIndex] ?? null;
  const setAreas = (next: MockupArea[]) =>
    photo &&
    setEdits((current) => ({
      ...current,
      [activeView]: { templateId: photo.id, own: next, movedMain: null },
    }));
  const imageFor = (item: MockupArea) =>
    item.source === "same"
      ? (designImageUrl ?? undefined)
      : item.source === "design"
        ? (designOptions.find((option) => option.id === item.designImageId)?.imageUrl ?? undefined)
        : undefined;
  const sideLabel = mockupViewLabel(activeView);
  const showSides = sides.length > 1;

  const scopes: { value: MockupChangeScope; label: string; count?: number }[] = [
    { value: "this", label: "This mock-up only" },
    { value: "template", label: "Mock-ups on this template", count: othersOnTemplate },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onOpenChange(false)}>
      <DialogContent className="flex h-[min(88dvh,780px)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>Edit this mock-up</DialogTitle>
          <DialogDescription>
            Changes the mock-up of “{productName}”{showSides ? " and its other sides" : ""}. The job
            keeps the changes when its mock-ups are made again.
          </DialogDescription>
        </DialogHeader>

        {isLoadingTemplates ? (
          <div className="flex flex-1 items-center justify-center">
            <SectionLoading label="Loading mock-up templates" />
          </div>
        ) : !listed || listed.length === 0 ? (
          <p className="text-muted-foreground flex-1 p-5 text-sm">
            No {productType ? productTypeLabel(productType) : ""} mock-up templates. Add one on the
            Mock-up Templates page first.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
            {/* The side's photo, as large as the dialog allows, with the sides under it. */}
            <section
              aria-label={`${sideLabel} photo`}
              className="flex min-h-0 flex-col gap-3 bg-slate-50 px-4 py-4 md:overflow-y-auto"
            >
              <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{sideLabel}</p>
                <div className="flex items-center gap-1.5">
                  {photo && !removed && movedAreas && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 bg-white px-2.5 text-xs"
                      disabled={busy}
                      onClick={() => setEdits((current) => ({ ...current, [activeView]: null }))}
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Template’s position
                    </Button>
                  )}
                  {showSides && photo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={
                        removed
                          ? "h-8 gap-1.5 bg-white px-2.5 text-xs"
                          : "h-8 gap-1.5 bg-white px-2.5 text-xs text-red-600 hover:text-red-700"
                      }
                      disabled={busy || (!removed && keptSides.length <= 1)}
                      onClick={() =>
                        setRemovedViews((current) =>
                          removed
                            ? current.filter((view) => view !== activeView)
                            : [...current, activeView]
                        )
                      }
                    >
                      {removed ? (
                        <Undo2 className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      )}
                      {removed ? "Keep side" : "Remove side"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center">
                {!photo ? (
                  <p className="text-muted-foreground my-auto max-w-sm text-center text-sm">
                    {main?.name ?? "This template"} has no {sideLabel.toLowerCase()} photo, so this
                    side is removed when you save. Pick a template with one to keep it.
                  </p>
                ) : removed ? (
                  <p className="text-muted-foreground my-auto max-w-sm text-center text-sm">
                    The {sideLabel.toLowerCase()} is removed when you save. Choose Keep side to make
                    it again.
                  </p>
                ) : active ? (
                  <div className="my-auto max-w-full">
                    <PrintAreaEditor
                      key={photo.id}
                      imageUrl={photo.baseImageUrl}
                      imageClassName="max-h-[max(10rem,calc(min(88dvh,780px)-22rem))]"
                      overlayImageUrl={imageFor(active)}
                      garmentMaskUrl={photo.garmentMaskUrl ?? undefined}
                      garmentTint={
                        garmentColor && photo.garmentMaskUrl
                          ? { color: garmentColor, maskUrl: photo.garmentMaskUrl }
                          : undefined
                      }
                      background={photo.allowBackground ? background : null}
                      value={active}
                      onChange={(next) =>
                        setAreas(
                          areas.map((item) =>
                            item.key === active.key
                              ? {
                                  ...item,
                                  x: next.x,
                                  y: next.y,
                                  width: next.width,
                                  height: next.height,
                                }
                              : item
                          )
                        )
                      }
                      rotation={active.rotation}
                      onRotationChange={(rotation) =>
                        setAreas(
                          areas.map((item) =>
                            item.key === active.key ? { ...item, rotation } : item
                          )
                        )
                      }
                      label={areaLabel(active, activeIndex)}
                      otherAreas={areas
                        .map((item, index) => ({
                          key: item.key,
                          label: areaLabel(item, index),
                          area: item,
                          rotation: item.rotation,
                          overlayImageUrl: imageFor(item),
                        }))
                        .filter((item) => item.key !== active.key)}
                      onSelectArea={setActiveKey}
                      disabled={busy}
                    />
                  </div>
                ) : null}
              </div>

              {showSides && (
                <div className="flex shrink-0 justify-center">
                  <MockupSidesStrip
                    active={activeView}
                    onSelect={(view) => {
                      setActiveView(view);
                      setActiveKey(MAIN_AREA_KEY);
                    }}
                    sides={sides.map((side) => ({
                      view: side.view,
                      thumbnail: side.image.mockupImageUrl,
                      muted: removedViews.includes(side.view) || !photoOf(side.view),
                    }))}
                  />
                </div>
              )}
            </section>

            {/* Settings beside the photo: the template, color and background go to every side. */}
            <aside className="space-y-4 border-t px-5 py-4 md:overflow-y-auto md:border-t-0 md:border-l">
              <div className="space-y-2">
                <Label htmlFor="mockup-edit-template">Template</Label>
                <Select value={mainId} onValueChange={chooseTemplate} disabled={busy}>
                  <SelectTrigger id="mockup-edit-template" className="w-full">
                    <SelectValue placeholder="Choose a mock-up template" />
                  </SelectTrigger>
                  <SelectContent>
                    {listed.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                        {item.views && item.views.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {item.views.length + 1} sides
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {main?.allowRecolor && main.garmentMaskUrl && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Garment color</p>
                    <p className="text-muted-foreground text-xs">
                      {showSides ? "On every side. " : ""}None keeps the photo’s own color.
                    </p>
                  </div>
                  <GarmentColorPicker
                    selected={garmentColor ? [garmentColor] : []}
                    disabled={busy}
                    onToggle={(hex) =>
                      setGarmentColor((current) =>
                        current?.toLowerCase() === hex.toLowerCase() ? null : hex
                      )
                    }
                  />
                </div>
              )}

              {main?.allowBackground && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    Background
                    {showSides ? (
                      <span className="text-muted-foreground font-normal"> · every side</span>
                    ) : null}
                  </p>
                  <MockupBackgroundPicker
                    value={background}
                    disabled={busy}
                    onChange={setBackground}
                  />
                </div>
              )}

              {photo && !removed && active && (
                <PrintAreaList
                  mode="mockup"
                  areas={areas}
                  activeKey={active.key}
                  onSelect={setActiveKey}
                  onChange={setAreas}
                  designs={designOptions.filter((option) => option.id !== image?.designImageId)}
                  ownDesignUrl={designImageUrl}
                  disabled={busy}
                />
              )}

              {main && othersOnTemplate > 0 && (
                <div className="space-y-2.5 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Apply to</p>
                    <p className="text-muted-foreground text-xs">
                      Copies the background and each side’s design position. Each mock-up keeps its
                      own garment color.
                    </p>
                  </div>
                  <RadioGroup
                    value={scope}
                    onValueChange={(next) => isMockupChangeScope(next) && setScope(next)}
                    disabled={busy}
                    className="gap-2"
                  >
                    {scopes.map((item) => (
                      <label
                        key={item.value}
                        htmlFor={`mockup-edit-scope-${item.value}`}
                        className="flex cursor-pointer items-center gap-2.5 text-sm"
                      >
                        <RadioGroupItem
                          id={`mockup-edit-scope-${item.value}`}
                          value={item.value}
                          disabled={item.count === 0}
                        />
                        <span className={item.count === 0 ? "text-muted-foreground" : undefined}>
                          {item.label}
                          {item.count !== undefined && (
                            <span className="text-muted-foreground"> · {item.count} more</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  {scope !== "this" && (
                    <p className="text-muted-foreground text-xs" aria-live="polite">
                      {spread.length === 0
                        ? "The other mock-ups already look like this, so only this one is saved."
                        : `${spread.length} other mock-up${spread.length === 1 ? "" : "s"} will change.`}
                    </p>
                  )}
                </div>
              )}

              {missingSides.length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {main?.name} has no{" "}
                  {missingSides
                    .map((side) => mockupViewLabel(side.view).toLowerCase())
                    .join(" or ")}{" "}
                  photo: that side is removed when you save.
                </p>
              )}

              {duplicate && (
                <p
                  role="alert"
                  className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
                >
                  This would look exactly like another mock-up of this design ({duplicateName}).
                  Choose another garment color, or remove this mock-up instead.
                </p>
              )}
            </aside>
          </div>
        )}

        <DialogFooter className="flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {edited.length > 0 && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => reset.mutate()}>
              {reset.isPending ? "Resetting…" : "Use the job’s settings"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={busy || sides.some((side) => !side.image.slotKey)}
            onClick={() => save.mutate({ removeAll: true })}
          >
            {showSides ? "Remove all sides" : "Remove this mock-up"}
          </Button>
          <Button
            type="button"
            disabled={
              busy ||
              !main ||
              changes.some((change) => !change.slotKey) ||
              duplicate !== null ||
              printsNothing
            }
            onClick={() =>
              changes.length === 0 ? onOpenChange(false) : save.mutate({ removeAll: false })
            }
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
