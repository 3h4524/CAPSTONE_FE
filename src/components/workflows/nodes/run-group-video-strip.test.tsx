import { beforeEach, describe, expect, it, vi } from "vitest";

import { pageOf, RunGroupVideoStrip } from "@/components/workflows/nodes/run-group-video-strip";
import { useWorkflowStore } from "@/stores/workflow";
import type { PromoVideo, RunGroup, RunGroupTarget } from "@/types/video-workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  runId: null as string | null,
  selectRun: vi.fn(),
  listRunVideos: vi.fn(),
}));

vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({
  useWorkflowRuntime: () => ({ runId: mocks.runId, selectRun: mocks.selectRun }),
}));
vi.mock("@/api/video-workflow", () => ({
  listRunVideos: mocks.listRunVideos,
  videoWorkflowKeys: { videos: (id: string | null) => ["workflow-videos", id] },
}));

const target = (index: number, runStatus: string, progress = 0): RunGroupTarget => ({
  key: `p:d${index}`, productId: "p", productName: "Tee", productType: "tshirt", artworkGroupKey: `d${index}`,
  designLabel: `Design ${index + 1}`, previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
  hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: `run-${index}`, runStatus,
  currentStep: "generate-video", stage: null, progress, runError: null, config: { outputFormat: "square" } as RunGroupTarget["config"],
  hasOwnConfig: false,
});

const group = (targets: RunGroupTarget[]): RunGroup => ({
  id: "group", workflowId: "wf", batchId: "batch", batchJobId: null, status: "running", revision: 1, workflowRevision: 1,
  createdAt: "", maximumTargets: 10, selectedCount: targets.length,
  progress: { total: targets.length, queued: 0, running: 0, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets,
});

const renderStrip = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RunGroupVideoStrip fallback={<p>single preview</p>} />
    </QueryClientProvider>
  );

const track = () => screen.getByRole("group").firstElementChild as HTMLElement;

describe("RunGroupVideoStrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runId = null;
    useWorkflowStore.setState({ workflowId: "wf" });
    mocks.listRunVideos.mockResolvedValue([{ id: "v", version: 1, thumbnailUrl: "/thumb.png", outputFormat: "square" } as PromoVideo]);
  });

  it("shows the single run's preview without a batch video run", () => {
    mocks.group = null;
    renderStrip();
    expect(screen.getByText("single preview")).toBeInTheDocument();
  });

  it("shows a video still being made as a placeholder with how far it is", () => {
    mocks.group = group([target(0, "running", 42.4), target(1, "queued")]);
    renderStrip();

    expect(screen.getByRole("button", { name: "Tee · Design 1: Processing 42%" })).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tee · Design 2: Queued" })).toBeInTheDocument();
  });

  it("shows a finished video's thumbnail in the shape of its output format", async () => {
    mocks.group = group([target(0, "waiting_for_review")]);
    renderStrip();

    const tile = screen.getByRole("button", { name: "Tee · Design 1: Ready to review" });
    await waitFor(() => expect(tile.querySelector("img")).toHaveAttribute("src", "/thumb.png"));
    expect(tile.style.aspectRatio).toBe("1 / 1");
    expect(mocks.listRunVideos).toHaveBeenCalledWith("run-0");
  });

  it("puts four videos on a page and moves to the next with the arrow", async () => {
    mocks.group = group(Array.from({ length: 6 }, (_, index) => target(index, "running", 10)));
    renderStrip();

    expect(screen.getByRole("group")).toHaveAccessibleName("Videos 1 to 4 of 6");
    expect(screen.getByRole("button", { name: "Previous videos" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next videos" }));

    expect(screen.getByRole("group")).toHaveAccessibleName("Videos 5 to 6 of 6");
    expect(track().style.transform).toBe("translate3d(-100%, 0, 0)");
    expect(screen.getByRole("button", { name: "Next videos" })).toBeDisabled();
  });

  it("opens a design's run when its video is chosen, and turns to the page of the open run", () => {
    mocks.group = group(Array.from({ length: 6 }, (_, index) => target(index, "running", 10)));
    mocks.runId = "run-5";
    renderStrip();

    expect(screen.getByRole("group")).toHaveAccessibleName("Videos 5 to 6 of 6");
    expect(screen.getByRole("button", { name: /Design 6/ })).toHaveAttribute("aria-current", "true");
  });

  it("calls a stopped video what happened to it", () => {
    mocks.group = group([target(0, "failed"), target(1, "cancelled")]);
    renderStrip();

    expect(screen.getByRole("button", { name: "Tee · Design 1: Failed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tee · Design 2: Stopped" })).toBeInTheDocument();
  });

  it("finds the page of a video", () => {
    expect([0, 3, 4, 7, 8].map(pageOf)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe("RunGroupVideoStrip choosing", () => {
  it("opens the chosen design's run", async () => {
    mocks.group = group([target(0, "running", 5), target(1, "running", 5)]);
    mocks.runId = null;
    useWorkflowStore.setState({ workflowId: "wf" });
    renderStrip();

    await userEvent.click(screen.getByRole("button", { name: /Design 2/ }));

    expect(mocks.selectRun).toHaveBeenCalledWith("run-1");
  });
});
