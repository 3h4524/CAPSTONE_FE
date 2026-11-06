import { describe, expect, it } from "vitest";

import {
  getImageQualityAttempts,
  getImageQualityLiveFilter,
  getImageQualityLiveHighlights,
} from "@/helpers/image-quality-live";
import type { ImageQualityLiveVersion } from "@/types/admin-image-quality";

const buildVersion = (overrides: Partial<ImageQualityLiveVersion>): ImageQualityLiveVersion => ({
  key: "ideogram:v0-original",
  label: "Ideogram · Original prompt",
  provider: "ideogram",
  sinceUtc: null,
  untilUtc: "2026-10-20T17:00:00.000Z",
  images: 10,
  labeledImages: 0,
  products: 5,
  jobs: 1,
  reviewedImages: 0,
  approvedImages: 0,
  rejectedImages: 0,
  approvalRate: null,
  regenerateRequests: 0,
  regenerateRate: 0,
  failedAttempts: 22,
  blockedAttempts: 0,
  failureRate: 0.6875,
  averageGenerationSeconds: 56.6,
  averageCostUsd: 0.03,
  totalCostUsd: 0.3,
  ...overrides,
});

describe("getImageQualityLiveHighlights", () => {
  it("compares the newest version with the oldest of the same provider", () => {
    const highlights = getImageQualityLiveHighlights([
      buildVersion({ key: "gemini:v0-original", provider: "gemini" }),
      buildVersion({}),
      buildVersion({ key: "ideogram:v1", sinceUtc: "2026-10-20T17:00:00.000Z" }),
      buildVersion({
        key: "ideogram:v2",
        sinceUtc: "2026-10-25T17:00:00.000Z",
        failureRate: 0,
        averageGenerationSeconds: 21.14,
      }),
    ]);

    expect(highlights?.current.key).toBe("ideogram:v2");
    expect(highlights?.baseline?.key).toBe("ideogram:v0-original");
    expect(highlights?.cards.map((card) => [card.value, card.baseline])).toEqual([
      ["0%", "69%"],
      ["0.00", "0.00"],
      ["21.1 s", "56.6 s"],
      ["$0.030", "$0.030"],
    ]);
  });

  it("has no baseline when the provider has one version", () => {
    const highlights = getImageQualityLiveHighlights([buildVersion({})]);

    expect(highlights?.baseline).toBeNull();
    expect(highlights?.cards.every((card) => card.baseline === null)).toBe(true);
  });

  it("returns nothing for an empty period", () => {
    expect(getImageQualityLiveHighlights([])).toBeNull();
  });
});

describe("getImageQualityLiveFilter", () => {
  const now = new Date("2026-10-30T12:00:00.000Z");

  it("leaves the start open for all time", () => {
    expect(getImageQualityLiveFilter("all", now)).toEqual({});
  });

  it("starts 30 days back for the last 30 days", () => {
    expect(getImageQualityLiveFilter("30d", now)).toEqual({
      fromUtc: "2026-09-30T12:00:00.000Z",
    });
  });
});

describe("getImageQualityAttempts", () => {
  it("adds saved images to failed and blocked attempts", () => {
    expect(getImageQualityAttempts(buildVersion({ blockedAttempts: 2 }))).toBe(34);
  });
});
