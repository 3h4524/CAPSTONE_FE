import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { assistantKeys } from "@/api/assistant";
import { AssistantHistoryMenu } from "@/components/commons/assistant/assistant-history-menu";
import { showToast } from "@/helpers/toast";
import { useAssistantStore } from "@/stores/assistant";
import { server } from "@/test/mocks/server";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantConversationSummary } from "@/types/assistant";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast");

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const LIST_URL = `${baseUrl}/api/assistant/conversations`;

const chats: AssistantConversationSummary[] = [
  { id: "c-new", title: "Newest chat", updatedAt: "2026-10-29T12:00:00Z" },
  { id: "c-mid", title: "Middle chat", updatedAt: "2026-10-29T11:00:00Z" },
  { id: "c-old", title: "Oldest chat", updatedAt: "2026-10-29T10:00:00Z" },
];

const openMenu = async () => {
  server.use(http.get(LIST_URL, () => HttpResponse.json(chats)));
  const view = renderWithQuery(<AssistantHistoryMenu />);
  await userEvent.click(screen.getByRole("button", { name: "Chat history" }));
  await screen.findByText("Newest chat");
  return view;
};

describe("AssistantHistoryMenu", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    vi.mocked(showToast).mockClear();
  });

  it("lists recent chats with Delete all above them", async () => {
    await openMenu();

    expect(screen.getByText("Recent chats")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete all" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /Delete chat/ })).toHaveLength(3);
  });

  it("deletes one chat through the API and removes it from the list without a success message", async () => {
    const deleted: string[] = [];
    server.use(http.delete(`${LIST_URL}/:id`, ({ params }) => {
      deleted.push(String(params.id));
      return new HttpResponse(null, { status: 202 });
    }));
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete chat Middle chat" }));

    await waitFor(() => expect(screen.queryByText("Middle chat")).not.toBeInTheDocument());
    expect(deleted).toEqual(["c-mid"]);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("switches to the newest remaining chat when the open chat is deleted", async () => {
    server.use(http.delete(`${LIST_URL}/:id`, () => new HttpResponse(null, { status: 202 })));
    useAssistantStore.setState({ conversationId: "c-new", selectedConversationId: "c-new" });
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete chat Newest chat" }));

    expect(useAssistantStore.getState().selectedConversationId).toBe("c-mid");
  });

  it("starts a new chat when the last chat is deleted", async () => {
    server.use(http.get(LIST_URL, () => HttpResponse.json([chats[0]])));
    server.use(http.delete(`${LIST_URL}/:id`, () => new HttpResponse(null, { status: 202 })));
    useAssistantStore.setState({ conversationId: "c-new", selectedConversationId: "c-new", messages: [] });
    renderWithQuery(<AssistantHistoryMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Chat history" }));
    await screen.findByText("Newest chat");

    await userEvent.click(screen.getByRole("button", { name: "Delete chat Newest chat" }));

    const state = useAssistantStore.getState();
    expect(state.selectedConversationId).toBeNull();
    expect(state.conversationId).toBeNull();
  });

  it("keeps the open chat selected when another chat is deleted", async () => {
    server.use(http.delete(`${LIST_URL}/:id`, () => new HttpResponse(null, { status: 202 })));
    useAssistantStore.setState({ conversationId: "c-new", selectedConversationId: "c-new" });
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete chat Oldest chat" }));

    expect(useAssistantStore.getState().selectedConversationId).toBe("c-new");
  });

  it("shows an error and restores the chat when the delete request fails", async () => {
    server.use(http.delete(`${LIST_URL}/:id`, () => HttpResponse.json({ title: "Server error" }, { status: 500 })));
    const { queryClient } = await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete chat Middle chat" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("error", expect.any(String)));
    expect(queryClient.getQueryData<AssistantConversationSummary[]>(assistantKeys.conversations())).toHaveLength(3);
  });

  it("asks for confirmation before deleting everything and keeps the open chat", async () => {
    const requests: string[] = [];
    server.use(http.delete(LIST_URL, ({ request }) => {
      requests.push(new URL(request.url).searchParams.get("except") ?? "");
      return new HttpResponse(null, { status: 202 });
    }));
    useAssistantStore.setState({ conversationId: "c-mid", selectedConversationId: "c-mid" });
    const { queryClient } = await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete all" }));
    expect(await screen.findByText("Delete all chats?")).toBeInTheDocument();
    expect(requests).toEqual([]);

    await userEvent.click(screen.getAllByRole("button", { name: "Delete all" }).at(-1)!);

    await waitFor(() => expect(requests).toEqual(["c-mid"]));
    expect(queryClient.getQueryData<AssistantConversationSummary[]>(assistantKeys.conversations())?.map((chat) => chat.id)).toEqual(["c-mid"]);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("does not delete anything when the confirmation is cancelled", async () => {
    let called = false;
    server.use(http.delete(LIST_URL, () => {
      called = true;
      return new HttpResponse(null, { status: 202 });
    }));
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Delete all" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(called).toBe(false);
  });
});
