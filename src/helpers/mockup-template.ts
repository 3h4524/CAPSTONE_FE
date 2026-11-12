import type { MockupArea, MockupAreaSourceKind, MockupPrintArea, MockupPrintLayout, MockupTemplate, MockupView } from "@/types/mockup-templates";

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

// ---- Several print areas: a template's main area and up to three more ----

/** The key of a template's main print area. */
export const MAIN_AREA_KEY = "main";
export const MAX_PRINT_AREAS = 4;
const MAX_AREA_NAME_LENGTH = 40;
const AREA_KEY = /^[a-z0-9][a-z0-9_-]{0,23}$/;

export const MOCKUP_VIEWS: { value: MockupView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "left", label: "Left sleeve" },
  { value: "right", label: "Right sleeve" },
  { value: "side", label: "Side" },
];

/** The sides a template has a photo of: its own photo is the front, each other one is a template of its own. */
export const TEMPLATE_VIEWS: MockupView[] = ["front", "back", "left", "right"];

export const mockupViewLabel = (view: MockupView) => MOCKUP_VIEWS.find((item) => item.value === view)?.label ?? "Front";

const isView = (value: unknown): value is MockupView =>
  value === "front" || value === "back" || value === "left" || value === "right" || value === "side";

/** The side of the garment a template's photo shows. */
export const templateView = (template: Pick<MockupTemplate, "printAreaConfig">): MockupView =>
  parsePrintLayout(template.printAreaConfig)?.view ?? "front";

/** Every template with the photos of its other sides beside it, for choosing among all of them. */
export const withViewTemplates = (templates: MockupTemplate[]): MockupTemplate[] =>
  templates.flatMap((template) => [template, ...(template.views ?? [])]);

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

// Mirrors MockupRules.NormalizeRotation: degrees rounded to a tenth, within -180..180.
export const normalizeRotation = (degrees: number) => {
  if (!Number.isFinite(degrees)) return 0;
  let turned = Math.round((degrees % 360) * 10) / 10;
  if (turned > 180) turned -= 360;
  if (turned < -180) turned += 360;
  return turned === 0 ? 0 : turned;
};

const readName = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, MAX_AREA_NAME_LENGTH) : null;

const readTemplateSource = (value: unknown, fallback: MockupAreaSourceKind): MockupAreaSourceKind =>
  value === "same" || value === "none" ? value : fallback;

// Mirrors MockupRules.ParsePrintLayout: the main area at the top of the JSON, the others under "areas".
export const parsePrintLayout = (json: string): MockupPrintLayout | null => {
  const main = parsePrintArea(json);
  if (!main) return null;
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
  const areas: MockupArea[] = [
    {
      key: MAIN_AREA_KEY,
      name: readName(parsed.name),
      ...main,
      rotation: finite(parsed.rotation) ? normalizeRotation(parsed.rotation) : 0,
      source: readTemplateSource(parsed.source, "same"),
    },
  ];
  for (const item of Array.isArray(parsed.areas) ? parsed.areas : []) {
    if (areas.length >= MAX_PRINT_AREAS) break;
    const area = item as Record<string, unknown>;
    const key = area?.key;
    if (typeof key !== "string" || !AREA_KEY.test(key) || areas.some((known) => known.key === key)) continue;
    const { x, y, width, height } = area;
    if (!finite(x) || !finite(y) || !finite(width) || !finite(height) || width <= 0 || height <= 0) continue;
    areas.push({
      key,
      name: readName(area.name),
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      rotation: finite(area.rotation) ? normalizeRotation(area.rotation) : 0,
      source: readTemplateSource(area.source, "none"),
    });
  }
  return { view: isView(parsed.view) ? parsed.view : "front", areas };
};

/** What a print area is called on screen. */
export const areaLabel = (area: Pick<MockupArea, "key" | "name">, index: number) =>
  area.name ?? (area.key === MAIN_AREA_KEY ? "Main area" : `Area ${index + 1}`);

