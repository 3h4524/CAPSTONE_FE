import { ImageResponse } from "next/og";

import { OgImageCard } from "@/components/seo/og-image-card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// eslint-disable-next-line import/no-default-export
export default function Image() {
  return new ImageResponse(<OgImageCard />, size);
}
