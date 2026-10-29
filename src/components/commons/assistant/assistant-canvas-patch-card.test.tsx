import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantCanvasPatchCard } from "@/components/commons/assistant/assistant-canvas-patch-card";
import { showToast } from "@/helpers/toast";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { buildWorkflowNode } from "@/test/factories";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantCanvasPatchPayload } from "@/types/assistant";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast");

const payload = (overrides: Partial<AssistantCanvasPatchPayload> = {}): AssistantCanvasPatchPayload => ({
  workflowId: "wf-1",
  operations: [{ op: "add_node", ref: "n1", type: "generate-listing", label: "Listing", after: "a" }],
  warnings: [],
  ...overrides,
});

const openWorkflow = () => {
  useWorkflowStore.setState({ workflowId: "wf-1", nodes: [buildWorkflowNode({ id: "a" })], edges: [] });
  usePathname.mockReturnValue("/workflows");
};

describe("AssistantCanvasPatchCard", () => {
  beforeEach(() => {
    useWorkflowStore.setState(useWorkflowStore.getInitialState(), true);
    useAssistantStore.setState({
      ...useAssistantStore.getInitialState(),
      messages: [
        { id: "m1", role: "assistant", content: "", citations: [], choices: null, choicesUsed: false, clientActions: [], clientActionStates: {}, pendingActionIds: [], tools: [], error: null, isStreaming: false, createdAt: "" },
      ],
    });
    vi.mocked(showToast).mockClear();
  });

  it("lists the proposed operations and any warnings", () => {
    openWorkflow();

    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload({ warnings: ["Missing approval step"] })} state="idle" />);

    expect(screen.getByText(/Add "Listing" after/)).toBeInTheDocument();
    expect(screen.getByText("Missing approval step")).toBeInTheDocument();
  });

  it("disables Apply when another workflow is open", () => {
    useWorkflowStore.setState({ workflowId: "other", nodes: [], edges: [] });
    usePathname.mockReturnValue("/workflows");

    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload()} state="idle" />);

    expect(screen.getByRole("button", { name: "Apply to canvas" })).toBeDisabled();
  });

  it("applies the patch to the canvas, marks it dirty and confirms with a toast", async () => {
    openWorkflow();
    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload()} state="idle" />);

    await userEvent.click(screen.getByRole("button", { name: "Apply to canvas" }));

    const workflow = useWorkflowStore.getState();
    expect(workflow.nodes).toHaveLength(2);
    expect(workflow.isDirty).toBe(true);
    expect(useAssistantStore.getState().messages[0]?.clientActionStates["x1"]).toBe("applied");
    expect(showToast).toHaveBeenCalledWith("success", expect.stringContaining("save"));
  });

  it("warns about skipped operations", async () => {
    openWorkflow();
    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload({ operations: [{ op: "remove_node", nodeId: "ghost" }] })} state="idle" />);

    await userEvent.click(screen.getByRole("button", { name: "Apply to canvas" }));

    expect(showToast).toHaveBeenCalledWith("warning", expect.stringContaining("skipped"));
    expect(useWorkflowStore.getState().isDirty).toBe(false);
  });

  it("dismisses the proposal", async () => {
    openWorkflow();
    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload()} state="idle" />);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(useAssistantStore.getState().messages[0]?.clientActionStates["x1"]).toBe("dismissed");
  });

  it.each([
    ["applied", "Applied"],
    ["dismissed", "Dismissed"],
  ] as const)("hides the chips once %s", (state, text) => {
    openWorkflow();

    renderWithQuery(<AssistantCanvasPatchCard messageId="m1" actionId="x1" payload={payload()} state={state} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply to canvas" })).not.toBeInTheDocument();
  });
});
