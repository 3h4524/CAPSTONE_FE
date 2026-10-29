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

export const garmentColorName = (hex: string) =>
  GARMENT_COLORS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();

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
