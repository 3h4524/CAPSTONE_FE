import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRunGroupLive } from "@/stores/run-group-live";
import type { RunGroup, WorkflowRun } from "@/types/video-workflow";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useRunGroupSync } from "./use-run-group-sync";

const mocks = vi.hoisted(() => {
  const handlers: Record<string, (...args: never[]) => void> = {};
  const connection = {
    on: vi.fn((name: string, handler: (...args: never[]) => void) => { handlers[name] = handler; }),
    onreconnecting: vi.fn((handler: (...args: never[]) => void) => { handlers.reconnecting = handler; }),
    onreconnected: vi.fn((handler: (...args: never[]) => void) => { handlers.reconnected = handler; }),
    onclose: vi.fn((handler: (...args: never[]) => void) => { handlers.close = handler; }),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    invoke: vi.fn(async () => {}),
  };
  const cache = new Map<string, unknown>();
  return {
    handlers,
    connection,
    cache,
    invalidate: vi.fn(async () => {}),
    setQueryData: vi.fn((key: unknown[], update: (old: unknown) => unknown) => cache.set(JSON.stringify(key), update(cache.get(JSON.stringify(key))))),
  };
});

vi.mock("@microsoft/signalr", () => ({
  LogLevel: { Warning: 3 },
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return mocks.connection; }
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate, setQueryData: mocks.setQueryData }),
}));

const group = (runId: string): RunGroup => ({
  id: "group-1", workflowId: "wf", batchId: "batch", batchJobId: null, status: "running", revision: 2, workflowRevision: 4,
  createdAt: "", maximumTargets: 10, selectedCount: 1,
  progress: { total: 1, queued: 0, running: 1, waitingForReview: 0, completed: 0, failed: 0, cancelled: 0, waitingForInput: 0 },
  targets: [{
    key: "p:d", productId: "p", productName: "Tee", productType: "tshirt", artworkGroupKey: "d", designLabel: "Design 1",
    previewUrl: null, mockupCount: 2, approvedCount: 2, pendingCount: 0, selected: true, hasOverride: false, scenes: [],
    warnings: [], resolveError: null, runId, runStatus: "running", currentStep: "generate-video", stage: "Planning", progress: 5, runError: null,
  }],
});

describe("useRunGroupSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cache.clear();
    useRunGroupLive.setState({ connectedGroupId: null });
  });

  it("joins the group, marks it live and reads it once after joining", async () => {
    const { unmount } = renderHook(() => useRunGroupSync("group-1"));
    await waitFor(() => expect(mocks.connection.invoke).toHaveBeenCalledWith("JoinRunGroup", "group-1"));
    await waitFor(() => expect(useRunGroupLive.getState().connectedGroupId).toBe("group-1"));
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["run-groups", "group-1"] });
    unmount();
    expect(useRunGroupLive.getState().connectedGroupId).toBeNull();
    expect(mocks.connection.stop).toHaveBeenCalled();
  });

  it("reloads a run that changed and ignores other groups", async () => {
    renderHook(() => useRunGroupSync("group-1"));
    await waitFor(() => expect(useRunGroupLive.getState().connectedGroupId).toBe("group-1"));
    mocks.invalidate.mockClear();

    act(() => { mocks.handlers.RunChanged({ runId: "run-x", groupId: "other", status: "running", revision: 3 } as never); });
    expect(mocks.invalidate).not.toHaveBeenCalled();

    act(() => { mocks.handlers.RunChanged({ runId: "run-1", groupId: "GROUP-1", status: "waiting_for_review", revision: 3 } as never); });
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["workflow-runs", "run-1"] });
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["workflow-videos", "run-1"] });
  });

  it("writes progress into the group and the run without asking the server", async () => {
    mocks.cache.set(JSON.stringify(["run-groups", "group-1"]), group("run-1"));
    mocks.cache.set(JSON.stringify(["workflow-runs", "run-1"]), {
      id: "run-1", nodes: [{ nodeType: "generate-video", status: "running", stage: "Planning", progress: 5 }, { nodeType: "review-video", status: "pending", stage: null, progress: 0 }],
    } as unknown as WorkflowRun);
    renderHook(() => useRunGroupSync("group-1"));
    await waitFor(() => expect(useRunGroupLive.getState().connectedGroupId).toBe("group-1"));
    mocks.invalidate.mockClear();

    act(() => { mocks.handlers.RunProgress({ runId: "run-1", groupId: "group-1", stage: "Rendering", progress: 60 } as never); });

    const updatedGroup = mocks.cache.get(JSON.stringify(["run-groups", "group-1"])) as RunGroup;
    expect(updatedGroup.targets[0]).toMatchObject({ stage: "Rendering", progress: 60 });
    const updatedRun = mocks.cache.get(JSON.stringify(["workflow-runs", "run-1"])) as WorkflowRun;
    expect(updatedRun.nodes[0]).toMatchObject({ stage: "Rendering", progress: 60 });
    expect(updatedRun.nodes[1]).toMatchObject({ stage: null, progress: 0 });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it("stops counting as live while reconnecting", async () => {
    renderHook(() => useRunGroupSync("group-1"));
    await waitFor(() => expect(useRunGroupLive.getState().connectedGroupId).toBe("group-1"));
    act(() => { mocks.handlers.reconnecting(); });
    expect(useRunGroupLive.getState().connectedGroupId).toBeNull();
  });
});
