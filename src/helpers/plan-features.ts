import type { Entitlements, PlanFeatureFlag } from "@/types/subscription";

export type PlanFeatureCode =
  | "design_variations"
  | "auto_approval"
  | "custom_mockup_templates"
  | "lifestyle_mockup"
  | "listing_regenerate"
  | "all_video_formats"
  | "ai_video"
  | "studio_keyframe"
  | "daily_mockup_cap"
  | "daily_listing_cap"
  | "daily_video_cap"
  | "workflow_listing"
  | "workflow_publish";

type PlanFeatureDefinition = {
  code: PlanFeatureCode;
  label: string;
  kind: "flag" | "limit";
  group: string;
  description: string;
};

// Mirrors PlanFeatures.All on the backend, in the same order.
export const PLAN_FEATURES: PlanFeatureDefinition[] = [
  {
    code: "design_variations",
    label: "Design variations per product",
    kind: "limit",
    group: "Design images",
    description: "How many design variations a Seller can generate for one product.",
  },
  {
    code: "auto_approval",
    label: "Automatic design approval",
    kind: "flag",
    group: "Design images",
    description: "Approve generated designs automatically instead of reviewing each one.",
  },
  {
    code: "custom_mockup_templates",
    label: "Custom mockup templates",
    kind: "flag",
    group: "Mockups",
    description: "Create and edit the Seller's own mockup templates and garment masks.",
  },
  {
    code: "lifestyle_mockup",
    label: "Lifestyle mockups (AI)",
    kind: "flag",
    group: "Mockups",
    description: "Generate lifestyle mockups with the Seller's own Gemini key.",
  },
  {
    code: "listing_regenerate",
    label: "Listing regeneration and SEO score",
    kind: "flag",
    group: "Listing",
    description: "Regenerate a listing and score its SEO.",
  },
  {
    code: "all_video_formats",
    label: "Landscape video",
    kind: "flag",
    group: "Video",
    description: "Render standard videos in landscape as well as square and portrait.",
  },
  {
    code: "ai_video",
    label: "AI video (Veo)",
    kind: "flag",
    group: "Video",
    description: "Build videos from AI scenes, billed to the Seller's own Google key.",
  },
  {
    code: "studio_keyframe",
    label: "AI studio keyframes",
    kind: "flag",
    group: "Video",
    description: "Generate AI studio start frames for AI video scenes.",
  },
  {
    code: "daily_mockup_cap",
    label: "Daily mockup safety cap",
    kind: "limit",
    group: "Safety caps",
    description: "Most mockups rendered per day. Leave empty for no cap.",
  },
  {
    code: "daily_listing_cap",
    label: "Daily listing safety cap",
    kind: "limit",
    group: "Safety caps",
    description: "Most listings generated per day. Leave empty for no cap.",
  },
  {
    code: "daily_video_cap",
    label: "Daily video safety cap",
    kind: "limit",
    group: "Safety caps",
    description: "Most standard videos rendered per day. Leave empty for no cap.",
  },
  {
    code: "workflow_listing",
    label: "Listing content",
    kind: "flag",
    group: "Workflow",
    description: "Write listing titles, tags and descriptions, in a workflow or on their own.",
  },
  {
    code: "workflow_publish",
    label: "Publish to Etsy and Printify",
    kind: "flag",
    group: "Workflow",
    description: "Publish finished products to Etsy and Printify, once those steps are available.",
  },
];

export const isSafetyCap = (code: string) => code.startsWith("daily_");

// A flag with no row is off; a limit with no row has no limit (how the backend reads them).
export const readPlanFeature = (features: PlanFeatureFlag[], code: PlanFeatureCode) => {
  const definition = PLAN_FEATURES.find((feature) => feature.code === code);
  const row = features.find((feature) => feature.featureCode === code);
  if (row) {
    return { isEnabled: row.isEnabled, limitValue: row.limitValue };
  }
  return { isEnabled: definition?.kind === "limit", limitValue: null };
};

export const hasFeature = (entitlements: Entitlements | undefined, code: PlanFeatureCode) =>
  entitlements?.features.find((feature) => feature.code === code)?.isEnabled ?? false;

// The feature's limit, or null for no limit. Undefined while entitlements are loading.
export const featureLimit = (entitlements: Entitlements | undefined, code: PlanFeatureCode) =>
  entitlements?.features.find((feature) => feature.code === code)?.limitValue;

export const formatPlanLimit = (value: number) => (value < 0 ? "No limit" : value.toLocaleString());

// Workflow steps a plan must include before they can be added to a workflow.
const NODE_FEATURES: Partial<Record<string, PlanFeatureCode>> = {
  "generate-listing": "workflow_listing",
  "publish-etsy": "workflow_publish",
  "publish-printify": "workflow_publish",
};

// True when the Seller's plan does not include the step. False while entitlements are loading, so a
// step is never shown locked by mistake; the backend refuses it either way.
export const isNodeLocked = (entitlements: Entitlements | undefined, nodeType: string) => {
  const feature = NODE_FEATURES[nodeType];
  return feature !== undefined && entitlements !== undefined && !hasFeature(entitlements, feature);
};

export type PlanIssue = {
  message: string;
  // Config changes that bring the step back within the plan.
  fix?: { label: string; patch: Record<string, unknown> };
};

// What in a workflow step's settings the Seller's plan does not cover. The backend refuses these at
// run time; showing them on the step lets the Seller fix them before running.
export const planIssues = (
  entitlements: Entitlements,
  nodeType: string,
  config: Record<string, unknown>
): PlanIssue[] => {
  const issues: PlanIssue[] = [];
  if (nodeType === "generate-listing" && !hasFeature(entitlements, "workflow_listing")) {
    issues.push({ message: "Listing content is part of Pro. Remove this step to run the workflow on your plan." });
  }
  if ((nodeType === "publish-etsy" || nodeType === "publish-printify") && !hasFeature(entitlements, "workflow_publish")) {
    issues.push({ message: "Publishing is part of Pro." });
  }
  if (nodeType === "design-image") {
    const maxVariations = featureLimit(entitlements, "design_variations");
    if (typeof maxVariations === "number" && Number(config.variants) > maxVariations) {
      issues.push({
        message: `Your plan generates up to ${maxVariations} variation${maxVariations === 1 ? "" : "s"} per product.`,
        fix: { label: `Use ${maxVariations}`, patch: { variants: maxVariations } },
      });
    }
  }
  if (
    nodeType === "design-approval" &&
    config.mode === "auto" &&
    !hasFeature(entitlements, "auto_approval")
  ) {
    issues.push({
      message: "Automatic approval is part of Pro.",
      fix: { label: "Use manual review", patch: { mode: "manual" } },
    });
  }
  if (nodeType === "generate-video") {
    if (config.mode === "ai_shot" && !hasFeature(entitlements, "ai_video")) {
      issues.push({
        message: "AI Scene Video is part of Pro. Your plan renders Standard Showcase videos.",
        fix: { label: "Use Standard Showcase", patch: { mode: "standard" } },
      });
    }
    if (config.outputFormat === "landscape" && !hasFeature(entitlements, "all_video_formats")) {
      issues.push({
        message: "Landscape video is part of Pro. Your plan renders square and portrait.",
        fix: { label: "Use portrait", patch: { outputFormat: "portrait" } },
      });
    }
  }
  return issues;
};
