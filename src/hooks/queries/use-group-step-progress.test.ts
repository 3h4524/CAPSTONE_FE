import { describe, expect, it } from "vitest";

import { groupStepProgress } from "@/hooks/queries/use-group-step-progress";
import type { RunGroupTarget } from "@/types/video-workflow";

const step = (status: string, progress = 0) => ({ status, progress, stage: null, error: null });
const targets = (secondRender = "running"): RunGroupTarget[] => [
  { runId: "one", generateVideo: step("succeeded", 100), reviewVideo: step("succeeded"), exportZip: step("pending") },
  { runId: "two", generateVideo: step(secondRender, 40), reviewVideo: step("pending"), exportZip: step("pending") },
] as RunGroupTarget[];

describe("groupStepProgress", () => {
  it("keeps export idle and review unfinished while another video renders", () => {
    const batch = targets();
    expect(groupStepProgress(batch, "generate-video")).toEqual({ status: "running", progress: 70 });
    expect(groupStepProgress(batch, "review-video")?.status).toBe("running");
    expect(groupStepProgress(batch, "export-zip")).toEqual({ status: "idle", progress: 0 });
  });

  it("keeps rendering complete while exports run and completes export only for every package", () => {
    const batch = targets("succeeded");
    batch[0].exportZip = step("succeeded", 100);
    batch[1].exportZip = step("running", 10);
    expect(groupStepProgress(batch, "generate-video")).toEqual({ status: "success", progress: 100 });
    expect(groupStepProgress(batch, "export-zip")).toEqual({ status: "running", progress: 55 });
    batch[1].exportZip = step("succeeded", 100);
    expect(groupStepProgress(batch, "export-zip")).toEqual({ status: "success", progress: 100 });
  });
});
