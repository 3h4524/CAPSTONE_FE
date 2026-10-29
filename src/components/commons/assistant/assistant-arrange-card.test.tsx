import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantArrangeCard } from "@/components/commons/assistant/assistant-arrange-card";
import { showToast } from "@/helpers/toast";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { buildWorkflowEdge, buildWorkflowNode } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantArrangePayload } from "@/types/assistant";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast");

const payload: AssistantArrangePayload = { workflowId: "wf-1", layout: "horizontal", spacing: "comfortable", perRow: 3, nodeCount: 3 };

const openWorkflow = () => {
  useWorkflowStore.setState({
    workflowId: "wf-1",
    nodes: [
      buildWorkflowNode({ id: "a", position: { x: 500, y: 400 } }),
      buildWorkflowNode({ id: "b", position: { x: 20, y: 20 } }),
      buildWorkflowNode({ id: "c", position: { x: 300, y: 90 } }),
    ],
    edges: [buildWorkflowEdge({ id: "ab", source: "a", target: "b" }), buildWorkflowEdge({ id: "bc", source: "b", target: "c" })],
  });
  usePathname.mockReturnValue("/workflows");
};

const render = (state: "idle" | "applied" | "dismissed" = "idle") =>
  renderWithQuery(<AssistantArrangeCard messageId="m1" actionId="x1" payload={payload} state={state} />);

describe("AssistantArrangeCard", () => {
  beforeEach(() => {
    useWorkflowStore.setState(useWorkflowStore.getInitialState(), true);
    useAssistantStore.setState({
      ...useAssistantStore.getInitialState(),
      messages: [{ id: "m1", role: "assistant", content: "", citations: [], choices: null, choicesUsed: false, clientActions: [], clientActionStates: {}, pendingActionIds: [], tools: [], error: null, isStreaming: false, createdAt: "" }],
    });
    vi.mocked(showToast).mockClear();
    server.use(http.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assistant/messages/:messageId/client-actions/:actionId`, () => new HttpResponse(null, { status: 204 })));
  });

  it("says what the new layout will be and that only positions change", () => {
    openWorkflow();

    render();

    expect(screen.getByText("Arrange 3 nodes in one left-to-right line, comfortable spacing")).toBeInTheDocument();
    expect(screen.getByText("Only the positions of the nodes change.")).toBeInTheDocument();
  });

  it("moves the nodes in connection order as one undoable step and brings them into view", async () => {
    openWorkflow();
    render();

    await userEvent.click(screen.getByRole("button", { name: "Apply layout" }));

    const state = useWorkflowStore.getState();
    const xs = ["a", "b", "c"].map((id) => state.nodes.find((node) => node.id === id)!.position.x);
    expect([...xs].sort((x, y) => x - y)).toEqual(xs);
    expect(state.isDirty).toBe(true);
    expect(state.past).toHaveLength(1);
    expect(state.focusRequest?.nodeIds).toEqual(["a", "b", "c"]);
    expect(state.edges).toHaveLength(2);
    expect(useAssistantStore.getState().messages[0]?.clientActionStates["x1"]).toBe("applied");
    expect(showToast).toHaveBeenCalledWith("success", expect.stringContaining("save"));
  });

  it("can be undone in one step", async () => {
    openWorkflow();
    render();
    const before = useWorkflowStore.getState().nodes.map((node) => node.position);

    await userEvent.click(screen.getByRole("button", { name: "Apply layout" }));
    useWorkflowStore.getState().undo();

    expect(useWorkflowStore.getState().nodes.map((node) => node.position)).toEqual(before);
  });

  it("is disabled when another workflow is open and while streaming", () => {
    useWorkflowStore.setState({ workflowId: "other", nodes: [], edges: [] });
    usePathname.mockReturnValue("/workflows");
    render();
    expect(screen.getByRole("button", { name: "Apply layout" })).toBeDisabled();
  });

  it("dismisses the proposal", async () => {
    openWorkflow();
    render();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(useAssistantStore.getState().messages[0]?.clientActionStates["x1"]).toBe("dismissed");
  });

  it.each([["applied", "Applied"], ["dismissed", "Dismissed"]] as const)("shows %s without the chips", (state, text) => {
    openWorkflow();
    render(state);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply layout" })).not.toBeInTheDocument();
  });
});
