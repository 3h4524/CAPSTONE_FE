import type { MockupTemplate } from "@/types/mockup-templates";
import type { WorkflowNodeConfig } from "@/types/workflow";

/**
 * The Printify product one APCS product type is made as, kept on the Apply mock-up node. The blueprint comes from the
 * chosen system templates (each linked to the Printify product its photo shows), the colors from the template colors
 * mapped to the provider's own names; the seller picks the provider and sizes. Push to Printify only shows it.
 */
export type PrintifyProductSetup = {
  blueprintId: number | null;
  blueprintTitle: string | null;
  printProviderId: number | null;
  printProviderTitle: string | null;
  /** Printify's own color names. */
  colors: string[];
  sizes: string[];
  /** The print area, `front` unless chosen. */
  position: string | null;
};

/** How one template color was matched to the provider's colors: the name it is sold as, or null when none is close. */
export type ColorMatch = { hex: string; name: string | null; distance: number | null };

export const EMPTY_PRINTIFY_SETUP: PrintifyProductSetup = {
  blueprintId: null,
  blueprintTitle: null,
  printProviderId: null,
  printProviderTitle: null,
  colors: [],
  sizes: [],
  position: null,
};

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown) => (typeof value === "string" && value ? value : null);
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export const readPrintifySetup = (value: unknown): PrintifyProductSetup => {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    blueprintId: num(raw.blueprintId),
    blueprintTitle: str(raw.blueprintTitle),
    printProviderId: num(raw.printProviderId),
    printProviderTitle: str(raw.printProviderTitle),
    colors: strings(raw.colors),
    sizes: strings(raw.sizes),
    position: str(raw.position),
  };
};

/** The Printify product per product type (lowercase) set on Apply mock-up; empty when none. */
export const readPrintifyProducts = (config: WorkflowNodeConfig | undefined): Record<string, PrintifyProductSetup> => {
  const raw = config?.printifyProducts;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([type, setup]) => [type.toLowerCase(), readPrintifySetup(setup)]));
};

/** What is missing before a product type's Printify product can be made, or null when it is complete. */
export const printifySetupProblem = (setup: PrintifyProductSetup): string | null =>
  !setup.blueprintId
    ? "choose a system template linked to Printify"
    : !setup.printProviderId
      ? "choose a print provider"
      : setup.colors.length === 0
        ? "no template color matches a color this provider prints"
        : setup.sizes.length === 0
          ? "choose at least one size"
          : null;

/** Whether the workflow pushes to Printify, so Apply mock-up offers only templates linked to a Printify product. */
export const pushesToPrintify = (nodes: { data: { type: string } }[]) => nodes.some((node) => node.data.type === "publish-printify");

/**
 * The Printify product the chosen templates of one product type show. Every chosen template of the type must show the
 * same one, since a product is printed on one garment.
 */
export const blueprintOfTemplates = (
  templates: MockupTemplate[]
): { blueprint: { id: number; title: string } | null; problem: string | null } => {
  const linked = templates.filter((template) => template.printify);
  if (linked.length < templates.length) return { blueprint: null, problem: "a chosen template is not linked to a Printify product" };
  const ids = [...new Set(linked.map((template) => template.printify!.blueprintId))];
  if (ids.length === 0) return { blueprint: null, problem: "choose a system template linked to Printify" };
  if (ids.length > 1) return { blueprint: null, problem: "the chosen templates show different Printify products; keep one garment" };
  return { blueprint: { id: ids[0], title: linked[0].printify!.blueprintTitle }, problem: null };
};

