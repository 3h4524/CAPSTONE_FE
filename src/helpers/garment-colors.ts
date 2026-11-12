export const GARMENT_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#1A1A1A" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Heather gray", hex: "#9EA3A8" },
  { name: "Red", hex: "#B22222" },
  { name: "Royal blue", hex: "#2B4FA3" },
  { name: "Forest green", hex: "#2F4F3A" },
  { name: "Maroon", hex: "#5C1F2A" },
] as const;

export const MAX_GARMENT_COLORS = 5;

export const isGarmentColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

/** A named garment color: the fixed suggestions, or a Printify blueprint's colors. */
export type NamedGarmentColor = { readonly name: string; readonly hex: string };

/** A color's name in the palette shown (a Printify template's colors, else the fixed suggestions), else its hex. */
export const garmentColorName = (hex: string, palette: readonly NamedGarmentColor[] = GARMENT_COLORS) =>
  palette.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();

/**
 * The garment colors carried over to another template, matched by name: a blueprint names the same shade with its own
 * hex (Mauve is #C97B7C on one Printify blueprint and #CE7C7C on another), so a color keeps its name and takes the new
 * palette's hex. A color the new palette has no name for is dropped. Each pair is the old hex and the new one.
 */
export const carryColors = (
  colors: string[],
  from: readonly NamedGarmentColor[] | undefined,
  to: readonly NamedGarmentColor[]
): { from: string; to: string }[] => {
  const pairs: { from: string; to: string }[] = [];
  for (const hex of colors) {
    const name = garmentColorName(hex, from ?? GARMENT_COLORS).toLowerCase();
    const match = to.find((color) => color.name.toLowerCase() === name || color.hex.toLowerCase() === hex.toLowerCase());
    if (match && !pairs.some((pair) => pair.to.toLowerCase() === match.hex.toLowerCase())) pairs.push({ from: hex, to: match.hex });
  }
  return pairs;
};

/**
 * The color a Printify template starts with when ticked: its own garment color when Printify makes it, else White,
 * else the first Printify color. None when the template has no Printify colors.
 */
export const printifyStartColors = (template: {
  garmentColor?: string | null;
  printify?: { colors: readonly NamedGarmentColor[] } | null;
}): string[] => {
  const colors = template.printify?.colors ?? [];
  const own = template.garmentColor && colors.find((color) => color.hex.toLowerCase() === template.garmentColor!.toLowerCase());
  const start = own || colors.find((color) => color.name.toLowerCase() === "white") || colors[0];
  return start ? [start.hex] : [];
};

/** Garment colors chosen per template, keyed by template id. */
export type TemplateColors = Record<string, string[]>;

type ColorableTemplate = { id: string; allowRecolor: boolean; garmentColor?: string | null };

/** The color a recolorable template is made in when none is picked: the one its garment already has. */
export const defaultTemplateColors = (template: ColorableTemplate): string[] =>
  template.allowRecolor && template.garmentColor ? [template.garmentColor] : [];

// The colors each selected recolorable template starts with: its own pick if it has one, else the
// shared list older selections were saved with, else the color the garment already has, so the
// picker shows what the template would be made in. Anything else has no colors to choose.
export const resolveTemplateColors = (
  templates: ColorableTemplate[],
  selectedIds: string[],
  templateColors: TemplateColors = {},
  sharedColors: string[] = []
): TemplateColors =>
  Object.fromEntries(
    templates
      .filter((template) => template.allowRecolor && selectedIds.includes(template.id))
      .map((template) => [
        template.id,
        templateColors[template.id] ?? (sharedColors.length > 0 ? sharedColors : defaultTemplateColors(template)),
      ])
  );

/** How many garment colors a saved selection asks for in total (each template's own, else the shared list). */
export const countSelectedColors = (selection: { garmentColors: string[]; templateColors?: TemplateColors } | undefined) => {
  if (!selection) return 0;
  const own = Object.values(selection.templateColors ?? {}).reduce((total, colors) => total + colors.length, 0);
  return own > 0 ? own : selection.garmentColors.length;
};
