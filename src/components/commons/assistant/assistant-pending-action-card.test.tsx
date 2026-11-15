import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantPendingActionCard } from "@/components/commons/assistant/assistant-pending-action-card";
import { showToast } from "@/helpers/toast";
import { useAssistantStore } from "@/stores/assistant";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantPendingAction } from "@/types/assistant";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast");

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const FOURTEEN_MINUTES_MS = 14 * 60 * 1000;
const inFourteenMinutes = () => new Date(Date.now() + FOURTEEN_MINUTES_MS).toISOString();

const action = (overrides: Partial<AssistantPendingAction> = {}): AssistantPendingAction => ({
  id: "act-1",
  toolName: "start_workflow_run",
  title: "Run workflow",
  summary: "Starts a new run.",
  status: "pending",
  expiresAt: inFourteenMinutes(),
  ...overrides,
});

const actionResult = (status: AssistantPendingAction["status"]) => ({
  action: action({ status }),
  message: { id: "m-9", role: "assistant", content: "Run workflow: Done", metadata: {}, createdAt: "2026-10-29T12:00:00Z" },
});

describe("AssistantPendingActionCard", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    vi.mocked(showToast).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("shows how long the action can still be confirmed", () => {
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    expect(screen.getByText("14:00 left")).toBeInTheDocument();
  });

  it("stops offering Confirm once the action has expired", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    renderWithQuery(<AssistantPendingActionCard action={action({ expiresAt: new Date(Date.now() + 2000).toISOString() })} />);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();

    act(() => vi.advanceTimersByTime(3000));

    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.getByText("Expired. Ask again.")).toBeInTheDocument();
  });

  it.each([
    ["assistant.action_expired", "This action expired. Ask the assistant again.", "expired"],
    ["assistant.action_not_pending", "This action is already executed.", "failed"],
  ] as const)("on a %s conflict shows the backend message and closes the card locally", async (code, detail, status) => {
    server.use(
      http.post(`${baseUrl}/api/assistant/actions/act-1/confirm`, () => HttpResponse.json({ code, detail }, { status: 409 })),
      http.get(`${baseUrl}/api/assistant/conversations/c-new`, () => HttpResponse.json({ detail: "Unavailable" }, { status: 503 }))
    );
    useAssistantStore.setState({ conversationId: "c-new", selectedConversationId: null });
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("error", detail));
    expect(useAssistantStore.getState().pendingActions["act-1"]?.status).toBe(status);
  });

  it("reloads the real action state after a conflict even in a brand-new chat", async () => {
    server.use(
      http.post(`${baseUrl}/api/assistant/actions/act-1/confirm`, () =>
        HttpResponse.json({ code: "assistant.action_not_pending", detail: "This action is already executed." }, { status: 409 })
      ),
      http.get(`${baseUrl}/api/assistant/conversations/c-new`, () =>
        HttpResponse.json({ id: "c-new", title: "Chat", messages: [], pendingActions: [action({ status: "executed" })] })
      )
    );
    useAssistantStore.setState({ conversationId: "c-new", selectedConversationId: null });
    renderWithQuery(<AssistantPendingActionCard action={action()} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(useAssistantStore.getState().pendingActions["act-1"]?.status).toBe("executed"));
  });
});
