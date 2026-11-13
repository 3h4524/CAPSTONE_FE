import { beforeEach, describe, expect, it } from "vitest";

import { AssistantMessage } from "@/components/commons/assistant/assistant-message";
import { toAssistantUiMessage } from "@/helpers/assistant-messages";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { screen } from "@testing-library/react";

describe("AssistantMessage", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
  });

  it("shows thinking while waiting for the first output", () => {
    renderWithQuery(<AssistantMessage message={createAssistantPlaceholder()} />);

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("shows the retry countdown while the model is busy", () => {
    renderWithQuery(<AssistantMessage message={{ ...createAssistantPlaceholder(), retryInSeconds: 8 }} />);

    expect(screen.getByText("Podi is busy, retrying in 8s…")).toBeInTheDocument();
  });

  it("keeps showing the retry countdown after tools have run", () => {
    const message = {
      ...createAssistantPlaceholder(),
      retryInSeconds: 2,
      tools: [{ callId: "t-1", name: "list_workflows", status: "ok" as const }],
    };

    renderWithQuery(<AssistantMessage message={message} />);

    expect(screen.getByText("Podi is busy, retrying in 2s…")).toBeInTheDocument();
  });

  it("shows the partial text of a stopped reply with a quiet Stopped label and no Retry", () => {
    const stopped = { ...createAssistantPlaceholder(), content: "Half an answer", isStreaming: false, isStopped: true };
    useAssistantStore.setState({ messages: [createUserMessage("Question"), stopped] });

    renderWithQuery(<AssistantMessage message={stopped} />);

    expect(screen.getByText("Half an answer")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toHaveClass("text-muted-foreground");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("offers Retry on the latest reply when it was interrupted", () => {
    const interrupted = toAssistantUiMessage({
      id: "a-1",
      role: "assistant",
      content: "Partial",
      metadata: {},
      status: "interrupted",
      createdAt: "",
    });
    useAssistantStore.setState({ messages: [createUserMessage("Question"), interrupted] });

    renderWithQuery(<AssistantMessage message={interrupted} />);

    expect(screen.getByText("This answer was interrupted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("does not offer Retry on an older interrupted reply", () => {
    const interrupted = toAssistantUiMessage({ id: "a-1", role: "assistant", content: "", metadata: {}, status: "interrupted", createdAt: "" });
    useAssistantStore.setState({ messages: [createUserMessage("Question"), interrupted, createUserMessage("Later")] });

    renderWithQuery(<AssistantMessage message={interrupted} />);

    expect(screen.getByText("This answer was interrupted.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});

