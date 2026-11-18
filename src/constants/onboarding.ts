import type { OnboardingGuideKey, OnboardingSignals } from "@/types/onboarding";

export type GuidePlacement =
  | "center"
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

/** One step of a page guide: the anchor it highlights and the copy that explains it. */
export type PageGuideStep = {
  /** A `data-guide` selector, or `body` for the centered intro. */
  target: string;
  placement: GuidePlacement;
  titleKey: string;
  bodyKey: string;
};

/**
 * Bump a guide's version when its steps change: a newer version auto-opens again for Sellers who
 * completed or skipped the previous one.
 */
export const PAGE_GUIDE_VERSIONS: Record<OnboardingGuideKey, number> = {
  "api-keys": 1,
  batches: 1,
  mockups: 1,
  workflows: 1,
};

export const PAGE_GUIDES: Record<OnboardingGuideKey, PageGuideStep[]> = {
  "api-keys": [
    {
      target: '[data-guide="api-keys.header"]',
      placement: "bottom",
      titleKey: "pageGuides.apiKeys.steps.connect.title",
      bodyKey: "pageGuides.apiKeys.steps.connect.body",
    },
    {
      target: '[data-guide="api-keys.readiness"]',
      placement: "bottom",
      titleKey: "pageGuides.apiKeys.steps.readiness.title",
      bodyKey: "pageGuides.apiKeys.steps.readiness.body",
    },
    {
      target: '[data-guide="api-keys.add"]',
      placement: "left",
      titleKey: "pageGuides.apiKeys.steps.add.title",
      bodyKey: "pageGuides.apiKeys.steps.add.body",
    },
    {
      target: '[data-guide="api-keys.connections"]',
      placement: "top",
      titleKey: "pageGuides.apiKeys.steps.manage.title",
      bodyKey: "pageGuides.apiKeys.steps.manage.body",
    },
  ],
  batches: [
    {
      target: '[data-guide="batches.header"]',
      placement: "bottom",
      titleKey: "pageGuides.batches.steps.start.title",
      bodyKey: "pageGuides.batches.steps.start.body",
    },
    {
      target: '[data-guide="batches.actions"]',
      placement: "bottom",
      titleKey: "pageGuides.batches.steps.actions.title",
      bodyKey: "pageGuides.batches.steps.actions.body",
    },
    {
      target: '[data-guide="batches.list"]',
      placement: "right",
      titleKey: "pageGuides.batches.steps.list.title",
      bodyKey: "pageGuides.batches.steps.list.body",
    },
    {
      target: '[data-guide="batches.products"]',
      placement: "top",
      titleKey: "pageGuides.batches.steps.products.title",
      bodyKey: "pageGuides.batches.steps.products.body",
    },
    {
      target: '[data-guide="batches.help"]',
      placement: "bottom",
      titleKey: "pageGuides.batches.steps.help.title",
      bodyKey: "pageGuides.batches.steps.help.body",
    },
  ],
  mockups: [
    {
      target: '[data-guide="mockups.header"]',
      placement: "bottom",
      titleKey: "pageGuides.mockups.steps.start.title",
      bodyKey: "pageGuides.mockups.steps.start.body",
    },
    {
      target: '[data-guide="mockups.tabs"]',
      placement: "bottom",
      titleKey: "pageGuides.mockups.steps.tabs.title",
      bodyKey: "pageGuides.mockups.steps.tabs.body",
    },
    {
      target: '[data-guide="mockups.templates"]',
      placement: "center",
      titleKey: "pageGuides.mockups.steps.templates.title",
      bodyKey: "pageGuides.mockups.steps.templates.body",
    },
    {
      target: '[data-guide="mockups.models"]',
      placement: "bottom",
      titleKey: "pageGuides.mockups.steps.models.title",
      bodyKey: "pageGuides.mockups.steps.models.body",
    },
  ],
  workflows: [
    {
      target: '[data-guide="workflows.toolbar"]',
      placement: "bottom",
      titleKey: "pageGuides.workflows.steps.start.title",
      bodyKey: "pageGuides.workflows.steps.start.body",
    },
    {
      target: '[data-guide="workflows.palette"]',
      placement: "right",
      titleKey: "pageGuides.workflows.steps.palette.title",
      bodyKey: "pageGuides.workflows.steps.palette.body",
    },
    {
      target: '[data-guide="workflows.canvas"]',
      placement: "center",
      titleKey: "pageGuides.workflows.steps.canvas.title",
      bodyKey: "pageGuides.workflows.steps.canvas.body",
    },
  ],
};

/** The dashboard checklist mirrors the guides; a step is done when the data behind it exists. */
export const ONBOARDING_CHECKLIST_STEPS: ReadonlyArray<{
  signal: keyof OnboardingSignals;
  guide: OnboardingGuideKey;
  copyKey: "apiKeys" | "batches" | "mockups" | "workflows";
  href: string;
}> = [
  { signal: "apiKeyConnected", guide: "api-keys", copyKey: "apiKeys", href: "/api-keys" },
  { signal: "batchCreated", guide: "batches", copyKey: "batches", href: "/batches" },
  { signal: "mockupTemplateUploaded", guide: "mockups", copyKey: "mockups", href: "/mockups" },
  { signal: "workflowRunStarted", guide: "workflows", copyKey: "workflows", href: "/workflows" },
];
