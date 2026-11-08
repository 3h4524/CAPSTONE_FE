import { TEMPLATE_VIEWS, templateView } from "@/helpers/mockup-template";
import type { MockupImage, MockupTemplate, MockupView } from "@/types/mockup-templates";

/** Which template a photo belongs to (itself for a front) and which side of the garment it shows. */
export type TemplateSide = { mainId: string; view: MockupView };

/** One mock-up of a card: the picture of one side of the garment. */
export type MockupSide = { view: MockupView; image: MockupImage };

/** The mock-ups of one design on one template in one garment color: its front, back and sleeves together. */
export type MockupCard = { key: string; sides: MockupSide[] };

// Ids in a slot key are written without dashes.
const compactId = (id: string) => id.replace(/-/g, "").toLowerCase();

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

const viewOrder = (view: MockupView) => {
  const index = TEMPLATE_VIEWS.indexOf(view);
  return index < 0 ? TEMPLATE_VIEWS.length : index;
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
    const [design, slotTemplate, color] = image.slotKey?.split(".") ?? [];
    const side = slotTemplate
      ? index.get(slotTemplate.toLowerCase())
      : sideOfTemplate(index, image.mockupTemplateId);
    const view = side?.view ?? "front";
    let key =
      side && design ? `${image.productId}|${design}|${side.mainId}|${color ?? ""}` : image.id;
    // Two pictures of the same side are two cards.
    if (cards.get(key)?.sides.some((item) => item.view === view)) key = image.id;
    const card = cards.get(key) ?? { key, sides: [] };
    card.sides.push({ view, image });
    cards.set(key, card);
  }
  return [...cards.values()].map((card) => ({
    ...card,
    sides: [...card.sides].sort((a, b) => viewOrder(a.view) - viewOrder(b.view)),
  }));
};

/** The card a mock-up is on. */
export const cardOfMockup = (cards: MockupCard[], imageId: string) =>
  cards.find((card) => card.sides.some((side) => side.image.id === imageId)) ?? null;
