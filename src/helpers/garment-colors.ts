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
