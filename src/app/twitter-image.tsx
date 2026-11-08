import { ImageResponse } from "next/og";

import { OgImageCard } from "@/components/seo/og-image-card";
import { SITE_CONFIG } from "@/constants/site";
import { getOgBackgroundDataUrl, OG_IMAGE_SIZE, renderOgImageOptions } from "@/helpers/og-image";

export const alt = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

// eslint-disable-next-line import/no-default-export
export default async function Image() {
  const [backgroundSrc, options] = await Promise.all([getOgBackgroundDataUrl(), renderOgImageOptions()]);

  return new ImageResponse(<OgImageCard backgroundSrc={backgroundSrc} />, options);
}
