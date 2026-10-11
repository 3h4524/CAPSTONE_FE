/**
 * Background colors chosen per template: keyed by template id, then by the garment color they go with
 * ('#RRGGBB') or by `DEFAULT_BACKGROUND_KEY`. A mock-up without one keeps its photo's background.
 */
export type TemplateBackgrounds = Record<string, Record<string, string>>;

/** The background of every garment color that has none of its own, the photo's own color included. */
export const DEFAULT_BACKGROUND_KEY = "default";

// Plain studio backdrops, light to dark, that suit a garment of any color.
export const MOCKUP_BACKGROUNDS = [
  { hex: "#FFFFFF", name: "White" },
  { hex: "#F4F1EA", name: "Ivory" },
  { hex: "#EDE6DA", name: "Sand" },
  { hex: "#DDE8DA", name: "Sage" },
  { hex: "#DCE8F2", name: "Sky" },
  { hex: "#F3DDE0", name: "Blush" },
  { hex: "#D9DDE3", name: "Light gray" },
  { hex: "#8A929E", name: "Gray" },
  { hex: "#22262E", name: "Charcoal" },
] as const;

export const mockupBackgroundName = (hex: string) =>
  MOCKUP_BACKGROUNDS.find((color) => color.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex.toUpperCase();

/** What a template's backgrounds are chosen for: each garment color picked for it, or the one default. */
export const backgroundKeys = (garmentColors: string[]): string[] =>
  garmentColors.length > 0 ? garmentColors.map((color) => color.toUpperCase()) : [DEFAULT_BACKGROUND_KEY];

/** The background of a template's mock-up in one garment color (or under the default key), or null to keep the photo's. */
export const resolveBackground = (byColor: Record<string, string> | undefined, key: string | null | undefined): string | null => {
  if (!byColor) return null;
  const own = key ? Object.entries(byColor).find(([garment]) => garment.toLowerCase() === key.toLowerCase())?.[1] : undefined;
  return own ?? byColor[DEFAULT_BACKGROUND_KEY] ?? null;
};

/** The backgrounds of a template written out for exactly these keys, so nothing is left to a default or to a color no longer picked. */
export const backgroundsFor = (byColor: Record<string, string> | undefined, keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, resolveBackground(byColor, key)] as const).filter((entry): entry is [string, string] => entry[1] !== null));
