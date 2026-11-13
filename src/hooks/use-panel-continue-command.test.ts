import { beforeEach, describe, expect, it, vi } from "vitest";

import { ASSISTANT_PANEL_CONTINUE_TTL_MS } from "@/constants/assistant";
import { usePanelContinueCommand } from "@/hooks/use-panel-continue-command";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore } from "@/stores/workflow-command";
import { act, renderHook } from "@testing-library/react";

describe("usePanelContinueCommand", () => {
  const onContinue = vi.fn();

  beforeEach(() => {
    onContinue.mockReset();
    useWorkflowCommandStore.setState({ command: null, panelContinue: null });
    useWorkflowStore.setState({ ...useWorkflowStore.getInitialState(), workflowId: "wf-1" }, true);
  });

  it("continues once when the panel can and the request is for its workflow", () => {
    const { rerender } = renderHook(({ ready }) => usePanelContinueCommand(ready, onContinue), { initialProps: { ready: false } });

    act(() => useWorkflowCommandStore.getState().requestPanelContinue({ id: "p1", workflowId: "wf-1", requestedAt: Date.now() }));
    expect(onContinue).not.toHaveBeenCalled();

    rerender({ ready: true });
    rerender({ ready: true });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(useWorkflowCommandStore.getState().panelContinue).toBeNull();
  });

  it("drops a request that is too old or for another workflow", () => {
    renderHook(() => usePanelContinueCommand(true, onContinue));

    act(() =>
      useWorkflowCommandStore
        .getState()
        .requestPanelContinue({ id: "old", workflowId: "wf-1", requestedAt: Date.now() - ASSISTANT_PANEL_CONTINUE_TTL_MS - 1 })
    );
    act(() => useWorkflowCommandStore.getState().requestPanelContinue({ id: "other", workflowId: "wf-2", requestedAt: Date.now() }));

    expect(onContinue).not.toHaveBeenCalled();
  });
});
