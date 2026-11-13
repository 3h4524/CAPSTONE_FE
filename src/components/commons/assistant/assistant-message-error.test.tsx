import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantMessageError } from "@/components/commons/assistant/assistant-message-error";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
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

  const seedFailedExchange = () => {
    const prompt = createUserMessage("Last question");
    const failed = { ...createAssistantPlaceholder(), isStreaming: false, error: { code: "x", message: "Model unavailable" } };
    useAssistantStore.setState({ messages: [createUserMessage("Earlier"), prompt, failed] });
    return failed;
  };

  it("shows the error message", () => {
    const failed = seedFailedExchange();
    renderWithQuery(<AssistantMessageError messageKey={failed.key} error={{ code: "x", message: "Model unavailable" }} />);

    expect(screen.getByText("Model unavailable")).toBeInTheDocument();
  });

  it("retries the failed exchange in place", async () => {
    const failed = seedFailedExchange();
    renderWithQuery(<AssistantMessageError messageKey={failed.key} error={{ code: "x", message: "Model unavailable" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(streamAssistantChat).toHaveBeenCalledTimes(1));
    expect((streamAssistantChat.mock.calls[0]?.[0] as { message: string }).message).toBe("Last question");
    expect(useAssistantStore.getState().messages.filter((message) => message.content === "Last question")).toHaveLength(1);
  });

  it("offers Retry only on the latest failed reply", () => {
    const failed = seedFailedExchange();
    useAssistantStore.setState((state) => ({ messages: [...state.messages, createUserMessage("Next question")] }));

    renderWithQuery(<AssistantMessageError messageKey={failed.key} error={{ code: "x", message: "Model unavailable" }} />);

    expect(screen.getByText("Model unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("does not offer Retry for a blocked answer", () => {
    const failed = seedFailedExchange();

    renderWithQuery(<AssistantMessageError messageKey={failed.key} error={{ code: "assistant.blocked", message: "Podi can't help with that request." }} />);

    expect(screen.getByText("Podi can't help with that request.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
