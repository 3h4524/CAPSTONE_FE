import { parsePrintArea, parsePrintLayout, resolveMockupAreas, sameAreas } from "@/helpers/mockup-template";
import type { MockupImage, MockupOverride, MockupPrintArea, MockupTemplate } from "@/types/mockup-templates";

/** Which of a job's mock-ups a change made to one of them reaches: itself, or every one on the same template. */
export type MockupChangeScope = "this" | "template";

export const isMockupChangeScope = (value: string): value is MockupChangeScope => value === "this" || value === "template";

export type MockupOverrideChange = { slotKey: string; override: MockupOverride; replacedMockupImageId: string | null };

export const samePrintArea = (left: MockupPrintArea | null, right: MockupPrintArea | null) =>
  left === right ||
  (left !== null && right !== null && left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height);

/** How a mock-up is made now: its own change when it has one, else what the job's settings gave it. */
export const currentMockupSetup = (image: MockupImage): MockupOverride =>
  image.override && !image.override.removed
    ? image.override
    : { mockupTemplateId: image.mockupTemplateId, garmentColor: image.garmentColor, backgroundColor: image.backgroundColor ?? null, printArea: null };

/** The job's other mock-ups a change to `edited` also goes to: none, or every one on the template it is now on. */
export const mockupsInScope = (images: MockupImage[], edited: MockupImage, templateId: string, scope: MockupChangeScope) =>
  scope === "this"
    ? []
    : images.filter((image) => Boolean(image.slotKey) && image.id !== edited.id && currentMockupSetup(image).mockupTemplateId === templateId);

/**
 * The edited mock-up's background and design position copied onto other mock-ups of its template. Each keeps its own
 * garment color; the background only goes to templates that can take one. A mock-up the copy would leave as it is is
 * not listed.
 */
export const spreadMockupChange = (
  edited: MockupOverride,
  targets: MockupImage[],
  templatesById: ReadonlyMap<string, MockupTemplate>
): MockupOverrideChange[] =>
  targets.flatMap((image) => {
    const current = currentMockupSetup(image);
    const takesBackground = templatesById.get(current.mockupTemplateId)?.allowBackground === true;
    const sameTemplate = current.mockupTemplateId === edited.mockupTemplateId;
    const next: MockupOverride = {
      ...current,
      backgroundColor: takesBackground ? edited.backgroundColor : current.backgroundColor,
      printArea: sameTemplate ? edited.printArea : current.printArea,
      // The print areas go with the design position: where each sits, how it is turned and what it prints.
      areas: sameTemplate ? (edited.areas ?? null) : (current.areas ?? null),
    };
    const changed =
      (next.backgroundColor ?? "").toLowerCase() !== (current.backgroundColor ?? "").toLowerCase() ||
      !samePrintArea(next.printArea, current.printArea) ||
      !sameAreas(next.areas, current.areas);
    return changed && image.slotKey ? [{ slotKey: image.slotKey, override: next, replacedMockupImageId: image.id }] : [];
  });

// Two setups make the same picture when they put the design on the same template, in the same garment color, on
// the same background and in the same place; no print area means the template's own.
const sameMockupSetup = (left: MockupOverride, right: MockupOverride, templatesById: ReadonlyMap<string, MockupTemplate>) => {
  if (left.mockupTemplateId !== right.mockupTemplateId) return false;
  const sameColor = (a: string | null, b: string | null) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
  const template = templatesById.get(left.mockupTemplateId);
  const ownArea = template ? parsePrintArea(template.printAreaConfig) : null;
  const layout = template ? parsePrintLayout(template.printAreaConfig) : null;
  // With several print areas, each one counts: where it is, how it is turned and what it prints.
  const samePlace =
    layout !== null && (left.areas || right.areas)
      ? sameAreas(resolveMockupAreas(layout, left.areas, left.printArea), resolveMockupAreas(layout, right.areas, right.printArea))
      : samePrintArea(left.printArea ?? ownArea, right.printArea ?? ownArea);
  return sameColor(left.garmentColor, right.garmentColor) && sameColor(left.backgroundColor, right.backgroundColor) && samePlace;
};

/**
 * A mock-up the save would leave looking exactly like another one of the same design, with the setup they would
 * share. Only pairs that include a mock-up the save changes count: the edited one or one the change is copied onto.
 */
export const findDuplicateMockup = (
  images: MockupImage[],
  edited: MockupImage,
  editedSetup: MockupOverride,
  spread: MockupOverrideChange[],
  templatesById: ReadonlyMap<string, MockupTemplate>
): { image: MockupImage; setup: MockupOverride } | null => {
  const spreadByImage = new Map(spread.map((change) => [change.replacedMockupImageId, change.override]));
  const after = images.map((image) => ({
    image,
    setup: image.id === edited.id ? editedSetup : (spreadByImage.get(image.id) ?? currentMockupSetup(image)),
    changed: image.id === edited.id || spreadByImage.has(image.id),
  }));
  for (const changed of after.filter((item) => item.changed)) {
    const twin = after.find(
      (other) =>
        other.image.id !== changed.image.id &&
        other.image.designImageId === changed.image.designImageId &&
        sameMockupSetup(other.setup, changed.setup, templatesById)
    );
    if (twin) return { image: twin.image, setup: twin.setup };
  }
  return null;
};

/**
 * Two mock-ups of one design the save would leave looking exactly alike, with the setup they would share. Every
 * change counts: one to a mock-up, one that removes it, and one that makes a mock-up that is not there now.
 */
export const findDuplicateAfterChanges = (
  images: MockupImage[],
  designImageId: string,
  changes: MockupOverrideChange[],
  templatesById: ReadonlyMap<string, MockupTemplate>
): { setup: MockupOverride } | null => {
  const byImage = new Map(changes.flatMap((change) => (change.replacedMockupImageId ? [[change.replacedMockupImageId, change] as const] : [])));
  const after = [
    ...images
      .filter((image) => image.designImageId === designImageId)
      .flatMap((image) => {
        const change = byImage.get(image.id);
        return change?.override.removed ? [] : [{ setup: change ? change.override : currentMockupSetup(image), changed: Boolean(change) }];
      }),
    ...changes
      .filter((change) => !change.replacedMockupImageId && !change.override.removed)
      .map((change) => ({ setup: change.override, changed: true })),
  ];
  for (const [index, changed] of after.entries()) {
    if (!changed.changed) continue;
    const twin = after.find((other, otherIndex) => otherIndex !== index && sameMockupSetup(other.setup, changed.setup, templatesById));
    if (twin) return { setup: twin.setup };
  }
  return null;
};
