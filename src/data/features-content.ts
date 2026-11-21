import {
  Clapperboard,
  FileText,
  Layers,
  Plug,
  Sparkles,
  Store,
} from "lucide-react";

import type { BatchRow, ConnectedPlatform, FeatureDetail } from "@/types/features";

export const FEATURES_INTRO = {
  title: "Everything Podivo automates",
  description:
    "Designs, mockups, promo videos, Etsy listings, and batch runs, connected in one AI workflow.",
} as const;

export const DESIGN_FEATURE: FeatureDetail = {
  id: "ai-design-generation",
  icon: Sparkles,
  visual: "designs",
  title: "AI Design Generation",
  tagline: "Original artwork, on demand",
  description:
    "Describe your niche and product idea once. The AI workflow produces original, print-ready designs plus mockups on t-shirts, hoodies, mugs, posters, and tote bags.",
  bullets: [
    "Prompt-to-design in minutes, no designer required",
    "Print-ready exports with transparent backgrounds",
    "Auto mockups on tees, hoodies, mugs, posters, and totes",
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
    "Turn approved mockups into short promo videos: animated product showcases rendered in vertical format for Etsy listings and social feeds.",
  bullets: [
    "Auto-generated from your designs, no editing skills needed",
    "Vertical 9:16 videos for Etsy listings and social feeds",
    "Zoom, rotate, and lifestyle scene transitions",
    "Background music from a built-in track library",
  ],
};

export const LISTING_FEATURE: FeatureDetail = {
  id: "etsy-listing-content",
  icon: FileText,
  visual: "listing",
  title: "Etsy Listing Content",
  tagline: "Copy written to rank",
  description:
    "Get complete listing copy tuned for Etsy search: keyword-rich titles, persuasive descriptions, and all 13 tags, with an SEO score before you approve.",
  bullets: [
    "SEO titles built from real buyer keywords",
    "Descriptions structured to convert browsers to buyers",
    "Full 13-tag sets with an SEO score and clear fixes",
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
    "Fill in one Excel template with your product ideas and let the workflow run: designs, videos, and listing content generated for the whole batch while you review by exception.",
  bullets: [
    "Excel import for up to 500 products with niches and keywords",
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
  tagline: "From studio to shop in one click",
  description:
    "Approved listings leave Podivo fully packaged. Designs, mockups, videos, and copy go to Etsy as a draft listing, or to Printify for fulfillment and publishing.",
  bullets: [
    "One-click Etsy draft with images and video attached",
    "Printify connection for seamless fulfillment",
    "Sync Printify products after you edit in Podivo",
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
  description: "Upload one product idea and watch the workflow generate, score, and send it to your shop.",
  primaryCta: { label: "Get started for free", href: "/register" },
  secondaryCta: { label: "Back to home", href: "/" },
} as const;

export const BATCH_ROWS: BatchRow[] = [
  {
    name: "spring-drop-120.xlsx",
    status: "Done",
    progressClass: "w-full",
    badgeVariant: "default",
  },
  {
    name: "summer-tees-084.xlsx",
    status: "Processing 61 / 84",
    progressClass: "w-3/4",
    badgeVariant: "outline",
  },
  {
    name: "fall-poster-040.xlsx",
    status: "Queued",
    progressClass: "w-0",
    badgeVariant: "outline",
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
  "SEO score with clear fixes",
] as const;

export const CONNECTED_PLATFORMS: ConnectedPlatform[] = [
  { icon: Store, name: "Etsy", detail: "Drafts with all assets" },
  { icon: Plug, name: "Printify", detail: "Fulfillment synced" },
];
