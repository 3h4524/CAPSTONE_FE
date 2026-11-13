import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { ASSISTANT_MAX_MESSAGE_LENGTH, ASSISTANT_NEW_CHAT_DRAFT_KEY } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { buildWorkflowNode } from "@/test/factories";
import { renderWithQuery } from "@/test/render-with-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const input = () => screen.getByPlaceholderText("Ask Podi");

describe("AssistantComposer", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    useWorkflowStore.setState(useWorkflowStore.getInitialState(), true);
    usePathname.mockReturnValue("/");
    streamAssistantChat.mockReset();
    streamAssistantChat.mockResolvedValue(undefined);
  });

  it("keeps Send disabled until there is text", async () => {
    renderWithQuery(<AssistantComposer />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await userEvent.type(input(), "hello");

    await waitFor(() => expect(screen.getByRole("button", { name: "Send" })).toBeEnabled());
  });

  it("sends on Enter and clears the field", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "hello{Enter}");

    await waitFor(() => expect(useAssistantStore.getState().messages[0]).toMatchObject({ role: "user", content: "hello" }));
    expect(input()).toHaveValue("");
  });

  it("does not send on Shift+Enter", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "line one{Shift>}{Enter}{/Shift}line two");

    expect(streamAssistantChat).not.toHaveBeenCalled();
    expect(input()).toHaveValue("line one\nline two");
  });

  it("rejects a message over the length limit", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.click(input());
    await userEvent.paste("a".repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 1));

    await waitFor(() => expect(screen.getByRole("button", { name: "Send" })).toBeDisabled());
    expect(screen.getByText(new RegExp(`${ASSISTANT_MAX_MESSAGE_LENGTH + 1}/${ASSISTANT_MAX_MESSAGE_LENGTH}`))).toBeInTheDocument();
  });

  it("shows Stop instead of Send while a reply is streaming", () => {
    useAssistantStore.setState({ streamingMessageId: "streaming" });

    renderWithQuery(<AssistantComposer />);

    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
  });

  it("does not mark the field invalid when the text is deleted again", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "hello");
    await userEvent.clear(input());

    expect(input()).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("marks the field invalid only past the length limit", async () => {
    renderWithQuery(<AssistantComposer />);
    await userEvent.click(input());

    await userEvent.paste("a".repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 1));

    await waitFor(() => expect(input()).toHaveAttribute("aria-invalid", "true"));
  });

  it("clicking Stop with a draft in the box only stops: nothing is sent and the draft stays", async () => {
    useAssistantStore.setState({ streamingMessageId: "streaming" });
    renderWithQuery(<AssistantComposer />);
    await userEvent.type(input(), "a follow-up typed while waiting");

    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    useAssistantStore.setState({ streamingMessageId: null });

    expect(streamAssistantChat).not.toHaveBeenCalled();
    expect(input()).toHaveValue("a follow-up typed while waiting");
  });

  it("uses a different element for Stop and Send so a Stop click can never turn into a submit", () => {
    useAssistantStore.setState({ streamingMessageId: "streaming" });
    renderWithQuery(<AssistantComposer />);
    const stop = screen.getByRole("button", { name: "Stop" });

    act(() => useAssistantStore.setState({ streamingMessageId: null }));

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).not.toBe(stop);
    expect(stop.isConnected).toBe(false);
  });

  it("keeps the draft when Enter is pressed while a reply is still streaming", async () => {
    useAssistantStore.setState({ streamingMessageId: "streaming" });
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "typed too early{Enter}");

    expect(streamAssistantChat).not.toHaveBeenCalled();
    expect(input()).toHaveValue("typed too early");
  });

  it("shows no message when the text is deleted again, only a disabled Send", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "hello");
    await userEvent.clear(input());

    await waitFor(() => expect(screen.getByRole("button", { name: "Send" })).toBeDisabled());
    expect(screen.queryByText("Type a message")).not.toBeInTheDocument();
    expect(input().parentElement?.querySelector("p")).toBeNull();
  });

  it("ignores Enter on an empty or blank message without any message", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "   {Enter}");

    expect(streamAssistantChat).not.toHaveBeenCalled();
    expect(screen.queryByText("Type a message")).not.toBeInTheDocument();
  });

  it("keeps the counter out of the layout flow and turns it red past the limit", async () => {
    renderWithQuery(<AssistantComposer />);
    await userEvent.click(input());
    await userEvent.paste("a".repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 5));

    const counter = await screen.findByText(`${ASSISTANT_MAX_MESSAGE_LENGTH + 5}/${ASSISTANT_MAX_MESSAGE_LENGTH}`);

    expect(counter).toHaveClass("absolute", "text-destructive");
  });

  it("keeps a half-typed message when the composer is closed and opened again", async () => {
    const { unmount } = renderWithQuery(<AssistantComposer />);
    await userEvent.type(input(), "half typed");

    unmount();
    renderWithQuery(<AssistantComposer />);

    expect(input()).toHaveValue("half typed");
    expect(useAssistantStore.getState().drafts[ASSISTANT_NEW_CHAT_DRAFT_KEY]).toBe("half typed");
  });

  it("restores the draft of the conversation that is switched to", async () => {
    useAssistantStore.setState({ drafts: { "c-2": "draft for c-2" } });
    renderWithQuery(<AssistantComposer />);
    await userEvent.type(input(), "new chat draft");

    act(() => useAssistantStore.getState().selectConversation("c-2"));
    expect(input()).toHaveValue("draft for c-2");

    act(() => useAssistantStore.getState().startNewConversation());
    expect(input()).toHaveValue("new chat draft");
  });

  it("clears the draft of the conversation on send", async () => {
    renderWithQuery(<AssistantComposer />);

    await userEvent.type(input(), "hello{Enter}");

    await waitFor(() => expect(streamAssistantChat).toHaveBeenCalledTimes(1));
    expect(useAssistantStore.getState().drafts).toEqual({});
  });

  it("names the selected step that is sent as context on the workflow screen", () => {
    usePathname.mockReturnValue("/workflows");
    useWorkflowStore.setState({
      workflowId: "wf-1",
      nodes: [buildWorkflowNode({ id: "design", data: { type: "design-image", label: "Design image 1", config: {}, status: "idle" } })],
      selectedNodeIds: ["design"],
    });

    renderWithQuery(<AssistantComposer />);

    expect(screen.getByText("Selected: Design image 1")).toBeInTheDocument();
  });

  it("shows no context label without a selected step", () => {
    usePathname.mockReturnValue("/workflows");
    useWorkflowStore.setState({ workflowId: "wf-1", nodes: [buildWorkflowNode({ id: "design" })], selectedNodeIds: [] });

    renderWithQuery(<AssistantComposer />);

    expect(screen.queryByText(/^Selected:/)).not.toBeInTheDocument();
  });
});
