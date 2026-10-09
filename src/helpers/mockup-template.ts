import type { MockupPrintArea, MockupTemplate } from "@/types/mockup-templates";

export const MAX_MOCKUP_SELECTION = 5;

export const sortMockupList = (templates: MockupTemplate[]) =>
  [...templates].sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name));

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  tshirt: "T-shirt",
  hoodie: "Hoodie",
  mug: "Mug",
  poster: "Poster",
  tote_bag: "Tote bag",
  phone_case: "Phone case",
};

export const productTypeLabel = (type: string) => PRODUCT_TYPE_LABELS[type.toLowerCase()] ?? type;

/** Product type (lowercase) → how many products in the list have it. */
export const countProductTypes = (products: { productType?: string | null }[]) =>
  products.reduce<Record<string, number>>((counts, product) => {
    const type = (product.productType ?? "").toLowerCase();
    if (type) counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

// Mirrors the backend's MockupRules.ParsePrintArea shape: {"x":..,"y":..,"width":..,"height":..}.
export const parsePrintArea = (json: string): MockupPrintArea | null => {
  try {
    const parsed = JSON.parse(json) as Partial<MockupPrintArea>;
    const { x, y, width, height } = parsed;
    if ([x, y, width, height].some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
    return { x: x as number, y: y as number, width: width as number, height: height as number };
  } catch {
    return null;
  }
};
