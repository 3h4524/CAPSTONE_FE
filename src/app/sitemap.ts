import type { MetadataRoute } from "next";

import { getAbsoluteUrl } from "@/data/metadata";

// eslint-disable-next-line import/no-default-export
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: getAbsoluteUrl("/"),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
