import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  ChartColumn,
  HeartHandshake,
  PiggyBank,
  Rocket,
  Users,
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
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO_CONTENT = {
  title: "Scale Your POD Empire at AI Speed",
  description:
    "Turn product ideas into designs, copy, and Etsy-ready listings in minutes with AI.",
  primaryCta: { label: "Get started for free", href: "#signup" },
  secondaryCta: { label: "See how it works", href: "#workflow" },
} as const;

export const HERO_IMAGE = {
  src: "/images/landing/hero-dashboard.jpg",
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
  eyebrow: "Comprehensive Ecosystem",
  title: "Everything you need for professional operations",
  description:
    "Catalogs, team workflows, and revenue analytics unified in one platform.",
} as const;

export const ECOSYSTEM_FEATURES: EcosystemFeature[] = [
  {
    icon: BookOpen,
    title: "Digital Catalog",
    description: "Update seasonal products in seconds without recreating listings.",
  },
  {
    icon: Activity,
    title: "Real-time Analytics",
    description: "Spot best-sellers, peak hours, and repeat customers.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Role-based access, performance tracking, and visual scheduling.",
  },
  {
    icon: HeartHandshake,
    title: "Customer Loyalty",
    description: "Automated points and rewards that bring buyers back.",
  },
];

export const WORKFLOW_CONTENT = {
  eyebrow: "Workflow",
  title: "Deploy in 3 simple steps",
  description: "Keep your current setup. Your team can operate starting today.",
} as const;

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    index: "01",
    title: "Upload Product Info",
    description: "Drop in product details or CSV files to start batch processing.",
    imageSrc: "/images/landing/workflow-upload.jpg",
    imageAlt: "Spreadsheet data transforming into a stream of particles",
  },
  {
    index: "02",
    title: "AI Generates Content",
    description: "AI creates designs, videos, and listings from your data.",
    imageSrc: "/images/landing/workflow-ai.jpg",
    imageAlt: "AI generating designs and apparel mockups on glass panels",
  },
  {
    index: "03",
    title: "Publish to Etsy",
    description: "Package every asset and push your listings live in one click.",
    imageSrc: "/images/landing/workflow-etsy.jpg",
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
