import { beforeEach, describe, expect, it, vi } from "vitest";

import { showWorkflowActionToast } from "@/helpers/toast";
import { useWorkflowCommands } from "@/hooks/use-workflow-commands";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore } from "@/stores/workflow-command";
import { act, renderHook } from "@testing-library/react";

vi.mock("@/helpers/toast");

describe("useWorkflowCommands", () => {
  const save = vi.fn();
  const run = vi.fn();
  const continueRun = vi.fn();

  beforeEach(() => {
    save.mockReset();
    run.mockReset();
    continueRun.mockReset();
    vi.mocked(showWorkflowActionToast).mockClear();
    useWorkflowCommandStore.setState({ command: null });
    useWorkflowStore.setState({ ...useWorkflowStore.getInitialState(), workflowId: "wf-1", isDirty: false }, true);
  });

  const mount = (isEditorReady = true, isBusy = false, workflowId = "wf-1") =>
    renderHook(() => useWorkflowCommands(workflowId, isEditorReady, isBusy, { save, run, continueRun }));

  it("runs the open workflow once and clears the request", () => {
    mount();

    act(() => useWorkflowCommandStore.getState().request({ id: "c1", workflowId: "wf-1", kind: "run" }));

    expect(run).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(useWorkflowCommandStore.getState().command).toBeNull();
  });

  it("saves unsaved changes before running", () => {
    useWorkflowStore.setState({ isDirty: true });
    save.mockImplementation((options?: { onSaved?: () => void }) => options?.onSaved?.());
    mount();

    act(() => useWorkflowCommandStore.getState().request({ id: "c1", workflowId: "wf-1", kind: "run" }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("saves on a save request", () => {
    mount();

    act(() => useWorkflowCommandStore.getState().request({ id: "c1", workflowId: "wf-1", kind: "save" }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });

  it("ignores a request for another workflow and waits for the editor", () => {
    const { rerender } = renderHook(({ ready }) => useWorkflowCommands("wf-1", ready, false, { save, run, continueRun }), { initialProps: { ready: false } });

    act(() => useWorkflowCommandStore.getState().request({ id: "c1", workflowId: "wf-1", kind: "run" }));
    expect(run).not.toHaveBeenCalled();

    rerender({ ready: true });
    expect(run).toHaveBeenCalledTimes(1);

    act(() => useWorkflowCommandStore.getState().request({ id: "c2", workflowId: "other", kind: "run" }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(useWorkflowCommandStore.getState().command?.id).toBe("c2");
  });

  it("does not start while the workflow is busy", () => {
    mount(true, true);

    act(() => useWorkflowCommandStore.getState().request({ id: "c1", workflowId: "wf-1", kind: "run" }));

    expect(run).not.toHaveBeenCalled();
    expect(showWorkflowActionToast).toHaveBeenCalledWith("warning", expect.stringContaining("busy"));
    expect(useWorkflowCommandStore.getState().command).toBeNull();
  });

  it("hands a continue request to the run even while the workflow is busy", () => {
    mount(true, true);
    const command = { id: "c1", workflowId: "wf-1", kind: "continue" as const, stage: "mockup_approval", runGroupId: "g1" };

    act(() => useWorkflowCommandStore.getState().request(command));

    expect(continueRun).toHaveBeenCalledWith(command);
    expect(run).not.toHaveBeenCalled();
  });
});
