import { describe, expect, it } from "vitest";

import { groupVideoProgress } from "@/hooks/queries/use-group-video-progress";

const run = (runStatus: string, progress = 0) => ({ runId: `run-${runStatus}-${progress}`, runStatus, progress });

describe("groupVideoProgress", () => {
  it("counts each video as an equal share: one of four done is 25%", () => {
    expect(groupVideoProgress([run("waiting_for_review"), run("queued"), run("queued"), run("queued")])).toBe(25);
  });

  it("adds the progress of the videos being made", () => {
    expect(groupVideoProgress([run("completed"), run("running", 50), run("queued"), run("queued")])).toBe(37);
  });

  it("counts a failed or stopped video as settled, so the bar can finish", () => {
    expect(groupVideoProgress([run("failed"), run("cancelled"), run("completed"), run("waiting_for_input")])).toBe(100);
  });

  it("never shows 100 before every video is done", () => {
    expect(groupVideoProgress([run("completed"), run("completed"), run("running", 99.9)])).toBe(99);
  });

  it("leaves out designs without a run, and is 0 with none", () => {
    expect(groupVideoProgress([{ runId: null, runStatus: null, progress: 0 }, run("completed")])).toBe(100);
    expect(groupVideoProgress([])).toBe(0);
  });
});
