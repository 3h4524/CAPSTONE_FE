import { TEMPLATE_VIEWS, templateView } from "@/helpers/mockup-template";
import type { MockupImage, MockupTemplate, MockupView } from "@/types/mockup-templates";

/** Which template a photo belongs to (itself for a front) and which side of the garment it shows. */
export type TemplateSide = { mainId: string; view: MockupView };

/** One mock-up of a card: the picture of one side of the garment. */
export type MockupSide = { view: MockupView; image: MockupImage };

/** The mock-ups of one design on one template in one garment color: its front, back and sleeves together. */
export type MockupCard = { key: string; sides: MockupSide[] };

// Ids in a slot key are written without dashes.
export const compactId = (id: string) => id.replace(/-/g, "").toLowerCase();

/** Every template photo by id, the photos of a template's other sides included, with the template they belong to. */
export const templateSidesIndex = (templates: MockupTemplate[]) => {
  const index = new Map<string, TemplateSide>();
  for (const template of templates) {
    index.set(compactId(template.id), { mainId: template.id, view: "front" });
    for (const side of template.views ?? [])
      index.set(compactId(side.id), { mainId: template.id, view: templateView(side) });
  }
  return index;
};

export const sideOfTemplate = (index: ReadonlyMap<string, TemplateSide>, templateId: string) =>
  index.get(compactId(templateId));

/** The photo of a template for one side: the template itself for the front, else the photo of that side, if it has one. */
export const templateForView = (
  template: MockupTemplate,
  view: MockupView
): MockupTemplate | null =>
  view === "front"
    ? template
    : (template.views?.find((side) => templateView(side) === view) ?? null);

/** Where a side goes in a row of sides: front, back, then the sleeves. */
export const viewOrder = (view: MockupView) => {
  const index = TEMPLATE_VIEWS.indexOf(view);
  return index < 0 ? TEMPLATE_VIEWS.length : index;
};

/**
 * The card a job's slot belongs to and the side it is on, when its template is known: the same for a mock-up
 * and for a slot whose mock-up was removed, so a removed side can be shown with its card.
 */
export const slotSide = (
  productId: string,
  slotKey: string | null | undefined,
  index: ReadonlyMap<string, TemplateSide>
): { cardKey: string; view: MockupView; mainId: string } | null => {
  const [design, slotTemplate, color] = slotKey?.split(".") ?? [];
  const side = slotTemplate ? index.get(slotTemplate.toLowerCase()) : undefined;
  return side && design
    ? {
        cardKey: `${productId}|${design}|${side.mainId}|${color ?? ""}`,
        view: side.view,
        mainId: side.mainId,
      }
    : null;
};

/**
 * The job's mock-ups as cards: the sides of one design on one template in one garment color go together, front first.
 * A mock-up is placed by its slot (what the job's settings make), so one edited onto another template stays with its
 * card. A mock-up whose template is not known has a card of its own.
 */
export const groupMockupSides = (
  images: MockupImage[],
  index: ReadonlyMap<string, TemplateSide>
): MockupCard[] => {
  const cards = new Map<string, MockupCard>();
  for (const image of images) {
    const slot = slotSide(image.productId, image.slotKey, index);
    const view =
      slot?.view ??
      (image.slotKey ? undefined : sideOfTemplate(index, image.mockupTemplateId)?.view) ??
      "front";
    let key = slot?.cardKey ?? image.id;
    // Two pictures of the same side are two cards.
    if (cards.get(key)?.sides.some((item) => item.view === view)) key = image.id;
    const card = cards.get(key) ?? { key, sides: [] };
    card.sides.push({ view, image });
    cards.set(key, card);
  }
  // A side added to one mock-up moved to another template (that template's back, say) has a slot of that template, so
  // it starts a card of its own: it joins the card whose front (same product, design and color) is on that template.
  for (const [key, card] of cards) {
    const parts = key.split("|");
    if (parts.length !== 4 || card.sides.some((side) => side.view === "front")) continue;
    const [productId, design, mainId, color] = parts;
    const host = [...cards.entries()].find(([otherKey, other]) => {
      const otherParts = otherKey.split("|");
      const front = other.sides.find((side) => side.view === "front");
      return (
        otherKey !== key &&
        otherParts.length === 4 &&
        otherParts[0] === productId &&
        otherParts[1] === design &&
        otherParts[3] === color &&
        front !== undefined &&
        sideOfTemplate(index, front.image.mockupTemplateId)?.mainId === mainId &&
        !card.sides.some((side) => other.sides.some((item) => item.view === side.view))
      );
    })?.[1];
    if (!host) continue;
    host.sides.push(...card.sides);
    cards.delete(key);
  }
  return [...cards.values()].map((card) => ({
    ...card,
    sides: [...card.sides].sort((a, b) => viewOrder(a.view) - viewOrder(b.view)),
  }));
};

/** The card a mock-up is on. */
export const cardOfMockup = (cards: MockupCard[], imageId: string) =>
  cards.find((card) => card.sides.some((side) => side.image.id === imageId)) ?? null;

/** The mock-ups of one design on one template, in every garment color: each color is a card of its sides. */
export type MockupColorGroup = { key: string; colors: MockupCard[] };

/** The group a card of a slot belongs to: the card's key without its garment color. A card without a slot is alone. */
export const colorGroupKey = (cardKey: string) => {
  const parts = cardKey.split("|");
  return parts.length === 4 ? parts.slice(0, 3).join("|") : cardKey;
};

/** The garment color a card is in now: that of its first side, null for the photo's own. */
export const cardColor = (card: MockupCard) => card.sides[0]?.image.garmentColor ?? null;

/** The cards as groups: the colors of one design on one template go together, in the job's order. */
export const groupMockupColors = (cards: MockupCard[]): MockupColorGroup[] => {
  const groups = new Map<string, MockupColorGroup>();
  for (const card of cards) {
    const key = colorGroupKey(card.key);
    const group = groups.get(key) ?? { key, colors: [] };
    group.colors.push(card);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** The group a mock-up is in. */
export const colorGroupOfMockup = (groups: MockupColorGroup[], imageId: string) =>
  groups.find((group) =>
    group.colors.some((card) => card.sides.some((side) => side.image.id === imageId))
  ) ?? null;
