import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExportZipCard } from "@/components/workflows/nodes/export-zip-card";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroup, RunGroupTarget } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NodeProps } from "@xyflow/react";

const mocks = vi.hoisted(() => ({
  group: null as RunGroup | null,
  run: null as unknown,
  getExport: vi.fn(),
  downloadGroup: vi.fn(),
  downloadOne: vi.fn(),
}));

vi.mock("@/components/workflows/nodes/node-frame", () => ({ NodeFrame: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => mocks.group?.id ?? null,
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/api/run-groups", () => ({ getRunGroupExport: mocks.getExport, downloadRunGroupExport: mocks.downloadGroup }));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: mocks.run }) }));
vi.mock("@/hooks/mutations/use-media-download", () => ({ useMediaDownload: () => ({ mutate: mocks.downloadOne, isPending: false }) }));
vi.mock("@/helpers/toast", () => ({ showWorkflowActionToast: vi.fn() }));

const target = (index: number, runStatus: string): RunGroupTarget => ({
  key: `p${index}:d`, productId: `p${index}`, productName: `Tee ${index + 1}`, productType: "tshirt", artworkGroupKey: "d",
  designLabel: "Design 1", previewUrl: null, mockupCount: 1, approvedCount: 1, pendingCount: 0, selected: true,
  hasOverride: false, scenes: [], warnings: [], resolveError: null, runId: `run-${index}`, runStatus,
  currentStep: null, stage: null, progress: 100, runError: null, config: null, hasOwnConfig: false,
});

const group = (targets: RunGroupTarget[]): RunGroup => ({
  id: "group", workflowId: "wf", batchId: "batch", batchJobId: null, status: "completed", revision: 1, workflowRevision: 1,
  createdAt: "", maximumTargets: 10, selectedCount: targets.length,
  progress: { total: targets.length, queued: 0, running: 0, waitingForReview: 0, completed: targets.length, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets,
});

const card = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ExportZipCard
        {...({ id: "export", selected: false, data: { type: "export-zip", label: "Export ZIP", config: {}, status: "succeeded" } } as unknown as NodeProps<WorkflowNode>)}
      />
    </QueryClientProvider>
  );

describe("ExportZipCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkflowStore.setState({ workflowId: "wf" });
    // The canvas follows one video of the run: its own package must not be what the button downloads.
    mocks.run = { nodes: [{ nodeId: "export", nodeType: "export-zip", status: "succeeded", output: { exportId: "one-video" } }] };
  });

  it("downloads every video of a batch video run in one ZIP", async () => {
    mocks.group = group([target(0, "completed"), target(1, "completed")]);
    mocks.getExport.mockResolvedValue({ groupId: "group", ready: 2, videos: 2 });
    mocks.downloadGroup.mockResolvedValue("https://api.test/run-groups/group/export/file");
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    card();

    expect(await screen.findByText("All 2 videos are packaged, a folder per product.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download ZIP" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://api.test/run-groups/group/export/file"));
    expect(mocks.downloadGroup).toHaveBeenCalledWith("group");
    expect(mocks.downloadOne).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("says how many videos are packaged while others still render", async () => {
    mocks.group = group([target(0, "completed"), target(1, "running")]);
    mocks.getExport.mockResolvedValue({ groupId: "group", ready: 1, videos: 2 });
    card();

    expect(await screen.findByText("1 of 2 videos are packaged.")).toBeInTheDocument();
  });

  it("downloads the run's own package outside a batch video run", () => {
    mocks.group = null;
    card();

    fireEvent.click(screen.getByRole("button", { name: "Download ZIP" }));

    expect(mocks.downloadOne).toHaveBeenCalledWith({ id: "one-video", zip: true }, expect.anything());
    expect(mocks.getExport).not.toHaveBeenCalled();
  });
});
