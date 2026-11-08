import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import { useRunSceneVideos } from "./use-run-scene-videos";

const mocks = vi.hoisted(() => {
  const handlers: Record<string, (...args: never[]) => void> = {};
  const connection = {
    on: vi.fn((name: string, handler: (...args: never[]) => void) => { handlers[name] = handler; }),
    onreconnected: vi.fn((handler: (...args: never[]) => void) => { handlers.reconnected = handler; }),
    onclose: vi.fn((handler: (...args: never[]) => void) => { handlers.close = handler; }),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    invoke: vi.fn(async () => {}),
  };
  return { handlers, connection, invalidate: vi.fn(async () => {}), useQuery: vi.fn() };
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
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock("@/hooks/queries/use-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/api/video-workflow", () => ({
  listRunSceneVideos: vi.fn(),
  videoWorkflowKeys: { sceneVideos: (id: string | null) => ["workflow-scene-videos", id] },
}));

describe("useRunSceneVideos", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("subscribes and refreshes only when the active workflow changes", async () => {
    const { unmount } = renderHook(() => useRunSceneVideos("run-1"));
    await waitFor(() => expect(mocks.connection.invoke).toHaveBeenCalledWith("JoinWorkflow", "run-1"));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(1));
    expect(mocks.useQuery.mock.calls[0][0]).not.toHaveProperty("refetchInterval");

    act(() => { mocks.handlers.SceneVideosChanged("another-run" as never); });
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    act(() => { mocks.handlers.SceneVideosChanged("run-1" as never); });
    expect(mocks.invalidate).toHaveBeenCalledTimes(2);
    expect(mocks.invalidate).toHaveBeenLastCalledWith({ queryKey: ["workflow-scene-videos", "run-1"] });
    unmount();
    expect(mocks.connection.stop).toHaveBeenCalled();
  });

  it("rejoins and reloads the snapshot after reconnecting", async () => {
    renderHook(() => useRunSceneVideos("run-2"));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(1));
    act(() => { mocks.handlers.reconnected(); });
    await waitFor(() => expect(mocks.connection.invoke).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(2));
  });
});
