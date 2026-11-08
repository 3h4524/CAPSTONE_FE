export const SITE_CONFIG = {
  name: "APCS",
  description:
    "APCS turns product ideas into professional designs, compelling copy, and optimized listings for Etsy and Printify with AI.",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en",
} as const;
