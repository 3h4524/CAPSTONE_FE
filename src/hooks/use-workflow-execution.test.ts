import { beforeEach, describe, expect, it, vi } from "vitest";

import { findJobVideos } from "@/hooks/use-workflow-execution";
import type { RunGroup, RunGroupSummary } from "@/types/video-workflow";
import { QueryClient } from "@tanstack/react-query";

const { listMock, getMock } = vi.hoisted(() => ({ listMock: vi.fn(), getMock: vi.fn() }));
vi.mock("@/api/run-groups", () => ({
  listRunGroups: listMock,
  getRunGroup: getMock,
  runGroupKeys: {
    detail: (id: string | null) => ["run-groups", id],
    list: (workflowId: string | null) => ["run-groups", "workflow", workflowId],
  },
}));

const summary = (id: string, batchJobId: string | null, createdAt: string): RunGroupSummary => ({
  id, status: "completed", createdAt, targetCount: 2, completedCount: 2, batchJobId,
});

const group = (id: string, runIds: (string | null)[]) =>
  ({ id, targets: runIds.map((runId) => ({ runId })) }) as unknown as RunGroup;

describe("findJobVideos", () => {
  beforeEach(() => {
    listMock.mockReset();
    getMock.mockReset();
  });

  it("finds the newest batch video run of the job and the run of its first video", async () => {
    listMock.mockResolvedValue([
      summary("older", "job-1", "2026-11-10T08:00:00Z"),
      summary("other-job", "job-2", "2026-11-11T09:00:00Z"),
      summary("newer", "job-1", "2026-11-11T08:00:00Z"),
    ]);
    getMock.mockResolvedValue(group("newer", [null, "run-2", "run-3"]));

    await expect(findJobVideos(new QueryClient(), "wf", "job-1")).resolves.toEqual({ groupId: "newer", runId: "run-2" });
    expect(getMock).toHaveBeenCalledWith("newer");
  });

  it("finds nothing for a job that never got to its videos", async () => {
    listMock.mockResolvedValue([summary("whole-batch", null, "2026-11-11T08:00:00Z")]);

    await expect(findJobVideos(new QueryClient(), "wf", "job-1")).resolves.toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it("finds nothing when the list cannot be read", async () => {
    listMock.mockRejectedValue(new Error("offline"));

    await expect(findJobVideos(new QueryClient(), "wf", "job-1")).resolves.toBeNull();
  });
});
