import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  Clapperboard,
  FileText,
  Layers,
  PiggyBank,
  Printer,
  Rocket,
  Sparkles,
  Store,
} from "lucide-react";

import type { NavItem } from "@/types/navigation";

export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Which product illustration a features tile draws. */
export type FeatureVisualId = "design" | "video" | "listing" | "batch" | "platforms";

export interface EcosystemFeature {
  id: FeatureVisualId;
  icon: LucideIcon;
  title: string;
  description: string;
}

/** Which small product illustration a workflow step draws. */
export type WorkflowVisualId = "upload" | "generate" | "seo" | "send";

export interface WorkflowStep {
  index: string;
  title: string;
  description: string;
  visual: WorkflowVisualId;
}

export interface PreviewDesign {
  name: string;
  productType: string;
  imageSrc: string;
}

export interface ComparisonRow {
  label: string;
  value: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export const NAV_LINKS: NavItem[] = [
  { label: "Features", href: "/features", kind: "route" },
  { label: "Workflow", href: "workflow", kind: "section" },
  { label: "FAQ", href: "faq", kind: "section" },
];

export const HERO_CONTENT = {
  eyebrow: "AI content studio for Etsy POD",
  titleLead: "Scale Your POD Empire at",
  titleHighlight: "AI Speed",
  description: "Turn product ideas into designs, copy, and Etsy-ready listings in minutes with AI.",
  primaryCta: { label: "Get started for free", href: "/login" },
  secondaryCta: { label: "See how it works", href: "#workflow" },
  worksWithLabel: "Works with",
  worksWith: [
    { name: "Etsy", icon: Store },
    { name: "Printify", icon: Printer },
  ],
} as const;

/** Sample artwork from the built-in design templates, shown in the product previews. */
export const PREVIEW_DESIGNS: PreviewDesign[] = [
  { name: "Desert Horizon", productType: "T-shirt", imageSrc: "/images/design-templates/desert-horizon.webp" },
  { name: "Campfire Crest", productType: "Poster", imageSrc: "/images/design-templates/campfire-crest.webp" },
  { name: "Blue Garden", productType: "Tote bag", imageSrc: "/images/design-templates/blue-garden.webp" },
  { name: "Coffee Geometry", productType: "Mug", imageSrc: "/images/design-templates/coffee-geometry.webp" },
];

export const HERO_PREVIEW = {
  address: "podivo / batches / autumn-drop",
  batchName: "Autumn drop",
  batchDetail: "24 products",
  progressLabel: "Generating",
  progressPercent: 86,
  tagsLine: "13/13 tags filled",
  tagsDetail: "vintage desert tee, camping poster, floral tote",
} as const;

export const BENEFITS_CONTENT = {
  title: "Outstanding Benefits",
  description:
    "An integrated solution from generation to store management, helping your POD business grow sustainably.",
} as const;

export const BENEFITS: Benefit[] = [
  {
    icon: Rocket,
    title: "Accelerate Operations",
    description:
      "Run whole batches of products through design, mockup, video, and listing generation, cutting busywork during peak seasons.",
  },
  {
    icon: PiggyBank,
    title: "Save Costs",
    description: "Reduce overhead and run lean while keeping every listing professional.",
  },
  {
    icon: ChartColumn,
    title: "Smart Management",
    description: "Track shop sales, generation progress, and plan usage from one dashboard.",
  },
];

export const ECOSYSTEM_CONTENT = {
  title: "Everything you need to launch POD listings",
  description:
    "Designs, videos, listing copy, batch runs, and publishing unified in one AI workflow.",
  cta: { label: "Explore all features", href: "/features" },
} as const;

export const ECOSYSTEM_FEATURES: EcosystemFeature[] = [
  {
    id: "design",
    icon: Sparkles,
    title: "AI Design Generation",
    description:
      "Turn product ideas and prompts into original, print-ready designs and mockups in minutes.",
  },
  {
    id: "video",
    icon: Clapperboard,
    title: "Video Creation",
    description:
      "Auto-generate vertical promo videos and mockup showcases from your designs for listings and socials.",
  },
  {
    id: "listing",
    icon: FileText,
    title: "Etsy Listing Content",
    description: "Get SEO-ready titles, descriptions, tags, and attributes tuned for Etsy search.",
  },
  {
    id: "batch",
    icon: Layers,
    title: "Batch Processing",
    description:
      "Import up to 500 products from one Excel sheet and generate designs, videos, and listings in a single run.",
  },
  {
    id: "platforms",
    icon: Store,
    title: "Platform Integrations",
    description:
      "Send approved listings to Etsy as drafts with images and video attached, or publish through Printify.",
  },
];

export const WORKFLOW_CONTENT = {
  title: "From product idea to Etsy-ready listing in 4 steps",
  description: "Upload once. Podivo runs the AI workflow, scores SEO, and sends listings to your shop.",
} as const;

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    index: "01",
    title: "Upload Product Info",
    description:
      "Add your product idea, niche, and keywords, one at a time or in bulk from an Excel sheet, to kick off the workflow.",
    visual: "upload",
  },
  {
    index: "02",
    title: "AI Generates Assets",
    description:
      "The connected AI workflow creates designs, mockup images, promo video, and full listing copy with titles, descriptions, and tags.",
    visual: "generate",
  },
  {
    index: "03",
    title: "Review SEO Score",
    description:
      "Every listing gets an SEO score with clear fixes. Approve only when titles, tags, and copy are ready to rank.",
    visual: "seo",
  },
  {
    index: "04",
    title: "Send to Your Shop",
    description:
      "Send approved listings to Etsy as drafts with all assets attached, or publish them through Printify.",
    visual: "send",
  },
];

