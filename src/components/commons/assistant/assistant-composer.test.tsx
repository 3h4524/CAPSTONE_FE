import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { ASSISTANT_MAX_MESSAGE_LENGTH } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { screen, waitFor } from "@testing-library/react";
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
});
