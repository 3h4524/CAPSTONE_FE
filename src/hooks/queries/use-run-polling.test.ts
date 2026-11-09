import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRunGroupLive } from "@/stores/run-group-live";
import { renderHook } from "@testing-library/react";

import { useRunVideos } from "./use-run-videos";
import { useWorkflowRun } from "./use-workflow-run";

type Interval = (query: { state: { data: unknown } }) => number | false;

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), getQueryData: vi.fn() }));

vi.mock("@/hooks/queries/use-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/hooks/use-query-client", () => ({ useAppQueryClient: () => ({ getQueryData: mocks.getQueryData }) }));
vi.mock("@/api/video-workflow", () => ({
  getWorkflowRun: vi.fn(),
  listRunVideos: vi.fn(),
  videoWorkflowKeys: { run: (id: string | null) => ["workflow-runs", id], videos: (id: string | null) => ["workflow-videos", id] },
}));

const optionsOf = (call = 0) => mocks.useQuery.mock.calls[call][0] as { refetchInterval: Interval; refetchIntervalInBackground?: boolean };
const interval = (data: unknown) => optionsOf().refetchInterval({ state: { data } });

describe("run polling", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("useWorkflowRun", () => {
    beforeEach(() => { renderHook(() => useWorkflowRun("run-1")); });

    it("polls a run that is starting or working", () => {
      expect(interval(undefined)).toBe(2_000);
      expect(interval({ status: "running" })).toBe(2_000);
    });

    it.each(["waiting_for_input", "waiting_for_review", "completed", "cancelled", "failed"])("stops polling a run that is %s", status => {
      expect(interval({ status })).toBe(false);
    });

    it("does not poll from a hidden tab", () => {
      expect(optionsOf().refetchIntervalInBackground).toBeUndefined();
    });
  });

  describe("useWorkflowRun of a design's run", () => {
    afterEach(() => { useRunGroupLive.setState({ connectedGroupId: null }); });

    it("relies on the hub while its group is connected, and polls again without it", () => {
      useRunGroupLive.setState({ connectedGroupId: "group-1" });
      renderHook(() => useWorkflowRun("run-1"));
      expect(interval({ status: "running", runGroupId: "GROUP-1" })).toBe(false);

      vi.clearAllMocks();
      useRunGroupLive.setState({ connectedGroupId: null });
      renderHook(() => useWorkflowRun("run-1"));
      expect(interval({ status: "running", runGroupId: "group-1" })).toBe(2_000);
    });
  });

  describe("useRunVideos", () => {
    beforeEach(() => { renderHook(() => useRunVideos("run-1")); });

    it("does not poll before the run has a video", () => {
      expect(interval([])).toBe(false);
      expect(interval(undefined)).toBe(false);
    });

    it("polls a version that is rendering while its run works", () => {
      mocks.getQueryData.mockReturnValue({ status: "running" });
      expect(interval([{ status: "queued" }])).toBe(2_000);
      expect(mocks.getQueryData).toHaveBeenCalledWith(["workflow-runs", "run-1"]);
    });

    it("stops once every version has finished", () => {
      expect(interval([{ status: "completed" }, { status: "failed" }])).toBe(false);
    });

    it("stops when the run was cancelled with a version still queued", () => {
      mocks.getQueryData.mockReturnValue({ status: "cancelled" });
      expect(interval([{ status: "queued" }])).toBe(false);
    });
  });
});
