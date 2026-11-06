import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  Clapperboard,
  FileCheck2,
  Hourglass,
  ImageIcon,
  Layers,
  PlugZap,
  SearchCheck,
  UploadCloud,
} from "lucide-react";

import type {
  ActionItemSeverity,
  ActionItemType,
  DashboardPeriod,
  PipelineStageKey,
} from "@/types/seller-dashboard";

export const DASHBOARD_PERIODS: { days: DashboardPeriod; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStageKey, string> = {
  queued: "Queued",
  designing: "Designing",
  design_review: "Design review",
  mockup: "Mockups",
  video: "Video",
  listing: "Listing",
  ready: "Ready",
  published: "Published",
};

/** How each kind of waiting work reads, by count, and what its button says. */
export const ACTION_ITEM_COPY: Record<
  ActionItemType,
  { singular: string; plural: string; action: string }
> = {
  etsy_reconnect: {
    singular: "Etsy connection expired",
    plural: "Etsy connections expired",
    action: "Reconnect",
  },
  etsy_upload_failed: {
    singular: "Etsy upload failed",
    plural: "Etsy uploads failed",
    action: "Retry",
  },
  batch_failed: {
    singular: "batch job failed recently",
    plural: "batch jobs failed recently",
    action: "Open",
  },
  video_failed: {
    singular: "product video failed to render",
    plural: "product videos failed to render",
    action: "Re-render",
  },
  stuck_products: {
    singular: "product is taking longer than usual",
    plural: "products are taking longer than usual",
    action: "Check",
  },
  design_review: {
    singular: "design waits for your review",
    plural: "designs wait for your review",
    action: "Review",
  },
  listing_review: {
    singular: "listing waits for approval",
    plural: "listings wait for approval",
    action: "Review",
  },
  video_review: {
    singular: "video waits for approval",
    plural: "videos wait for approval",
    action: "Review",
  },
  low_seo: {
    singular: "listing scores below 60 for SEO",
    plural: "listings score below 60 for SEO",
    action: "Improve",
  },
};

export const ACTION_ITEM_ICONS: Record<ActionItemType, LucideIcon> = {
  etsy_reconnect: PlugZap,
  etsy_upload_failed: UploadCloud,
  batch_failed: Layers,
  video_failed: AlertOctagon,
  stuck_products: Hourglass,
  design_review: ImageIcon,
  listing_review: FileCheck2,
  video_review: Clapperboard,
  low_seo: SearchCheck,
};

/** The tinted chip behind an action item's icon; the section heading names the severity. */
export const SEVERITY_ICON_CLASSES: Record<ActionItemSeverity, string> = {
  critical: "bg-rose-100 text-rose-700",
  error: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
};

/** The stages where products wait on the Seller rather than on a worker. */
export const REVIEW_STAGES: ReadonlySet<PipelineStageKey> = new Set(["design_review", "listing"]);

/** The first steps of a Seller who has made nothing yet. */
export const ONBOARDING_STEPS = [
  {
    key: "style",
    title: "Pick a style",
    description: "Choose an art style preset your designs will follow.",
    href: "/styles",
  },
  {
    key: "batch",
    title: "Create a batch",
    description: "Import a CSV or add products by hand.",
    href: "/batches",
  },
  {
    key: "review",
    title: "Review the designs",
    description: "Approve the AI designs you want to sell.",
    href: "/batches",
  },
  {
    key: "workflow",
    title: "Build mockups, video and listing",
    description: "Run a workflow to turn approved designs into a listing.",
    href: "/workflows",
  },
] as const;
