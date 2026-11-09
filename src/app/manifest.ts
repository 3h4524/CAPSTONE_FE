import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/constants/site";

// eslint-disable-next-line import/no-default-export
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.name,
    short_name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: SITE_CONFIG.themeColor,
    icons: [
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    lang: SITE_CONFIG.locale,
  };
}
