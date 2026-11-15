import { describe, expect, it } from "vitest";

import { videoSyncedStatus } from "@/hooks/use-workflow-runtime";

describe("videoSyncedStatus", () => {
  it("shows Mockup Approval at work while the run is being made ready and no video run exists yet", () => {
    expect(videoSyncedStatus("approval-gate", undefined, true, true)).toMatchObject({ status: "running" });
  });

  it("leaves the other video steps waiting meanwhile", () => {
    expect(videoSyncedStatus("generate-video", undefined, true, true)).toMatchObject({ status: "idle" });
    expect(videoSyncedStatus("review-video", undefined, true, true)).toMatchObject({ status: "idle" });
  });

  it("goes back to what the video run says once it exists", () => {
    const step = { status: "succeeded", stage: null, progress: 100 } as Parameters<typeof videoSyncedStatus>[1];
    expect(videoSyncedStatus("approval-gate", step, true, true)).toMatchObject({ status: "success" });
  });

  it("shows nothing at work when the run is not being made ready", () => {
    expect(videoSyncedStatus("approval-gate", undefined, true, false)).toMatchObject({ status: "idle" });
  });

  it("says nothing about the design steps while a batch job is open", () => {
    expect(videoSyncedStatus("design-image", undefined, true, true)).toBeNull();
  });
});
