import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { AssistantWorkflowCommandCard } from "@/components/commons/assistant/assistant-workflow-command-card";
import { useAssistantStore } from "@/stores/assistant";
import { useAssistantRunNudgeStore } from "@/stores/assistant-run-nudge";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore } from "@/stores/workflow-command";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const render = (kind: "run" | "save", state: "idle" | "applied" | "dismissed" = "idle", warnings: string[] = []) =>
  renderWithQuery(
    <AssistantWorkflowCommandCard messageId="m1" actionId="x1" kind={kind} workflowId="wf-1" workflowName="Etsy flow" warnings={warnings} state={state} />
  );

const openWorkflow = (isDirty: boolean) => {
  useWorkflowStore.setState({ workflowId: "wf-1", isDirty });
  usePathname.mockReturnValue("/workflows");
};

describe("AssistantWorkflowCommandCard", () => {
  beforeEach(() => {
    useWorkflowStore.setState(useWorkflowStore.getInitialState(), true);
    useWorkflowCommandStore.setState({ command: null });
    useAssistantRunNudgeStore.setState({ watchedWorkflowId: null, seenKey: null });
    useAssistantStore.setState({
      ...useAssistantStore.getInitialState(),
      messages: [{ id: "m1", key: "m1", role: "assistant", content: "", citations: [], choices: null, choicesUsed: false, clientActions: [], clientActionStates: {}, pendingActionIds: [], tools: [], error: null, retryInSeconds: null, isStreaming: false, isStopped: false, createdAt: "" }],
    });
    server.use(http.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assistant/messages/:messageId/client-actions/:actionId`, () => new HttpResponse(null, { status: 204 })));
  });

  it("asks the toolbar of the open workflow to run it and watches the run", async () => {
    openWorkflow(false);
    render("run");

    await userEvent.click(screen.getByRole("button", { name: "Run workflow" }));

    expect(useWorkflowCommandStore.getState().command).toEqual({ id: "x1", workflowId: "wf-1", kind: "run" });
    expect(useAssistantRunNudgeStore.getState().watchedWorkflowId).toBe("wf-1");
    expect(useAssistantStore.getState().messages[0]?.clientActionStates["x1"]).toBe("applied");
  });

  it("offers to save and run when the canvas has unsaved changes", () => {
    openWorkflow(true);
    render("run");

    expect(screen.getByRole("button", { name: "Save and run" })).toBeEnabled();
    expect(screen.getByText("Paid steps show their cost for you to confirm first.")).toBeInTheDocument();
  });

  it("shows the warnings the backend found", () => {
    openWorkflow(false);
    render("run", "idle", ["Connect Product input to Design image."]);

    expect(screen.getByText("Connect Product input to Design image.")).toBeInTheDocument();
  });

  it("is disabled until the workflow is open", () => {
    useWorkflowStore.setState({ workflowId: "other" });
    usePathname.mockReturnValue("/workflows");
    render("run");

    expect(screen.getByRole("button", { name: "Run workflow" })).toBeDisabled();
  });

  it("saves only when there is something to save", async () => {
    openWorkflow(false);
    const { unmount } = render("save");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    unmount();

    openWorkflow(true);
    render("save");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(useWorkflowCommandStore.getState().command?.kind).toBe("save");
    expect(useAssistantRunNudgeStore.getState().watchedWorkflowId).toBeNull();
  });

  it("shows the decision once settled", () => {
    openWorkflow(false);
    render("run", "applied");

    expect(screen.getByText("Run requested")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run workflow" })).not.toBeInTheDocument();
  });

  it("continues the run at the stage Podi saw, with its ids", async () => {
    openWorkflow(true);
    renderWithQuery(
      <AssistantWorkflowCommandCard
        messageId="m1"
        actionId="x1"
        kind="continue"
        workflowId="wf-1"
        workflowName="Etsy flow"
        continueLabel="Continue to mock-ups"
        runRef={{ stage: "design_approval", batchJobId: "job-1", runGroupId: null, runId: null }}
        state="idle"
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Continue to mock-ups" }));

    expect(useWorkflowCommandStore.getState().command).toEqual({
      id: "x1",
      workflowId: "wf-1",
      kind: "continue",
      stage: "design_approval",
      batchJobId: "job-1",
      runGroupId: null,
      runId: null,
    });
    expect(useAssistantRunNudgeStore.getState().watchedWorkflowId).toBe("wf-1");
  });
});
