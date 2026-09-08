import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  Clapperboard,
  FileText,
  Layers,
  PiggyBank,
  Rocket,
  Sparkles,
  Store,
} from "lucide-react";

export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
  isFeatured: boolean;
}

export interface EcosystemFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface WorkflowStep {
  index: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export interface ComparisonRow {
  label: string;
  value: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Workflow", href: "/#workflow" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const HERO_CONTENT = {
  title: "Scale Your POD Empire at AI Speed",
  description:
    "Turn product ideas into designs, copy, and Etsy-ready listings in minutes with AI.",
  primaryCta: { label: "Get started for free", href: "#signup" },
  secondaryCta: { label: "See how it works", href: "#workflow" },
} as const;

export const HERO_IMAGE = {
  src: "/images/landing/hero-dashboard.webp",
  alt: "APCS Studio dashboard showing AI design generation progress and product mockup thumbnails",
} as const;

export const BENEFITS: Benefit[] = [
  {
    icon: Rocket,
    title: "Accelerate Operations",
    description:
      "Automate manual tasks and process large volumes of data directly, cutting busywork during peak operations.",
    isFeatured: true,
  },
  {
    icon: PiggyBank,
    title: "Save Costs",
    description:
      "Reduce overhead and run lean while keeping every listing professional.",
    isFeatured: false,
  },
  {
    icon: ChartColumn,
    title: "Smart Management",
    description:
      "Track revenue, queues, and operational performance in real time.",
    isFeatured: false,
  },
];

export const ECOSYSTEM_CONTENT = {
  eyebrow: "Features",
  title: "Everything you need to launch POD listings",
  description:
    "Designs, videos, listing copy, batch runs, and publishing unified in one AI workflow.",
  cta: { label: "Explore all features", href: "/features" },
} as const;

export const ECOSYSTEM_FEATURES: EcosystemFeature[] = [
  {
    icon: Sparkles,
    title: "AI Design Generation",
    description:
      "Turn product ideas and prompts into original, print-ready designs and mockups in minutes.",
  },
  {
    icon: Clapperboard,
    title: "Video Creation",
    description:
      "Auto-generate promo videos and mockup showcases from your designs for listings and socials.",
  },
  {
    icon: FileText,
    title: "Etsy Listing Content",
    description:
      "Get SEO-ready titles, descriptions, tags, and attributes tuned for Etsy search.",
  },
  {
    icon: Layers,
    title: "Batch Processing",
    description:
      "Upload once via CSV and generate hundreds of designs, videos, and listings in a single run.",
  },
  {
    icon: Store,
    title: "Platform Integrations",
    description:
      "Push approved listings straight to Etsy and other marketplaces in one click, assets included.",
  },
];

export const WORKFLOW_CONTENT = {
  eyebrow: "How it works",
  title: "From product idea to published listing in 4 steps",
  description:
    "Upload once. APCS runs the AI workflow, scores SEO, and publishes everywhere.",
} as const;

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    index: "01",
    title: "Upload Product Info",
    description:
      "Drop in your product idea, niche, and details, single item or bulk CSV, to kick off the workflow.",
    imageSrc: "/images/landing/workflow-upload.webp",
    imageAlt: "Spreadsheet data transforming into a stream of particles",
  },
  {
    index: "02",
    title: "AI Generates Assets",
    description:
      "The connected AI workflow creates designs, mockup images, promo video, and full listing copy with titles, descriptions, and tags.",
    imageSrc: "/images/landing/workflow-ai.webp",
    imageAlt: "AI generating designs and apparel mockups on glass panels",
  },
  {
    index: "03",
    title: "Review SEO Score",
    description:
      "Every listing gets an SEO score with clear fixes. Approve only when titles, tags, and copy are ready to rank.",
    imageSrc: "/images/landing/seo-score.webp",
    imageAlt: "Dashboard showing SEO scores and listing quality checks",
  },
  {
    index: "04",
    title: "Publish Everywhere",
    description:
      "Push approved listings live to Etsy and other platforms in one click, assets included.",
    imageSrc: "/images/landing/workflow-etsy.webp",
    imageAlt: "Storefront icon with growth charts and publish notifications",
  },
];

export const COMPARISON_CONTENT = {
  title: "See how much time you save",
  description: "Automating 100 listings per month.",
  footnote: "Illustrative example based on 100 listings per month.",
  manualTitle: "Manual Process",
  manualTotal: { value: "110", unit: "hrs/mo" },
  apcsTitle: "With APCS",
  apcsTotal: { value: "6", unit: "hrs/mo" },
} as const;

export const MANUAL_ROWS: ComparisonRow[] = [
  { label: "Design creation", value: "50 hours" },
  { label: "Mockup generation", value: "20 hours" },
  { label: "SEO and copywriting", value: "25 hours" },
  { label: "Manual publishing", value: "15 hours" },
];

export const APCS_ROWS: ComparisonRow[] = [
  { label: "CSV preparation", value: "2 hours" },
  { label: "AI generation", value: "Automated" },
  { label: "Review and tweak", value: "3 hours" },
  { label: "1-click publish", value: "< 1 hour" },
];

export const FAQ_CONTENT = {
  title: "Frequently Asked Questions",
  description: "Common questions before you start.",
} as const;

export const FAQS: Faq[] = [
  {
    question: "How long does setup take?",
    answer:
      "Uploading your first batch takes 15 to 30 minutes. Our team helps you operate the same day.",
  },
  {
    question: "Do I need additional hardware?",
    answer:
      "No. APCS runs on the web, so your existing computer is enough to manage generation.",
  },
  {
    question: "Does the plan cover everything?",
    answer:
      "The package includes storage, security, and feature updates with no hidden costs.",
  },
  {
    question: "How does support work?",
    answer:
      "Our team replies 24/7 via chat and email, with critical issues prioritized for remote handling.",
  },
];

export const CTA_CONTENT = {
  title: "Ready to build your Print-on-Demand portfolio?",
  description:
    "Join creators automating their workflow with professional AI generation.",
  primaryCta: { label: "Get started for free", href: "#signup" },
} as const;

export const FOOTER_CONTENT = {
  brand: "APCS",
  copyright: "AI POD Content Studio (APCS). All rights reserved.",
  links: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "API Docs", href: "#" },
  ],
} as const;
