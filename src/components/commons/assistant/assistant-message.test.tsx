import { beforeEach, describe, expect, it } from "vitest";

import { AssistantMessage } from "@/components/commons/assistant/assistant-message";
import { createAssistantPlaceholder } from "@/helpers/assistant-reducer";
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

    expect(screen.getByText("The assistant is busy, retrying in 8s…")).toBeInTheDocument();
  });

  it("keeps showing the retry countdown after tools have run", () => {
    const message = {
      ...createAssistantPlaceholder(),
      retryInSeconds: 2,
      tools: [{ callId: "t-1", name: "list_workflows", status: "ok" as const }],
    };

    renderWithQuery(<AssistantMessage message={message} />);

    expect(screen.getByText("The assistant is busy, retrying in 2s…")).toBeInTheDocument();
  });
});
