import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunGroupBar } from "@/components/workflows/run/run-group-bar";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroup } from "@/types/video-workflow";
import { render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  runId: null as string | null,
  closeRun: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({
  VIDEO_RUN_PARAM: "run",
  useWorkflowRuntime: () => ({ runId: mocks.runId, selectRun: vi.fn(), closeRun: mocks.closeRun }),
}));

const group = (status: RunGroup["status"], runIds: (string | null)[]): RunGroup => ({
  id: "group-2", workflowId: "wf", batchId: "batch", batchJobId: null, status, revision: 1, workflowRevision: 1,
  createdAt: "", maximumTargets: 10, selectedCount: runIds.length,
  progress: { total: 0, queued: 0, running: 0, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets: runIds.map((runId, index) => ({
    key: `p:d${index}`, productId: "p", productName: "Tee", productType: "tshirt", artworkGroupKey: `d${index}`,
    designLabel: `Design ${index + 1}`, previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
    hasOverride: false, scenes: [], warnings: [], resolveError: null, runId, runStatus: runId ? "running" : null,
    currentStep: null, stage: null, progress: 0, runError: null, config: null, hasOwnConfig: false,
  })),
});

describe("RunGroupBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.setState({ workflowId: "wf", designScope: null });
  });

  it("stops following a run from before the group opened, such as an earlier cancelled group's", () => {
    mocks.group = group("waiting_for_targets", [null, null]);
    mocks.runId = "run-of-another-group";

    render(<RunGroupBar />);

    expect(mocks.closeRun).toHaveBeenCalledTimes(1);
  });

  it("keeps following one of the group's own runs", () => {
    mocks.group = group("running", ["run-1", "run-2"]);
    mocks.runId = "run-2";

    render(<RunGroupBar />);

    expect(mocks.closeRun).not.toHaveBeenCalled();
  });

  it("does nothing while no run is followed", () => {
    mocks.group = group("waiting_for_targets", [null]);
    mocks.runId = null;

    render(<RunGroupBar />);

    expect(mocks.closeRun).not.toHaveBeenCalled();
  });
});
