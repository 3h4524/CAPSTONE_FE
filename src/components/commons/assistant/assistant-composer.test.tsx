import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { ASSISTANT_MAX_MESSAGE_LENGTH } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const input = () => screen.getByPlaceholderText("Ask the assistant");

describe("AssistantComposer", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
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
});
