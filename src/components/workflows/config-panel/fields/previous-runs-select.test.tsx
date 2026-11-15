import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreviousRunsSelect } from "@/components/workflows/config-panel/fields/previous-runs-select";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/hooks/queries/use-batch-jobs", () => ({
  useBatchJobs: () => ({
    data: [{ id: "job-1", status: "completed", totalProducts: 1, startedAt: null, createdAt: "2026-11-14T10:00:00Z", workflowId: "wf" }],
  }),
}));

describe("PreviousRunsSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/workflows?id=wf&job=job-1&group=group-1&run=run-1");
    const video = buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config: {}, status: "success" } });
    useWorkflowStore.setState({ workflowId: "wf", nodes: [video], edges: [], isRunning: false, videoRunId: "run-1" });
  });

  it("closing the open run takes its videos off the canvas too", async () => {
    render(<PreviousRunsSelect batchId="batch-1" />);

    await userEvent.click(screen.getByRole("button", { name: "Close this run" }));

    expect(mocks.replace).toHaveBeenCalledWith("/workflows?id=wf");
    expect(useWorkflowStore.getState().videoRunId).toBeNull();
    expect(useWorkflowStore.getState().nodes[0]?.data.status).toBe("idle");
  });
});
