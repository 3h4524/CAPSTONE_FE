import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalCard } from "@/components/workflows/nodes/approval-card";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroup, RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { NodeProps } from "@xyflow/react";

const mocks = vi.hoisted(() => ({ group: null as RunGroup | null, listRunVideos: vi.fn() }));

vi.mock("@/components/workflows/nodes/node-frame", () => ({ NodeFrame: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/api/video-workflow", () => ({
  listRunVideos: mocks.listRunVideos,
  videoWorkflowKeys: { videos: (id: string | null) => ["workflow-videos", id] },
}));
vi.mock("@/hooks/use-node-settings-locked", () => ({ useNodeSettingsLocked: () => false }));

const target = (index: number, runStatus: string): RunGroupTarget => ({
  key: `p:d${index}`, productId: "p", productName: `Tee ${index + 1}`, productType: "tshirt", artworkGroupKey: `d${index}`,
  designLabel: "Design 1", previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
  hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: `run-${index}`, runStatus,
  currentStep: "generate-video", stage: null, progress: 0, runError: null, config: null, hasOwnConfig: false,
});

const group = (targets: RunGroupTarget[]): RunGroup => ({
  id: "group", workflowId: "wf", batchId: "batch", batchJobId: null, status: "running", revision: 1, workflowRevision: 1,
  createdAt: "", maximumTargets: 10, selectedCount: targets.length,
  progress: { total: targets.length, queued: 0, running: 0, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets,
});

const reviewVideoCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ApprovalCard
        {...({ id: "review", selected: false, data: { type: "review-video", label: "Review Video", config: { mode: "manual" }, status: "idle" } } as unknown as NodeProps<WorkflowNode>)}
      />
    </QueryClientProvider>
  );

describe("ApprovalCard of Review Video", () => {
  beforeEach(() => {
    mocks.listRunVideos.mockResolvedValue([]);
    useWorkflowStore.setState({ workflowId: "wf" });
  });

  it("offers the approval mode and waits for a cut without a batch video run", () => {
    mocks.group = null;
    reviewVideoCard();
    expect(screen.getByRole("radio", { name: "Auto" })).toBeInTheDocument();
    expect(screen.getByText("Waiting for the latest cut")).toBeInTheDocument();
  });

  it("shows the status bar of the batch's videos instead of a list of them", () => {
    mocks.group = group([target(0, "completed"), target(1, "waiting_for_review"), target(2, "running"), target(3, "failed")]);
    reviewVideoCard();

    expect(screen.getByText("1 approved")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
    expect(screen.getByText("2 pending")).toBeInTheDocument();
    expect(screen.queryByText("Tee 2")).not.toBeInTheDocument();
  });
});
