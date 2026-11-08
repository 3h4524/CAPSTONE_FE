export const SITE_CONFIG = {
  name: "Podivo",
  tagline: "AI content studio for print-on-demand sellers",
  pitch: "Designs, mockups, promo videos and Etsy listings in one AI workflow.",
  description:
    "Podivo turns product ideas into print-ready designs, mockups, promo videos and SEO-optimized Etsy listings, then publishes them to Etsy and Printify.",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en",
  ogLocale: "en_US",
  themeColor: "#6366f1",
  logoBackground: "#4338ca",
} as const;
