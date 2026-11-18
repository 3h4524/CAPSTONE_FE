import { describe, expect, it } from "vitest";

import { PAGE_GUIDE_VERSIONS } from "@/constants/onboarding";
import { guideStartStep, needsGuide } from "@/helpers/onboarding-guide";
import type { OnboardingProgress } from "@/types/onboarding";

const progress = (
  guides: OnboardingProgress["guideProgress"] = {}
): OnboardingProgress => ({
  guideProgress: guides,
  checklistDismissed: false,
  signals: {
    apiKeyConnected: false,
    batchCreated: false,
    mockupTemplateUploaded: false,
    workflowRunStarted: false,
  },
});

const version = PAGE_GUIDE_VERSIONS.batches;

describe("needsGuide", () => {
  it("opens when the user has no progress at all", () => {
    expect(needsGuide(undefined, "batches")).toBe(true);
    expect(needsGuide(progress(), "batches")).toBe(true);
  });

  it("stays closed after the guide was completed or skipped", () => {
    for (const status of ["completed", "skipped"] as const) {
      expect(needsGuide(progress({ batches: { version, status, step: 2 } }), "batches")).toBe(false);
    }
  });

  it("opens again when the guide was left midway", () => {
    expect(needsGuide(progress({ batches: { version, status: "active", step: 1 } }), "batches")).toBe(true);
  });

  it("opens again when the guide's version changed", () => {
    expect(
      needsGuide(progress({ batches: { version: version + 1, status: "completed", step: 3 } }), "batches")
    ).toBe(true);
  });

  it("keeps each guide independent", () => {
    const data = progress({ batches: { version, status: "completed", step: 3 } });

    expect(needsGuide(data, "batches")).toBe(false);
    expect(needsGuide(data, "mockups")).toBe(true);
  });
});

describe("guideStartStep", () => {
  it("starts at the first step without a saved entry", () => {
    expect(guideStartStep(undefined, "batches")).toBe(0);
    expect(guideStartStep(progress(), "batches")).toBe(0);
  });

  it("resumes the saved step for the current version", () => {
    expect(guideStartStep(progress({ batches: { version, status: "active", step: 2 } }), "batches")).toBe(2);
  });

  it("starts over when the saved entry belongs to an older version", () => {
    expect(guideStartStep(progress({ batches: { version: version - 1, status: "completed", step: 3 } }), "batches")).toBe(0);
  });
});
