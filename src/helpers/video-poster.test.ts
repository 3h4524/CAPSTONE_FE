import { describe, expect, it } from "vitest";

import { videoPosterUrl } from "@/helpers/video-poster";
import type { PromoVideo } from "@/types/video-workflow";

const base = { id: "v", runId: "r", mode: "standard", template: "t", version: 1, reviewRevision: 1, status: "ready", approvalStatus: "pending",
  previewUrl: null, thumbnailUrl: null, qa: {}, scenes: [], outputFormat: "portrait", width: 1080, height: 1920, aspectRatio: "9:16" } satisfies PromoVideo;

const withPreview = (): PromoVideo => ({
  ...base,
  preview: {
    storyboard: { template: "t", templateVersion: 2, durationSeconds: 6, productType: "tshirt", fingerprint: "f", outputFormat: "portrait",
      width: 1080, height: 1920, aspectRatio: "9:16", scenes: [{ mockupId: "m1", sourceRevision: 1, sourceHash: "h", role: "Hero", sceneOrder: 0,
        durationFrames: 90, crop: { x: 0, y: 0, width: 1, height: 1 }, endCrop: { x: 0, y: 0, width: 1, height: 1 }, motion: "static",
        transition: "none", text: "", generationStrategy: "standard", warnings: [] }] },
    sources: { m1: { url: "https://signed/m1.png", width: 10, height: 10 } },
    clips: {},
  },
});

describe("videoPosterUrl", () => {
  it("prefers the thumbnail of a finished video", () => {
    expect(videoPosterUrl({ ...withPreview(), thumbnailUrl: "https://signed/thumb.png", status: "completed" })).toBe("https://signed/thumb.png");
  });

  it("falls back to the first scene's mock-up while the video has no file", () => {
    expect(videoPosterUrl(withPreview())).toBe("https://signed/m1.png");
  });

  it("is null when nothing stands for the video", () => {
    expect(videoPosterUrl(base)).toBeNull();
    expect(videoPosterUrl(undefined)).toBeNull();
  });
});
