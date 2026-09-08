import {
  Clapperboard,
  FileText,
  Layers,
  Palette,
  Plug,
  Shirt,
  ShoppingBag,
  Sparkles,
  Sticker,
  Store,
} from "lucide-react";

import type {
  BatchRow,
  ConnectedPlatform,
  DesignTile,
  FeatureDetail,
} from "@/types/features";

export const DESIGN_FEATURE: FeatureDetail = {
  id: "ai-design-generation",
  icon: Sparkles,
  visual: "designs",
  title: "AI Design Generation",
  tagline: "Original artwork, on demand",
  description:
    "Describe your niche and product idea once. The AI workflow produces original, print-ready designs plus lifestyle mockups across apparel, posters, stickers, and totes.",
  bullets: [
    "Prompt-to-design in minutes, no designer required",
    "Print-ready exports with transparent backgrounds",
    "Auto mockups on shirts, posters, stickers, and totes",
    "Variations per design to test what sells",
  ],
};

export const VIDEO_FEATURE: FeatureDetail = {
  id: "video-creation",
  icon: Clapperboard,
  visual: "video",
  title: "Video Creation",
  tagline: "Listings that move",
  description:
    "Every design ships with a short promo video: animated mockup showcases rendered in listing-ready and vertical formats for Etsy, TikTok, and Reels.",
  bullets: [
    "Auto-generated from your designs, no editing skills needed",
    "Listing-ready landscape plus vertical social cuts",
    "Zoom, rotate, and lifestyle scene transitions",
    "Captions and hooks matched to the listing copy",
  ],
};

export const LISTING_FEATURE: FeatureDetail = {
  id: "etsy-listing-content",
  icon: FileText,
  visual: "listing",
  title: "Etsy Listing Content",
  tagline: "Copy written to rank",
  description:
    "Get complete listing copy tuned for Etsy search: keyword-rich titles, persuasive descriptions, all 13 tags, materials, and attributes filled in.",
  bullets: [
    "SEO titles built from real buyer keywords",
    "Descriptions structured to convert browsers to buyers",
    "Full 13-tag sets plus materials and attributes",
    "Tone matched to your shop and niche",
  ],
};

export const BATCH_FEATURE: FeatureDetail = {
  id: "batch-processing",
  icon: Layers,
  visual: "batch",
  title: "Batch Processing",
  tagline: "One upload, hundreds of listings",
  description:
    "Drop a single CSV with your product ideas and let the workflow run: designs, videos, and listing content generated for the whole batch while you review by exception.",
  bullets: [
    "CSV import for ideas, niches, and product types",
    "Parallel generation across the entire batch",
    "Live progress per item with retry on failures",
    "Review queue that surfaces only what needs you",
  ],
};

export const PLATFORMS_FEATURE: FeatureDetail = {
  id: "platform-integrations",
  icon: Store,
  visual: "platforms",
  title: "Platform Integrations",
  tagline: "Publish everywhere in one click",
  description:
    "Approved listings go live straight from APCS. Designs, mockups, videos, and copy are packaged and pushed to Etsy and connected marketplaces with inventory in sync.",
  bullets: [
    "One-click publish to Etsy with all assets attached",
    "Printify connection for seamless fulfillment",
    "Listings stay in sync when you edit in APCS",
    "Draft mode for final review before going live",
  ],
};

export const FEATURE_DETAILS: FeatureDetail[] = [
  DESIGN_FEATURE,
  VIDEO_FEATURE,
  LISTING_FEATURE,
  BATCH_FEATURE,
  PLATFORMS_FEATURE,
];

export const FEATURES_CTA_CONTENT = {
  title: "Ready to launch your first batch?",
  description:
    "Upload one product idea and watch the workflow generate, score, and publish it.",
  primaryCta: { label: "Get started for free", href: "/#signup" },
  secondaryCta: { label: "Back to home", href: "/" },
} as const;

export const BATCH_ROWS: BatchRow[] = [
  {
    name: "spring-drop-120.csv",
    status: "Done",
    progressClass: "w-full",
    badgeVariant: "default",
  },
  {
    name: "summer-tees-084.csv",
    status: "Processing 61 / 84",
    progressClass: "w-3/4",
    badgeVariant: "secondary",
  },
  {
    name: "fall-poster-040.csv",
    status: "Queued",
    progressClass: "w-0",
    badgeVariant: "outline",
  },
];

export const DESIGN_TILES: DesignTile[] = [
  {
    icon: Shirt,
    label: "Vintage Tee",
    tileClass: "from-amber-200 via-orange-100 to-stone-100",
  },
  {
    icon: Palette,
    label: "Floral Poster",
    tileClass: "from-rose-200 via-pink-100 to-stone-100",
  },
  {
    icon: Sticker,
    label: "Die-cut Sticker",
    tileClass: "from-sky-200 via-cyan-100 to-stone-100",
  },
  {
    icon: ShoppingBag,
    label: "Canvas Tote",
    tileClass: "from-emerald-200 via-lime-100 to-stone-100",
  },
];

export const LISTING_TAGS = [
  "vintage sunset shirt",
  "retro tee",
  "gift for him",
  "graphic tshirt",
  "70s style",
  "birthday gift",
] as const;

export const LISTING_CHECKS = [
  "Keyword-rich title",
  "13 / 13 tags filled",
  "Materials + attributes set",
] as const;

export const CONNECTED_PLATFORMS: ConnectedPlatform[] = [
  { icon: Store, name: "Etsy", detail: "128 live listings" },
  { icon: Plug, name: "Printify", detail: "Fulfillment synced" },
];
