import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { AssistantPendingActionCard } from "@/components/commons/assistant/assistant-pending-action-card";
import { useAssistantStore } from "@/stores/assistant";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantPendingAction } from "@/types/assistant";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const action = (overrides: Partial<AssistantPendingAction> = {}): AssistantPendingAction => ({
  id: "act-1",
  toolName: "start_workflow_run",
  title: "Run workflow",
  summary: "Starts a new run.",
  status: "pending",
  expiresAt: "2026-10-29T12:00:00Z",
  ...overrides,
});

const actionResult = (status: AssistantPendingAction["status"]) => ({
  action: action({ status }),
  message: { id: "m-9", role: "assistant", content: "Run workflow: Done", metadata: {}, createdAt: "2026-10-29T12:00:00Z" },
});

describe("AssistantPendingActionCard", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
  });

  it("offers Confirm and Cancel while the action is pending", () => {
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    expect(screen.getByText("Run workflow")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("confirms through the API and stores the updated action and result message", async () => {
    server.use(http.post(`${baseUrl}/api/assistant/actions/act-1/confirm`, () => HttpResponse.json(actionResult("executed"))));
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(useAssistantStore.getState().pendingActions["act-1"]?.status).toBe("executed"));
    expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Run workflow: Done");
  });

  it("cancels through the API", async () => {
    server.use(http.post(`${baseUrl}/api/assistant/actions/act-1/reject`, () => HttpResponse.json(actionResult("rejected"))));
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(useAssistantStore.getState().pendingActions["act-1"]?.status).toBe("rejected"));
  });

  it.each([
    ["executed", "Done"],
    ["rejected", "Cancelled"],
    ["expired", "Expired. Ask again."],
  ] as const)("shows %s without action chips", (status, text) => {
    renderWithQuery(<AssistantPendingActionCard action={action({ status })} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("shows the error message of a failed action", () => {
    renderWithQuery(<AssistantPendingActionCard action={action({ status: "failed", errorMessage: "The workflow changed." })} />);

    expect(screen.getByText("The workflow changed.")).toBeInTheDocument();
  });
});
