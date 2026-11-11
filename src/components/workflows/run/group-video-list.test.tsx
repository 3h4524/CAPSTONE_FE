import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupVideoList } from "@/components/workflows/run/group-video-list";
import { groupVideoState } from "@/hooks/queries/use-group-videos";
import { useWorkflowStore } from "@/stores/workflow";
import type { PromoVideo, RunGroup, RunGroupTarget } from "@/types/video-workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  runId: null as string | null,
  selectRun: vi.fn(),
  listRunVideos: vi.fn(),
  getWorkflowRun: vi.fn(),
  act: vi.fn(),
}));

vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({
  useWorkflowRuntime: () => ({ runId: mocks.runId, selectRun: mocks.selectRun }),
}));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({
  useWorkflowRunAction: () => ({ mutate: mocks.act }),
}));
vi.mock("@/api/video-workflow", () => ({
  listRunVideos: mocks.listRunVideos,
  getWorkflowRun: mocks.getWorkflowRun,
  videoWorkflowKeys: { videos: (id: string | null) => ["workflow-videos", id] },
}));

const target = (index: number, runStatus: string, progress = 0, currentStep = "generate-video"): RunGroupTarget => ({
  key: `p:d${index}`, productId: "p", productName: `Tee ${index + 1}`, productType: "tshirt", artworkGroupKey: `d${index}`,
  designLabel: "Design 1", previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
  hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: `run-${index}`, runStatus,
  currentStep, stage: null, progress, runError: null, config: null, hasOwnConfig: false,
});

const group = (targets: RunGroupTarget[]): RunGroup => ({
  id: "group", workflowId: "wf", batchId: "batch", batchJobId: null, status: "running", revision: 1, workflowRevision: 1,
  createdAt: "", maximumTargets: 10, selectedCount: targets.length,
  progress: { total: targets.length, queued: 0, running: 0, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets,
});

const withQuery = (node: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.runId = null;
  useWorkflowStore.setState({ workflowId: "wf" });
  mocks.listRunVideos.mockResolvedValue([{ id: "v", version: 2, thumbnailUrl: "/thumb.png", outputFormat: "square", reviewRevision: 4 } as PromoVideo]);
});

describe("groupVideoState", () => {
  it("names each state of a design's video", () => {
    expect(groupVideoState(target(0, "waiting_for_review"))).toBe("review");
    expect(groupVideoState(target(0, "completed"))).toBe("approved");
    expect(groupVideoState(target(0, "queued"))).toBe("queued");
    expect(groupVideoState(target(0, "running"))).toBe("processing");
    expect(groupVideoState(target(0, "failed"))).toBe("stopped");
  });

  it("keeps an approved video approved while its ZIP is exported", () => {
    expect(groupVideoState(target(0, "running", 30, "export-zip"))).toBe("approved");
  });
});

describe("GroupVideoList", () => {
  it("lists every design's video with where it is, and says how far the review is", () => {
    mocks.group = group([target(0, "completed"), target(1, "waiting_for_review"), target(2, "running", 42.6), target(3, "queued")]);
    withQuery(<GroupVideoList />);

    expect(screen.getByText("1 of 4 approved · 1 waiting for you")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Rendering 43%")).toBeInTheDocument();
    expect(list.getByText("To review")).toBeInTheDocument();
    expect(list.getByText("Approved")).toBeInTheDocument();
  });

  it("filters to the videos waiting for review", async () => {
    mocks.group = group([target(0, "completed"), target(1, "waiting_for_review"), target(2, "running", 10)]);
    withQuery(<GroupVideoList />);

    await userEvent.click(screen.getByRole("button", { name: /To review/, pressed: false }));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByText("Tee 2")).toBeInTheDocument();
  });

  it("opens a video's run when it is chosen and marks the open one", async () => {
    mocks.group = group([target(0, "completed"), target(1, "waiting_for_review")]);
    mocks.runId = "run-0";
    withQuery(<GroupVideoList />);

    expect(screen.getByRole("button", { name: /Tee 1/ })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: /Tee 2/ }));
    expect(mocks.selectRun).toHaveBeenCalledWith("run-1");
  });

  it("steps to the next video waiting for review", async () => {
    mocks.group = group([target(0, "waiting_for_review"), target(1, "completed"), target(2, "waiting_for_review")]);
    mocks.runId = "run-0";
    withQuery(<GroupVideoList />);

    await userEvent.click(screen.getByRole("button", { name: "Review next" }));

    expect(mocks.selectRun).toHaveBeenCalledWith("run-2");
  });

  it("offers no next video when nothing else waits", () => {
    mocks.group = group([target(0, "waiting_for_review"), target(1, "completed")]);
    mocks.runId = "run-0";
    withQuery(<GroupVideoList />);

    expect(screen.queryByRole("button", { name: "Review next" })).not.toBeInTheDocument();
  });
});

describe("GroupVideoList approval", () => {
  const waitingRun = (videoId: string) => ({
    id: "run-1", revision: 9, status: "waiting_for_review", nodes: [{ nodeType: "review-video", output: { videoId } }],
  });

  it("approves the video waiting for review, on the run's current revision", async () => {
    mocks.group = group([target(0, "completed"), target(1, "waiting_for_review")]);
    mocks.getWorkflowRun.mockResolvedValue(waitingRun("v"));
    withQuery(<GroupVideoList />);

    const approve = await screen.findAllByRole("button", { name: "Approve video" });
    await userEvent.click(approve[1]!);

    await vi.waitFor(() =>
      expect(mocks.act).toHaveBeenCalledWith(
        { runId: "run-1", expectedRevision: 9, action: "approve_video", videoId: "v", reviewRevision: 4 },
        expect.anything()
      )
    );
  });

  it("rejects the video waiting for review", async () => {
    mocks.group = group([target(0, "waiting_for_review")]);
    mocks.getWorkflowRun.mockResolvedValue(waitingRun("v"));
    withQuery(<GroupVideoList />);

    await userEvent.click(await screen.findByRole("button", { name: "Reject video" }));

    await vi.waitFor(() =>
      expect(mocks.act).toHaveBeenCalledWith(expect.objectContaining({ action: "reject_video", videoId: "v" }), expect.anything())
    );
  });

  it("does not offer a decision on a video that is not waiting for review", () => {
    mocks.group = group([target(0, "completed"), target(1, "running", 10)]);
    withQuery(<GroupVideoList />);

    const approve = screen.getAllByRole("button", { name: "Approve video" });
    expect(approve[0]).toHaveAttribute("aria-pressed", "true");
    for (const button of [...approve, ...screen.getAllByRole("button", { name: "Reject video" })]) expect(button).toBeDisabled();
  });
});
