"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  resetMockupOverride,
  saveMockupOverride,
  saveMockupOverrides,
} from "@/api/mockup-templates";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { GarmentColorPicker, GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import {
  MockupBackgroundPicker,
  MockupBackgroundSwatch,
} from "@/components/mockups/mockup-background-picker";
import { MockupKindBadge } from "@/components/mockups/mockup-kind-badge";
import { MockupPhotoPreview } from "@/components/mockups/mockup-photo-preview";
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
import { carryColors, garmentColorName, MAX_GARMENT_COLORS, printifyStartColors } from "@/helpers/garment-colors";
import { DEFAULT_BACKGROUND_KEY } from "@/helpers/mockup-backgrounds";
import {
  currentMockupSetup,
  findDuplicateAfterChanges,
  isMockupChangeScope,
  type MockupChangeScope,
  type MockupOverrideChange,
  samePrintArea,
  spreadMockupChange,
} from "@/helpers/mockup-overrides";
import {
  cardColor,
  cardOfMockup,
  colorGroupKey,
  colorGroupOfMockup,
  compactId,
  groupMockupColors,
  groupMockupSides,
  type MockupCard,
  type MockupSide,
  sideOfTemplate,
  slotSide,
  templateForView,
  templateSidesIndex,
  viewOrder,
} from "@/helpers/mockup-sides";
import {
  areaLabel,
  keepInFrame,
  MAIN_AREA_KEY,
  mockupViewLabel,
  parsePrintifyFrame,
  parsePrintLayout,
  productTypeLabel,
  resolveMockupAreas,
  sameAreas,
  templateView,
  withTemplatePlacement,
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
  RemovedMockupSlot,
  TemplatePlacements,
} from "@/types/mockup-templates";

type MockupImageEditDialogProps = {
  batchJobId: string;
  /** The mock-up being changed; the dialog is open while there is one. Its other colors and sides are changed with it. */
  image: MockupImage | null;
  /** All of the job's mock-ups: the background and design position can be copied onto those of the same template, and none may end up the same as another. */
  images: MockupImage[];
  productName: string;
  productType: string;
  /** The design on the mock-up, shown in the print area while it is moved. */
  designImageUrl: string | null;
  /** The job's other designs, which a print area such as a sleeve can print instead. */
  designOptions?: AreaDesignOption[];
  /** The job's removed mock-ups: a color of this mock-up removed before can be ticked again, and its removed sides follow a change of template, color or background. */
  removedSlots?: RemovedMockupSlot[];
  onOpenChange: (open: boolean) => void;
  /** The job's mock-ups, made again with the change, and how many mock-ups it changed. */
  onSaved: (result: GenerateAllMockupsResult, changedCount: number) => void;
  /** The mock-ups are for a Printify product: only templates linked to Printify can be chosen. */
  printifyOnly?: boolean;
  /** Where the job puts the design on its templates: a mock-up not moved on its own is shown there. */
  templatePlacements?: TemplatePlacements | null;
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

// The key a garment color's background is kept under; the photo's own color has the default one.
const backgroundKey = (color: string | null | undefined) =>
  color ? color.toUpperCase() : DEFAULT_BACKGROUND_KEY;

const sameSetup = (left: MockupOverride, right: MockupOverride) =>
  left.mockupTemplateId === right.mockupTemplateId &&
  sameColor(left.garmentColor, right.garmentColor) &&
  sameColor(left.backgroundColor, right.backgroundColor) &&
  samePrintArea(left.printArea ?? null, right.printArea ?? null) &&
  sameAreas(left.areas ?? null, right.areas ?? null);

// Changes one design's mock-up on one template apart from the job's settings, in all its garment colors and with its
// other sides (front, back, sleeves): each color ticked is one mock-up, a color added here is made beside the job's,
// and one unticked is removed. The template and background are shared by the colors and sides, and each side's design
// sits on its own photo. The background and design position can be copied onto the job's other mock-ups of the same
// template in the same save. A change that would make two mock-ups alike is not saved. The job keeps the changes, so
// making the job's mock-ups again does not undo them.
export const MockupImageEditDialog = ({
  batchJobId,
  image,
  images,
  productName,
  productType,
  designImageUrl,
  designOptions = [],
  removedSlots = [],
  onOpenChange,
  onSaved,
  printifyOnly = false,
  templatePlacements,
}: MockupImageEditDialogProps) => {
  const { t } = useTranslation("common");
  const open = image !== null;
  // Only templates for this product's own type: any other is refused. The photos of their other sides come with them.
  const { data: typeTemplates, isPending: isLoadingTemplates } = useMockupTemplates(
    productType || undefined,
    open
  );
  // For a Printify product, only the templates that show a Printify product.
  const listed = printifyOnly ? typeTemplates?.filter((item) => item.printify) : typeTemplates;
  // Every template, to know which of the other mock-ups' templates can take a background, and the sides of each.
  const { data: allListed } = useMockupTemplates(undefined, open);
  const allTemplates = allListed ? withViewTemplates(allListed) : [];
  const templatesById = new Map(allTemplates.map((item) => [item.id, item]));
  const sidesIndex = templateSidesIndex(allListed ?? []);
  const cards = groupMockupSides(images, sidesIndex);
  const groups = groupMockupColors(cards);
  // The color the mock-up is in: its sides are the ones shown and moved here.
  const card = image ? cardOfMockup(cards, image.id) : null;
  const sides: MockupSide[] = card?.sides ?? (image ? [{ view: "front", image }] : []);
  // Every color of the design on this template: the template, background and design position go to all of them.
  const group = image ? colorGroupOfMockup(groups, image.id) : null;
  const colorCards: MockupCard[] =
    group?.colors ?? (card ? [card] : sides.length > 0 ? [{ key: sides[0].image.id, sides }] : []);
  const groupImages = colorCards.flatMap((item) => item.sides.map((side) => side.image));
  const groupImageIds = new Set(groupImages.map((item) => item.id));
  const imagesBySlot = new Map(
    groupImages.flatMap((item) => (item.slotKey ? [[item.slotKey, item] as const] : []))
  );
  // The job's removed mock-ups of this design on this template, in any color.
  const groupRemoved = group
    ? removedSlots.filter((slot) => {
        const side = slotSide(slot.productId, slot.slotKey, sidesIndex);
        return side !== null && colorGroupKey(side.cardKey) === group.key;
      })
    : [];

  const [mainId, setMainId] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [shownColor, setShownColor] = useState<string | null>(null);
  // Each garment color has its own background, as the job gives it, by `backgroundKey`.
  const [backgrounds, setBackgrounds] = useState<Record<string, string | null>>({});
  // The colors whose background was changed here; the others keep each side's own.
  const [touchedBackgrounds, setTouchedBackgrounds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<MockupView>("front");
  const [edits, setEdits] = useState<Partial<Record<MockupView, EditedAreas | null>>>({});
  // The sides whose design position was changed here; on the others each color keeps its own.
  const [touchedViews, setTouchedViews] = useState<MockupView[]>([]);
  const [removedViews, setRemovedViews] = useState<MockupView[]>([]);
  const [activeKey, setActiveKey] = useState(MAIN_AREA_KEY);
  const [scope, setScope] = useState<MockupChangeScope>("this");

  // Starts from how the mock-up, its other colors and its other sides are made now. Set again once the templates
  // are known, which tells which mock-ups go together.
  const groupIds = groupImages.map((item) => item.id).join("|");
  useEffect(() => {
    if (!image) return;
    const current = currentMockupSetup(image);
    const startMainId =
      sideOfTemplate(sidesIndex, current.mockupTemplateId)?.mainId ?? current.mockupTemplateId;
    setMainId(startMainId);
    setColors(
      colorCards
        .map((item) => cardColor(item))
        .filter((hex): hex is string => hex !== null)
        .filter((hex, index, all) => all.findIndex((other) => sameColor(other, hex)) === index)
    );
    setShownColor(current.garmentColor);
    setBackgrounds(
      Object.fromEntries(
        colorCards.map((item) => {
          const shown = item.sides.find((side) => side.image.id === image.id) ?? item.sides[0];
          return [
            backgroundKey(cardColor(item)),
            currentMockupSetup(shown.image).backgroundColor ?? null,
          ];
        })
      )
    );
    setTouchedBackgrounds([]);
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
    setTouchedViews([]);
    setRemovedViews([]);
    setActiveKey(MAIN_AREA_KEY);
    setScope("this");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set again only for another mock-up or once the mock-ups that go with it are known
  }, [image, groupIds]);

  const main =
    listed?.find((item) => item.id === mainId) ??
    allListed?.find((item) => item.id === mainId) ??
    null;
  const recolorable = Boolean(main?.allowRecolor && main.garmentMaskUrl);
  // One mock-up per color ticked; none ticked, or a template that can't be recolored, makes one in the photo's own.
  const targetColors: (string | null)[] = recolorable && colors.length > 0 ? colors : [null];
  // The color the photo is shown in while it is worked on.
  const previewColor = recolorable
    ? (colors.find((hex) => sameColor(hex, shownColor)) ?? colors[0] ?? null)
    : null;
  const photoOf = (view: MockupView) => (main ? templateForView(main, view) : null);
  // Printify prints a side only inside its own print area, measured on that side's photo.
  const printifyFrameOf = (view: MockupView) => {
    const sidePhoto = main?.printify ? photoOf(view) : null;
    return sidePhoto ? parsePrintifyFrame(sidePhoto.printAreaConfig) : null;
  };
  // A position saved before its side was held to that print area.
  const isPastFrame = (view: MockupView, setup: MockupOverride) => {
    const frame = printifyFrameOf(view);
    const area = setup.areas?.find((item) => item.key === MAIN_AREA_KEY);
    const box = area ?? setup.printArea;
    if (!frame || !box) return false;
    const fitted = keepInFrame(box, area?.rotation ?? 0, frame);
    return !fitted || Math.abs(fitted.x - box.x) > 1 || Math.abs(fitted.y - box.y) > 1;
  };
  // The chosen template's other sides this mock-up was not made with (it was made on a template with fewer): shown,
  // and made beside it when saved.
  const addedViews: MockupView[] = main
    ? (main.views ?? []).map((side) => templateView(side)).filter((view) => !sides.some((side) => side.view === view))
    : [];
  const areasOf = (view: MockupView, own = true) => {
    const photo = photoOf(view);
    const layout = photo ? parsePrintLayout(photo.printAreaConfig) : null;
    if (!photo || !layout) return [];
    const mine = own && edits[view]?.templateId === photo.id ? edits[view] : null;
    const placedLayout = withTemplatePlacement(layout, templatePlacements?.[photo.id]);
    const resolved = resolveMockupAreas(placedLayout, mine?.own, mine?.movedMain);
    const frame = printifyFrameOf(view);
    if (!frame || !mine) return resolved;
    // Moved inside Printify's print area, or back where the template puts it when it is too big to fit.
    const start = resolveMockupAreas(placedLayout, null, null).find((item) => item.key === MAIN_AREA_KEY);
    return resolved.map((item) => {
      if (item.key !== MAIN_AREA_KEY) return item;
      const fitted = keepInFrame(item, item.rotation, frame);
      return fitted ? { ...item, ...fitted } : (start ?? item);
    });
  };
  // The background of a side in one garment color: its own until that color's is changed here; a color new here
  // starts with the photo's own.
  const backgroundFor = (color: string | null, own: MockupOverride | null) => {
    const key = backgroundKey(color);
    return !touchedBackgrounds.includes(key) && own
      ? (own.backgroundColor ?? null)
      : (backgrounds[key] ?? null);
  };
  // How a side is made in one color with the choices made here, starting from how it is made now (`base`): what was
  // not changed here stays as that color has it. Null when the template has no photo of that side.
  const setupFor = (
    view: MockupView,
    color: string | null,
    base: MockupOverride | null
  ): MockupOverride | null => {
    const photo = photoOf(view);
    if (!photo) return null;
    const own = base !== null && base.mockupTemplateId === photo.id ? base : null;
    let printArea: MockupPrintArea | null = null;
    let areas: MockupArea[] | null = null;
    if (own && !touchedViews.includes(view) && !isPastFrame(view, own)) {
      printArea = own.printArea ?? null;
      areas = own.areas ?? null;
    } else {
      const placed = areasOf(view);
      const startingAreas = areasOf(view, false);
      const moved = !sameAreas(placed, startingAreas);
      // One straight area printing the design is kept as a moved print area, as before there were several. Straightened
      // from a turn the job gave it, it needs its areas: a moved print area keeps the turn it started with.
      const plainMove =
        placed.length === 1 && placed[0].rotation === 0 && placed[0].source === "same" && startingAreas[0]?.rotation === 0;
      // Left where the template puts them, the design follows the template's print areas.
      printArea =
        moved && plainMove
          ? { x: placed[0].x, y: placed[0].y, width: placed[0].width, height: placed[0].height }
          : null;
      areas = moved && !plainMove ? placed.map((item) => ({ ...item, name: null })) : null;
    }
    return {
      mockupTemplateId: photo.id,
      garmentColor: photo.allowRecolor && photo.garmentMaskUrl ? color : null,
      backgroundColor: photo.allowBackground ? backgroundFor(color, own) : null,
      printArea,
      areas,
    };
  };

  // Slot keys read "design.template.color": the slots of this design on this template, by their color part.
  const slotParts = (slotKey: string | null | undefined) => slotKey?.split(".") ?? [];
  const designPart = slotParts(
    groupImages.find((item) => item.slotKey)?.slotKey ?? groupRemoved[0]?.slotKey
  )[0];
  const templatePartByView = new Map<MockupView, string>();
  for (const { productId, slotKey } of [...groupImages, ...groupRemoved]) {
    const side = slotSide(productId, slotKey, sidesIndex);
    if (side && !templatePartByView.has(side.view))
      templatePartByView.set(side.view, slotParts(slotKey)[1]);
  }
  const colorPartOf = (color: string | null) =>
    color ? color.replace("#", "").toUpperCase() : "own";
  const slots = new Map<string, { card: MockupCard | null; removed: RemovedMockupSlot[] }>();
  for (const item of colorCards) {
    const part = slotParts(item.sides[0]?.image.slotKey)[2];
    if (part) slots.set(part, { card: item, removed: [] });
  }
  for (const slot of groupRemoved) {
    const part = slotParts(slot.slotKey)[2];
    const entry = slots.get(part) ?? { card: null, removed: [] };
    entry.removed.push(slot);
    slots.set(part, entry);
  }
  // Each color ticked gets a slot: its own when there is one; else that of a color no longer ticked, or of one
  // removed before; else a new one is made for it.
  const assigned: { color: string | null; part: string }[] = [];
  {
    const used = new Set<string>();
    const left: (string | null)[] = [];
    for (const color of targetColors) {
      const part = colorPartOf(color);
      if (slots.has(part) && !used.has(part)) {
        assigned.push({ color, part });
        used.add(part);
      } else left.push(color);
    }
    const free = [...slots.entries()]
      .filter(([part]) => !used.has(part))
      .sort(([, a], [, b]) => Number(b.card !== null) - Number(a.card !== null))
      .map(([part]) => part);
    for (const color of left) assigned.push({ color, part: free.shift() ?? colorPartOf(color) });
  }
  const assignedParts = new Set(assigned.map((item) => item.part));
  const referenceViews = sides.map((side) => side.view);
  // A side of the chosen template's own photo slot, for a side this mock-up was not made with.
  const addedTemplatePart = (view: MockupView) => {
    const photo = addedViews.includes(view) && main ? templateForView(main, view) : null;
    return photo ? compactId(photo.id) : undefined;
  };
  const removedBase = (slot: RemovedMockupSlot): MockupOverride => ({
    mockupTemplateId: slot.override?.mockupTemplateId ?? slot.mockupTemplateId,
    garmentColor: slot.override ? slot.override.garmentColor : slot.garmentColor,
    backgroundColor: slot.override?.backgroundColor ?? null,
    printArea: slot.override?.printArea ?? null,
    areas: slot.override?.areas ?? null,
  });

  // What the save changes, color by color and side by side.
  const changes: MockupOverrideChange[] = [];
  for (const { color, part } of assigned) {
    const entry = slots.get(part);
    const made = Boolean(entry?.card);
    const ownViews = [
      ...(entry?.card?.sides.map((side) => side.view) ?? []),
      ...(entry?.removed.flatMap(
        (slot) => slotSide(slot.productId, slot.slotKey, sidesIndex)?.view ?? []
      ) ?? []),
    ];
    // A color made now keeps all its sides; one made anew gets the sides of the mock-up being edited. Every color
    // gets the chosen template's sides the mock-up does not have yet.
    const views = [...new Set([...referenceViews, ...ownViews, ...addedViews])].filter(
      (view) => made || referenceViews.includes(view) || addedViews.includes(view)
    );
    for (const view of views) {
      const templatePart = templatePartByView.get(view) ?? addedTemplatePart(view);
      if (!designPart || !templatePart) continue;
      const slotKey = `${designPart}.${templatePart}.${part}`;
      const current = imagesBySlot.get(slotKey);
      const removedSlot = entry?.removed.find((slot) => slot.slotKey === slotKey);
      const base = current
        ? currentMockupSetup(current)
        : removedSlot
          ? removedBase(removedSlot)
          : null;
      const look = setupFor(view, color, base);
      const kept = look !== null && !removedViews.includes(view);
      if (current && base) {
        if (!kept)
          changes.push({
            slotKey,
            replacedMockupImageId: current.id,
            override: { ...(look ?? base), removed: true },
          });
        else if (!sameSetup(look, base))
          changes.push({ slotKey, replacedMockupImageId: current.id, override: look });
      } else if (removedSlot && base && made) {
        // A side removed before stays removed, but takes the color, template and background chosen here, so
        // putting it back gives it the same look as the others.
        if (look && !sameSetup(look, base))
          changes.push({
            slotKey,
            replacedMockupImageId: null,
            override: { ...look, removed: true },
          });
      } else if (kept) {
        // A color added here, or one removed before and ticked again.
        changes.push({ slotKey, replacedMockupImageId: null, override: look });
      }
    }
  }
  // A color no longer ticked: every side of it goes.
  for (const [part, entry] of slots)
    if (!assignedParts.has(part) && entry.card)
      for (const side of entry.card.sides)
        changes.push({
          slotKey: side.image.slotKey ?? "",
          replacedMockupImageId: side.image.id,
          override: { ...currentMockupSetup(side.image), removed: true },
        });

  // Copied onto the job's other mock-ups on the same photos; this design's own colors and sides are changed above.
  // Each takes the background of its own garment color; one in a color not ticked here takes the color shown.
  const spread = (() => {
    if (scope === "this") return [];
    const bySlot = new Map<string, MockupOverrideChange>();
    for (const change of changes) {
      if (change.override.removed) continue;
      const changeColor = change.override.garmentColor;
      const targets = images.filter((item) => {
        const setup = currentMockupSetup(item);
        const itemColor = setup.garmentColor;
        const ownColor = targetColors.some((hex) => sameColor(hex, itemColor));
        return (
          Boolean(item.slotKey) &&
          !groupImageIds.has(item.id) &&
          setup.mockupTemplateId === change.override.mockupTemplateId &&
          (ownColor ? sameColor(itemColor, changeColor) : sameColor(changeColor, previewColor))
        );
      });
      for (const copy of spreadMockupChange(change.override, targets, templatesById))
        if (!bySlot.has(copy.slotKey)) bySlot.set(copy.slotKey, copy);
    }
    return [...bySlot.values()];
  })();
  // A second picture of the same thing is not made: the seller picks another color, or removes this one instead.
  const duplicate = image
    ? findDuplicateAfterChanges(images, image.designImageId, [...changes, ...spread], templatesById)
    : null;
  const duplicateName = duplicate
    ? [
        templatesById.get(duplicate.setup.mockupTemplateId)?.name ?? "the same template",
        duplicate.setup.garmentColor ? garmentColorName(duplicate.setup.garmentColor, main?.printify?.colors) : null,
      ]
        .filter(Boolean)
        .join(" in ")
    : "";
  const keptSides = sides.filter((side) => !removedViews.includes(side.view) && photoOf(side.view));
  const printsNothing = keptSides.some((side) =>
    areasOf(side.view).every(
      (item) => item.source === "none" || (item.source === "design" && !item.designImageId)
    )
  );
  const missingSides = main ? sides.filter((side) => !photoOf(side.view)) : [];
  // The colors go to every side; one whose photo can't be recolored keeps its own, and is named.
  const unrecolorableSides =
    recolorable && colors.length > 0
      ? keptSides.filter((side) => {
          const sidePhoto = photoOf(side.view);
          return sidePhoto && !(sidePhoto.allowRecolor && sidePhoto.garmentMaskUrl);
        })
      : [];
  const mainPhotoIds = new Set(main ? [main.id, ...(main.views ?? []).map((side) => side.id)] : []);
  const othersOnTemplate = groups.filter(
    (other) =>
      other.key !== group?.key &&
      other.colors.some((item) =>
        item.sides.some((side) => mainPhotoIds.has(currentMockupSetup(side.image).mockupTemplateId))
      )
  ).length;

  const save = useMutation<GenerateAllMockupsResult, { removeAll: boolean }>({
    mutationFn: ({ removeAll }) => {
      const all = removeAll
        ? groupImages.map((item) => ({
            slotKey: item.slotKey ?? "",
            replacedMockupImageId: item.id,
            override: { ...currentMockupSetup(item), removed: true },
          }))
        : [...changes, ...spread];
      return all.length === 1
        ? saveMockupOverride(batchJobId, all[0])
        : saveMockupOverrides(batchJobId, all);
    },
    onSuccess: (result, { removeAll }) =>
      onSaved(result, removeAll ? groupImages.length : changes.length + spread.length),
  });
  // Each mock-up made its own way goes back to the job's settings; a color added here alone goes.
  const edited = groupImages.filter((item) => item.override && item.slotKey);
  const reset = useMutation<GenerateAllMockupsResult, void>({
    mutationFn: async () => {
      let result: GenerateAllMockupsResult | null = null;
      for (const item of edited)
        result = await resetMockupOverride(batchJobId, item.slotKey ?? "", item.id);
      return result!;
    },
    onSuccess: (result) => onSaved(result, edited.length),
  });
  const busy = save.isPending || reset.isPending;

  const chooseTemplate = (id: string) => {
    const next = listed?.find((item) => item.id === id);
    setMainId(id);
    setActiveKey(MAIN_AREA_KEY);
    // The sides offered are the new template's: on a side it has no photo of, the front is shown instead (a note says
    // a side the mock-up had is removed when saved).
    if (next && !templateForView(next, activeView)) setActiveView("front");
    // What the new template can't do is dropped.
    if (!next?.allowRecolor || !next.garmentMaskUrl) {
      setColors([]);
      return;
    }
    if (!next.printify) return;
    // A Printify template is made only in its own Printify colors: each color goes over by name (its hex differs
    // from one blueprint to another), with the background it had; one the template lacks is dropped.
    const pairs = carryColors(colors, main?.printify?.colors, next.printify.colors);
    const carried = pairs.length > 0 ? pairs.map((pair) => pair.to) : printifyStartColors(next);
    const renamed = (hex: string | null | undefined) => pairs.find((pair) => sameColor(pair.from, hex))?.to ?? null;
    setColors(carried);
    setShownColor(renamed(shownColor) ?? carried[0] ?? null);
    setBackgrounds((current) => {
      const moved = { ...current };
      for (const pair of pairs) {
        const from = backgroundKey(pair.from);
        if (from in current) moved[backgroundKey(pair.to)] = current[from];
      }
      return moved;
    });
    setTouchedBackgrounds((current) =>
      current.map((key) => {
        const pair = pairs.find((item) => backgroundKey(item.from) === key);
        return pair ? backgroundKey(pair.to) : key;
      })
    );
  };
  const toggleColor = (hex: string) => {
    const has = colors.some((item) => sameColor(item, hex));
    setColors((current) =>
      has ? current.filter((item) => !sameColor(item, hex)) : [...current, hex]
    );
    // A color just ticked is the one shown.
    if (!has) setShownColor(hex);
  };

  // The side being worked on, in the color shown.
  const photo = photoOf(activeView);
  const removed = removedViews.includes(activeView);
  const areas = areasOf(activeView);
  const movedAreas = !sameAreas(areas, areasOf(activeView, false));
  const activeIndex = Math.max(
    0,
    areas.findIndex((item) => item.key === activeKey)
  );
  const active = areas[activeIndex] ?? null;
  const touch = (view: MockupView) =>
    setTouchedViews((current) => (current.includes(view) ? current : [...current, view]));
  const setAreas = (next: MockupArea[]) => {
    if (!photo) return;
    touch(activeView);
    setEdits((current) => ({
      ...current,
      [activeView]: { templateId: photo.id, own: next, movedMain: null },
    }));
  };
  // The mock-up of the color shown, side by side; none for a color added here.
  const previewCard = colorCards.find((item) => sameColor(cardColor(item), previewColor));
  const shownImage = (side: MockupSide) =>
    previewCard ? (previewCard.sides.find((item) => item.view === side.view)?.image ?? null) : null;
  // How a side looks in the color shown, with the choices made here: from that color's own mock-up, so its own
  // background and design position show until they are changed, or as a color added here is made.
  const shownLook = (side: MockupSide) => {
    const own = shownImage(side);
    return setupFor(side.view, previewColor, own ? currentMockupSetup(own) : null);
  };
  const activeSide = sides.find((side) => side.view === activeView);
  // A side added here has no mock-up yet: it is shown as it will be made.
  const activeLook = activeSide
    ? shownLook(activeSide)
    : addedViews.includes(activeView)
      ? setupFor(activeView, previewColor, null)
      : sides[0]
        ? shownLook(sides[0])
        : null;
  const imageFor = (item: MockupArea) =>
    item.source === "same"
      ? (designImageUrl ?? undefined)
      : item.source === "design"
        ? (designOptions.find((option) => option.id === item.designImageId)?.imageUrl ?? undefined)
        : undefined;
  const sideLabel = mockupViewLabel(activeView);
  // The sides shown are those of the template chosen, whichever template the mock-up was made on: one the template has
  // no photo of is left out (a note says it is removed when saved), and one it adds is shown.
  const shownSides = sides.filter((side) => photoOf(side.view));
  const showSides = shownSides.length + addedViews.length > 1;
  const showColors = colorCards.length > 1;
  // Each side of a Printify template keeps Printify's print area: it stays put and the design moves inside it, starting
  // where the template puts it.
  const printifyArea = printifyFrameOf(activeView);
  const printifyFrame = active?.key === MAIN_AREA_KEY ? printifyArea : null;
  // Typed positions are held to the Printify print area too; one that cannot fit in it is not taken.
  const setAreasInFrame = (next: MockupArea[]) => {
    if (!printifyArea) return setAreas(next);
    const kept = next.map((item) => {
      if (item.key !== MAIN_AREA_KEY) return item;
      const fitted = keepInFrame(item, item.rotation, printifyArea);
      return fitted ? { ...item, ...fitted } : null;
    });
    if (kept.every((item): item is MockupArea => item !== null)) setAreas(kept);
  };

  const scopes: { value: MockupChangeScope; label: string; count?: number }[] = [
    { value: "this", label: t("batchJobs.editMockup.scopeThis") },
    { value: "template", label: t("batchJobs.editMockup.scopeTemplate"), count: othersOnTemplate },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onOpenChange(false)}>
      <DialogContent className="flex h-[min(88dvh,780px)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>{t("batchJobs.editMockup.title")}</DialogTitle>
          <DialogDescription>
            {t(
              showColors && showSides
                ? "batchJobs.editMockup.descriptionColorsSides"
                : showColors
                  ? "batchJobs.editMockup.descriptionColors"
                  : showSides
                    ? "batchJobs.editMockup.descriptionSides"
                    : "batchJobs.editMockup.description",
              { name: productName }
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoadingTemplates ? (
          <div className="flex flex-1 items-center justify-center">
            <SectionLoading label={t("batchJobs.editMockup.loadingTemplates")} />
          </div>
        ) : !listed || listed.length === 0 ? (
          <p className="text-muted-foreground flex-1 p-5 text-sm">
            {productType
              ? t("batchJobs.editMockup.noTypeTemplates", { type: productTypeLabel(productType) })
              : t("batchJobs.editMockup.noTemplates")}
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
            {/* The side's photo, as large as the dialog allows, with the sides under it. */}
            <section
              aria-label={t("batchJobs.editMockup.sidePhoto", { side: sideLabel })}
              className="bg-ink-50 flex flex-col gap-3 px-4 py-4 md:min-h-0 md:overflow-y-auto"
            >
              <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
                <p className="text-ink-900 text-sm font-semibold">{sideLabel}</p>
                <div className="flex items-center gap-1.5">
                  {photo && !removed && movedAreas && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-card h-8 gap-1.5 px-2.5 text-xs"
                      disabled={busy}
                      onClick={() => {
                        touch(activeView);
                        setEdits((current) => ({ ...current, [activeView]: null }));
                      }}
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {t("batchJobs.editMockup.templatePosition")}
                    </Button>
                  )}
                  {showSides && photo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={
                        removed
                          ? "bg-card h-8 gap-1.5 px-2.5 text-xs"
                          : "bg-card h-8 gap-1.5 px-2.5 text-xs text-red-600 hover:text-red-700"
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
                      {removed ? t("batchJobs.editMockup.keepSide") : t("batchJobs.editMockup.removeSide")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center">
                {!photo ? (
                  <p className="text-muted-foreground my-auto max-w-sm text-center text-sm">
                    {t("batchJobs.editMockup.noSidePhoto", {
                      template: main?.name ?? t("batchJobs.editMockup.thisTemplate"),
                      side: sideLabel.toLowerCase(),
                    })}
                  </p>
                ) : removed ? (
                  <p className="text-muted-foreground my-auto max-w-sm text-center text-sm">
                    {t("batchJobs.editMockup.sideRemoved", { side: sideLabel.toLowerCase() })}
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
                        activeLook?.garmentColor && photo.garmentMaskUrl
                          ? { color: activeLook.garmentColor, maskUrl: photo.garmentMaskUrl }
                          : undefined
                      }
                      background={activeLook?.backgroundColor ?? null}
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
                      frame={
                        printifyFrame
                          ? {
                              x: printifyFrame.x,
                              y: printifyFrame.y,
                              width: printifyFrame.width,
                              height: printifyFrame.height,
                            }
                          : undefined
                      }
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
                    sides={[
                      ...shownSides.map((side) => {
                        const sidePhoto = photoOf(side.view)!;
                        // The saved mock-up while it still matches; once the color, background or template
                        // changes, the side's photo with the new settings, so every side shows the change.
                        const next = shownLook(side);
                        const shownSide = shownImage(side);
                        const current = currentMockupSetup(shownSide ?? side.image);
                        const sideStale =
                          next !== null &&
                          (next.mockupTemplateId !== current.mockupTemplateId ||
                            !sameColor(next.garmentColor, current.garmentColor) ||
                            !sameColor(next.backgroundColor, current.backgroundColor));
                        return {
                          view: side.view,
                          thumbnail: (shownSide ?? side.image).mockupImageUrl,
                          preview:
                            (sideStale || !shownSide) && next ? (
                              <MockupPhotoPreview
                                photo={sidePhoto}
                                garmentColor={next.garmentColor}
                                background={next.backgroundColor}
                              />
                            ) : undefined,
                          removed: removedViews.includes(side.view),
                        };
                      }),
                      // The chosen template's other sides this mock-up does not have yet: made when saved.
                      ...addedViews.map((view) => {
                        const sidePhoto = photoOf(view);
                        const next = setupFor(view, previewColor, null);
                        return {
                          view,
                          thumbnail: null,
                          preview:
                            sidePhoto && next ? (
                              <MockupPhotoPreview
                                photo={sidePhoto}
                                garmentColor={next.garmentColor}
                                background={next.backgroundColor}
                              />
                            ) : undefined,
                          title: t("batchJobs.editMockup.addedOnSave", { side: mockupViewLabel(view) }),
                          removed: removedViews.includes(view),
                        };
                      }),
                    ].sort((a, b) => viewOrder(a.view) - viewOrder(b.view))}
                  />
                </div>
              )}
            </section>

            {/* Settings beside the photo: the template, color and background go to every side. */}
            <aside className="space-y-4 border-t px-5 py-4 md:overflow-y-auto md:border-t-0 md:border-l">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="mockup-edit-template">{t("batchJobs.editMockup.template")}</Label>
                  {main && <MockupKindBadge template={main} />}
                </div>
                <Select value={mainId} onValueChange={chooseTemplate} disabled={busy}>
                  <SelectTrigger id="mockup-edit-template" className="w-full">
                    <SelectValue placeholder={t("batchJobs.editMockup.chooseTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {listed.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                        {item.views && item.views.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {t("batchJobs.editMockup.sidesCount", { count: item.views.length + 1 })}
                          </span>
                        )}
                        <MockupKindBadge template={item} className="ml-1" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {printifyOnly && !main?.printify && (
                  <p className="text-xs text-amber-700">
                    {t("batchJobs.editMockup.printifyOnly")}
                  </p>
                )}
              </div>

              {recolorable && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t("batchJobs.mockups.garmentColors")}</p>
                    <p className="text-muted-foreground text-xs">
                      {showSides ? t("batchJobs.editMockup.colorsHintSides") : t("batchJobs.editMockup.colorsHint")}
                    </p>
                  </div>
                  <GarmentColorPicker
                    selected={colors}
                    max={MAX_GARMENT_COLORS}
                    disabled={busy}
                    onToggle={toggleColor}
                    palette={main?.printify?.colors}
                    allowCustom={!main?.printify}
                  />
                  {colors.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{t("batchJobs.editMockup.shownIn")}</span>
                      {colors.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          aria-pressed={sameColor(hex, previewColor)}
                          aria-label={t("batchJobs.mockups.showIn", { name: garmentColorName(hex, main?.printify?.colors) })}
                          title={garmentColorName(hex, main?.printify?.colors)}
                          disabled={busy}
                          onClick={() => setShownColor(hex)}
                          className={
                            sameColor(hex, previewColor)
                              ? "border-ink-300 size-5 rounded-full border ring-2 ring-slate-900 ring-offset-1"
                              : "border-ink-300 size-5 rounded-full border hover:border-slate-500"
                          }
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!recolorable && colorCards.length > 1 && main && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                  {t("batchJobs.editMockup.cantRecolor", { name: main.name, count: colorCards.length })}
                </p>
              )}

              {main?.allowBackground && (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("batchJobs.editMockup.background")}
                      {showSides ? (
                        <span className="text-muted-foreground font-normal"> · {t("batchJobs.editMockup.everySide")}</span>
                      ) : null}
                    </p>
                    {colors.length > 1 && (
                      <p className="text-muted-foreground text-xs">
                        {t("batchJobs.editMockup.backgroundPerColor")}
                      </p>
                    )}
                  </div>
                  {colors.length > 1 && (
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label={t("batchJobs.editMockup.backgroundColorGroup")}
                    >
                      {colors.map((hex) => {
                        const shown = sameColor(hex, previewColor);
                        const chosen = backgrounds[backgroundKey(hex)] ?? null;
                        return (
                          <button
                            key={hex}
                            type="button"
                            aria-label={t("batchJobs.editMockup.backgroundFor", { name: garmentColorName(hex, main?.printify?.colors) })}
                            aria-pressed={shown}
                            disabled={busy}
                            onClick={() => setShownColor(hex)}
                            className={
                              shown
                                ? "ring-primary flex items-center gap-1 rounded-full p-0.5 ring-2"
                                : "flex items-center gap-1 rounded-full p-0.5"
                            }
                          >
                            <GarmentColorSwatch hex={hex} className="size-5" />
                            {/* The background chosen for this garment color, so all of them can be seen at a glance. */}
                            {chosen && <MockupBackgroundSwatch hex={chosen} className="mr-1" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {colors.length > 1 && previewColor && (
                    <p className="text-ink-700 flex items-center gap-1.5 text-xs">
                      <GarmentColorSwatch hex={previewColor} />
                      {t("batchJobs.editMockup.garment", { name: garmentColorName(previewColor, main?.printify?.colors) })}
                    </p>
                  )}
                  {/* Keyed by the garment color, so a color typed for one is not left in the field for the next. */}
                  <MockupBackgroundPicker
                    key={backgroundKey(previewColor)}
                    value={backgrounds[backgroundKey(previewColor)] ?? null}
                    disabled={busy}
                    onChange={(next) => {
                      const key = backgroundKey(previewColor);
                      setBackgrounds((current) => ({ ...current, [key]: next }));
                      setTouchedBackgrounds((current) =>
                        current.includes(key) ? current : [...current, key]
                      );
                    }}
                  />
                </div>
              )}

              {photo && !removed && active && (
                <PrintAreaList
                  mode="mockup"
                  areas={areas}
                  activeKey={active.key}
                  onSelect={setActiveKey}
                  onChange={setAreasInFrame}
                  designs={designOptions.filter((option) => option.id !== image?.designImageId)}
                  ownDesignUrl={designImageUrl}
                  disabled={busy}
                />
              )}

              {main && othersOnTemplate > 0 && (
                <div className="space-y-2.5 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t("batchJobs.editMockup.applyTo")}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("batchJobs.editMockup.applyToHint")}
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
                            <span className="text-muted-foreground"> · {t("batchJobs.editMockup.more", { count: item.count })}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  {scope !== "this" && (
                    <p className="text-muted-foreground text-xs" aria-live="polite">
                      {spread.length === 0
                        ? t("batchJobs.editMockup.alreadySame")
                        : t("batchJobs.editMockup.willChange", { count: spread.length })}
                    </p>
                  )}
                </div>
              )}

              {unrecolorableSides.length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                  {t("batchJobs.editMockup.sideCantRecolor", {
                    sides: unrecolorableSides
                      .map((side) => mockupViewLabel(side.view).toLowerCase())
                      .join(t("batchJobs.editMockup.and")),
                  })}
                </p>
              )}

              {missingSides.length > 0 && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
                  {t("batchJobs.editMockup.missingSides", {
                    name: main?.name ?? "",
                    sides: missingSides
                      .map((side) => mockupViewLabel(side.view).toLowerCase())
                      .join(t("batchJobs.editMockup.or")),
                  })}
                </p>
              )}

              {duplicate && (
                <p
                  role="alert"
                  className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  {t("batchJobs.editMockup.duplicate", { name: duplicateName })}
                </p>
              )}
            </aside>
          </div>
        )}

        <DialogFooter className="flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("batchJobs.regenerate.cancel")}
          </Button>
          {edited.length > 0 && (
            <Button type="button" variant="outline" disabled={busy} onClick={() => reset.mutate()}>
              {reset.isPending ? t("batchJobs.editMockup.resetting") : t("batchJobs.editMockup.useJobSettings")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={busy || groupImages.some((item) => !item.slotKey)}
            onClick={() => save.mutate({ removeAll: true })}
          >
            {showColors
              ? t("batchJobs.editMockup.removeAllColors")
              : showSides
                ? t("batchJobs.editMockup.removeAllSides")
                : t("batchJobs.editMockup.removeThis")}
          </Button>
          <Button
            type="button"
            disabled={
              busy ||
              !main ||
              (printifyOnly && !main.printify) ||
              changes.some((change) => !change.slotKey) ||
              duplicate !== null ||
              printsNothing
            }
            onClick={() =>
              changes.length === 0 ? onOpenChange(false) : save.mutate({ removeAll: false })
            }
          >
            {save.isPending ? t("batchJobs.editMockup.saving") : t("batchJobs.editMockup.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