// Printify gives a variant's color by name only, and providers name them differently ("Heather Navy", "True Royal").
// These are the common garment names, so a template color can be matched to what the provider prints.
const PRINTIFY_COLOR_HEX: Record<string, string> = {
  white: "#FFFFFF",
  black: "#1A1A1A",
  "solid black blend": "#1A1A1A",
  "vintage black": "#2B2B2B",
  navy: "#1F2A44",
  "heather navy": "#3B4A6B",
  "athletic heather": "#B4B8BC",
  "sport grey": "#9EA3A8",
  "heather grey": "#9EA3A8",
  "heather gray": "#9EA3A8",
  "dark grey heather": "#3E4144",
  "dark heather": "#3E4144",
  "dark grey": "#4A4A4A",
  charcoal: "#36454F",
  "heather charcoal": "#4A4E52",
  ash: "#D3D5D2",
  silver: "#C0C0C0",
  red: "#B22222",
  cardinal: "#8C1D2F",
  "cardinal red": "#8C1D2F",
  "heather red": "#C24A4A",
  maroon: "#5C1F2A",
  "heather maroon": "#6E3440",
  royal: "#2B4FA3",
  "true royal": "#2B4FA3",
  "royal blue": "#2B4FA3",
  "heather true royal": "#4A69B3",
  "light blue": "#A7C7E7",
  "baby blue": "#A9C6E8",
  "carolina blue": "#7BAFD4",
  "heather blue": "#6F8FB5",
  "steel blue": "#4A6A8A",
  "indigo blue": "#3F4A75",
  teal: "#2A7F7F",
  aqua: "#3FB0B8",
  "forest green": "#2F4F3A",
  forest: "#2F4F3A",
  "heather forest": "#3E5E48",
  "military green": "#4B5320",
  "irish green": "#2E8B3E",
  kelly: "#2E8B3E",
  "kelly green": "#2E8B3E",
  "heather kelly": "#3C9A55",
  olive: "#6B6B3A",
  "heather olive": "#7A7A4E",
  mint: "#BFE3CF",
  sage: "#A7B89A",
  natural: "#EFE6D2",
  cream: "#F3ECD8",
  sand: "#D8C8A8",
  tan: "#C8AD85",
  "heather tan": "#C9B490",
  khaki: "#B9A57E",
  brown: "#5A3E2B",
  "heather brown": "#6F5643",
  pink: "#F4C2C2",
  "light pink": "#F7D3D8",
  "soft pink": "#F6CFD4",
  "heather pink": "#E7B3BF",
  "heather mauve": "#BC8F98",
  berry: "#8A2B54",
  purple: "#5B3A82",
  "team purple": "#4E2A84",
  "heather purple": "#7A5E9A",
  lavender: "#C9B6E4",
  orange: "#F28C28",
  "burnt orange": "#C9562A",
  "heather orange": "#F2A15A",
  gold: "#F2B81F",
  yellow: "#F4D03F",
  mustard: "#D4A72C",
  "heather mustard": "#D9B24E",
};

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** The hex a Printify color name stands for, or null when the name is not known. */
export const printifyColorHex = (name: string): string | null => PRINTIFY_COLOR_HEX[normalize(name)] ?? null;

const toLab = (hex: string): [number, number, number] => {
  const value = hex.replace("#", "");
  const channel = (offset: number) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [channel(0), channel(2), channel(4)];
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};

/** How far apart two colors look (CIE76 ΔE in Lab): about 2 is barely visible, above 20 another color. */
export const colorDistance = (left: string, right: string) => {
  const [l1, a1, b1] = toLab(left);
  const [l2, a2, b2] = toLab(right);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/** Beyond this ΔE a provider color is another color, so the template color is not sold rather than sold as it. */
export const COLOR_MATCH_LIMIT = 20;

/** The provider color a template color is sold as: the closest known name within the limit, or none. */
export const matchPrintifyColor = (hex: string, providerColors: string[]): ColorMatch => {
  let best: { name: string; distance: number } | null = null;
  for (const name of providerColors) {
    const known = printifyColorHex(name);
    if (!known) continue;
    const distance = colorDistance(hex, known);
    if (!best || distance < best.distance) best = { name, distance };
  }
  return best && best.distance <= COLOR_MATCH_LIMIT ? { hex, name: best.name, distance: best.distance } : { hex, name: null, distance: best?.distance ?? null };
};

/** The template colors chosen for one product type's templates, each once; a template without colors uses its own. */
export const templateColorsOf = (templates: MockupTemplate[], templateColors: Record<string, string[]>): string[] => [
  ...new Set(
    templates.flatMap((template) => {
      const chosen = templateColors[template.id] ?? [];
      return (chosen.length > 0 ? chosen : template.garmentColor ? [template.garmentColor] : ["#FFFFFF"]).map((hex) => hex.toUpperCase());
    })
  ),
];