export const COMPARISON_CONTENT = {
  title: "See how much time you save",
  description: "Automating 100 listings per month.",
  footnote: "Illustrative example based on 100 listings per month.",
  manualTitle: "Manual Process",
  manualTotal: { value: "110", unit: "hrs/mo" },
  apcsTitle: "With Podivo",
  apcsTotal: { value: "6", unit: "hrs/mo" },
} as const;

export const MANUAL_ROWS: ComparisonRow[] = [
  { label: "Design creation", value: "50 hours" },
  { label: "Mockup generation", value: "20 hours" },
  { label: "SEO and copywriting", value: "25 hours" },
  { label: "Manual publishing", value: "15 hours" },
];

export const APCS_ROWS: ComparisonRow[] = [
  { label: "Spreadsheet preparation", value: "2 hours" },
  { label: "AI generation", value: "Automated" },
  { label: "Review and tweak", value: "3 hours" },
  { label: "1-click send to shop", value: "< 1 hour" },
];

export const FAQ_CONTENT = {
  supportHint: "Can't find your answer?",
  supportCta: { label: "Contact support", href: "/support" },
  title: "Frequently Asked Questions",
  description: "Common questions before you start.",
} as const;

export const FAQS: Faq[] = [
  {
    question: "How long does setup take?",
    answer:
      "Creating an account takes a minute. Filling in the Excel template for your first batch usually takes 15 to 30 minutes.",
  },
  {
    question: "Do I need additional hardware?",
    answer: "No. Podivo runs on the web, so your existing computer is enough to manage generation.",
  },
  {
    question: "What do the plans include?",
    answer:
      "Each plan comes with a monthly quota for designs, mockups, videos, and listings. Pro adds AI video, lifestyle mockups, and automatic approval. You can check your remaining usage at any time.",
  },
  {
    question: "How does support work?",
    answer:
      "Open a support ticket from your dashboard, attach screenshots if needed, and our team replies to you there.",
  },
];

export const CTA_CONTENT = {
  title: "Ready to build your Print-on-Demand portfolio?",
  description: "Join creators automating their workflow with professional AI generation.",
  primaryCta: { label: "Get started for free", href: "/register" },
} as const;

export const FOOTER_CONTENT = {
  brand: "Podivo",
  copyright: "Podivo. All rights reserved.",
  links: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "API Docs", href: "#" },
  ],
} as const;
