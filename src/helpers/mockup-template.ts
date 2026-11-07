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

/** A corner of a print area, in the photo's pixels. */
export type QuadPoint = { x: number; y: number };

/** A print area marked by its corners: top-left, top-right, bottom-right, bottom-left. */
export type PrintQuad = [QuadPoint, QuadPoint, QuadPoint, QuadPoint];

// Mirrors MockupRules.ParsePrintQuad: the corners kept as "quad": [[x, y], ...], or null for a rectangle.
export const parsePrintQuad = (json: string): PrintQuad | null => {
  try {
    const quad = (JSON.parse(json) as { quad?: unknown }).quad;
    if (!Array.isArray(quad) || quad.length !== 4) return null;
    const points = quad.map((corner) =>
      Array.isArray(corner) && corner.length === 2 && corner.every((value) => typeof value === "number" && Number.isFinite(value))
        ? { x: corner[0] as number, y: corner[1] as number }
        : null
    );
    return points.every((point) => point !== null) ? (points as PrintQuad) : null;
  } catch {
    return null;
  }
};

/** The corners of a rectangular print area. */
export const quadFromArea = (area: MockupPrintArea): PrintQuad => [
  { x: area.x, y: area.y },
  { x: area.x + area.width, y: area.y },
  { x: area.x + area.width, y: area.y + area.height },
  { x: area.x, y: area.y + area.height },
];

/** The box around a print area's corners, as the server keeps it beside them. */
export const quadBounds = (quad: PrintQuad): MockupPrintArea => {
  const xs = quad.map((point) => point.x);
  const ys = quad.map((point) => point.y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, width: Math.max(1, Math.ceil(Math.max(...xs)) - x), height: Math.max(1, Math.ceil(Math.max(...ys)) - y) };
};

/** Whether the corners still make a plain rectangle, which needs no warp. */
export const isRectangleQuad = (quad: PrintQuad) =>
  quad[0].y === quad[1].y && quad[2].y === quad[3].y && quad[0].x === quad[3].x && quad[1].x === quad[2].x;

// Mirrors MockupRules.IsValidQuad: clockwise (in the photo's coordinates), not crossing, inside the photo.
export const isValidQuad = (quad: PrintQuad, width: number, height: number) =>
  quad.every((point) => point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height) &&
  quad.every((a, i) => {
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) > 0;
  });

// Mirrors MockupRules.IsAutomaticPlacement: a model photo whose designs are placed by measuring the shirt.
export const isAutomaticPlacement = (json: string): boolean => {
  try {
    return (JSON.parse(json) as { auto?: unknown }).auto === true;
  } catch {
    return false;
  }
};