/** The box around a print area turned about its center, as the server checks it against the photo. */
export const rotatedBounds = (area: MockupPrintArea & { rotation?: number }): MockupPrintArea => {
  const degrees = normalizeRotation(area.rotation ?? 0);
  if (degrees === 0) return { x: area.x, y: area.y, width: area.width, height: area.height };
  const radians = (degrees * Math.PI) / 180;
  const halfWidth = (Math.abs(area.width * Math.cos(radians)) + Math.abs(area.height * Math.sin(radians))) / 2;
  const halfHeight = (Math.abs(area.width * Math.sin(radians)) + Math.abs(area.height * Math.cos(radians))) / 2;
  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  const x = Math.floor(round(centerX - halfWidth));
  const y = Math.floor(round(centerY - halfHeight));
  return {
    x,
    y,
    width: Math.max(1, Math.ceil(round(centerX + halfWidth)) - x),
    height: Math.max(1, Math.ceil(round(centerY + halfHeight)) - y),
  };
};

/**
 * The area moved, as little as needed, so that turned as it is it lies inside the frame (a Printify template's print
 * area, which the server holds a design to with a pixel to spare). Null when it is too big to fit even then.
 */
export const keepInFrame = (
  area: MockupPrintArea,
  rotation: number,
  frame: MockupPrintArea
): MockupPrintArea | null => {
  const box = rotatedBounds({ ...area, rotation });
  if (box.width > frame.width + 1 || box.height > frame.height + 1) return null;
  const shiftX = box.x < frame.x ? frame.x - box.x : Math.min(0, frame.x + frame.width - (box.x + box.width));
  const shiftY = box.y < frame.y ? frame.y - box.y : Math.min(0, frame.y + frame.height - (box.y + box.height));
  return { x: area.x + shiftX, y: area.y + shiftY, width: area.width, height: area.height };
};

// Mirrors MockupRules.AreaFits: the area, turned as it is, lies wholly on the photo.
export const areaFits = (area: MockupPrintArea & { rotation?: number }, photoWidth: number, photoHeight: number) => {
  if (area.width <= 0 || area.height <= 0 || area.x < 0 || area.y < 0) return false;
  const box = rotatedBounds(area);
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= photoWidth && box.y + box.height <= photoHeight;
};

/** The template's print areas with a mock-up's own settings laid over them, as the server resolves them. */
export const resolveMockupAreas = (
  layout: MockupPrintLayout,
  own: MockupArea[] | null | undefined,
  movedMain: MockupPrintArea | null | undefined,
  jobSources?: Record<string, { kind: MockupAreaSourceKind; designImageId?: string | null }> | null
): MockupArea[] =>
  layout.areas.map((area) => {
    const mine = own?.find((item) => item.key === area.key);
    if (mine) return { ...mine, name: area.name, rotation: normalizeRotation(mine.rotation) };
    const job = jobSources?.[area.key];
    const placed = area.key === MAIN_AREA_KEY && movedMain ? { ...area, ...movedMain } : area;
    return job ? { ...placed, source: job.kind, designImageId: job.kind === "design" ? (job.designImageId ?? null) : null } : placed;
  });

/** Whether two lists of print areas put the same things in the same places. */
export const sameAreas = (left: MockupArea[] | null | undefined, right: MockupArea[] | null | undefined) =>
  (left ?? []).length === (right ?? []).length &&
  (left ?? []).every((area, index) => {
    const other = (right ?? [])[index];
    return (
      other !== undefined &&
      area.key === other.key &&
      area.x === other.x &&
      area.y === other.y &&
      area.width === other.width &&
      area.height === other.height &&
      normalizeRotation(area.rotation) === normalizeRotation(other.rotation) &&
      area.source === other.source &&
      (area.source !== "design" || area.designImageId === other.designImageId)
    );
  });
