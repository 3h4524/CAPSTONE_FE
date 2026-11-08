import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const OG_ASSET_DIR = path.join(process.cwd(), "public", "og");

export const getOgBackgroundDataUrl = async () => {
  const image = await readFile(path.join(OG_ASSET_DIR, "background.jpg"));
  return `data:image/jpeg;base64,${image.toString("base64")}`;
};

export const getOgFonts = async () => {
  const [medium, bold] = await Promise.all([
    readFile(path.join(OG_ASSET_DIR, "fonts", "space-grotesk-500.ttf")),
    readFile(path.join(OG_ASSET_DIR, "fonts", "space-grotesk-700.ttf")),
  ]);

  return [
    { name: "Space Grotesk", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Space Grotesk", data: bold, weight: 700 as const, style: "normal" as const },
  ];
};

export const renderOgImageOptions = async () => ({
  ...OG_IMAGE_SIZE,
  fonts: await getOgFonts(),
});
