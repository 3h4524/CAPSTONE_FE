import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantMessageError } from "@/components/commons/assistant/assistant-message-error";
import { createUserMessage } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

describe("AssistantMessageError", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    streamAssistantChat.mockReset();
    streamAssistantChat.mockReturnValue(new Promise(() => undefined));
  });

  it("shows the error message", () => {
    renderWithQuery(<AssistantMessageError error={{ code: "x", message: "Model unavailable" }} />);

    expect(screen.getByText("Model unavailable")).toBeInTheDocument();
  });

  it("resends the last user message on retry", async () => {
    useAssistantStore.setState({ messages: [createUserMessage("Earlier"), createUserMessage("Last question")] });
    renderWithQuery(<AssistantMessageError error={{ code: "x", message: "Model unavailable" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(streamAssistantChat).toHaveBeenCalledTimes(1));
    expect((streamAssistantChat.mock.calls[0]?.[0] as { message: string }).message).toBe("Last question");
  });

  it("disables retry while a message is streaming", () => {
    useAssistantStore.setState({ streamingMessageId: "m-1" });

    renderWithQuery(<AssistantMessageError error={{ code: "x", message: "Model unavailable" }} />);

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
  });
});
