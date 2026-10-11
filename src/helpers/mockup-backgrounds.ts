/** Background color chosen per template, keyed by template id; a template without one keeps its photo's background. */
export type TemplateBackgrounds = Record<string, string>;

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
