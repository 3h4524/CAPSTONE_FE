import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { act, renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("@/hooks/queries/use-workflow-run", () => ({ useWorkflowRun: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }));
vi.mock("@/hooks/mutations/use-start-workflow-run", () => ({ useStartWorkflowRun: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({ useWorkflowRunAction: () => ({ mutate: vi.fn(), isPending: false }) }));

describe("useWorkflowRuntime: the run in the URL", () => {
  beforeEach(() => {
    mocks.search = "";
    useWorkflowStore.setState({ workflowId: "wf", videoRunId: null });
  });

  it("follows a run that enters the URL", () => {
    mocks.search = "run=run-1";
    renderHook(() => useWorkflowRuntime());

    expect(useWorkflowStore.getState().videoRunId).toBe("run-1");
  });

  it("does not put back a run closed before it left the URL, and stays closed once it has", () => {
    mocks.search = "run=run-1";
    const { rerender } = renderHook(() => useWorkflowRuntime());

    // Closed: the store lets go at once, the URL a moment later.
    act(() => useWorkflowStore.getState().setVideoRunId(null));
    rerender();
    expect(useWorkflowStore.getState().videoRunId).toBeNull();

    mocks.search = "";
    rerender();
    expect(useWorkflowStore.getState().videoRunId).toBeNull();
  });

  it("closes the run when it leaves the URL", () => {
    mocks.search = "run=run-1";
    const { rerender } = renderHook(() => useWorkflowRuntime());

    mocks.search = "";
    rerender();

    expect(useWorkflowStore.getState().videoRunId).toBeNull();
  });
});
