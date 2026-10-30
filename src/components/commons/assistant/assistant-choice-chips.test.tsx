import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantChoiceChips } from "@/components/commons/assistant/assistant-choice-chips";
import { createAssistantPlaceholder } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import type { AssistantChoices } from "@/types/assistant";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const choices: AssistantChoices = {
  question: "Which video mode?",
  options: [
    { label: "Standard", value: "Use standard mode" },
    { label: "AI scenes", value: "Use AI scene mode" },
  ],
  allowFreeText: true,
};

describe("AssistantChoiceChips", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    streamAssistantChat.mockReset();
    streamAssistantChat.mockResolvedValue(undefined);
  });

  it("shows the question and one chip per option", () => {
    renderWithQuery(<AssistantChoiceChips messageId="m1" choices={choices} choicesUsed={false} />);

    expect(screen.getByText("Which video mode?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standard" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "AI scenes" })).toBeEnabled();
  });

  it("sends the option value and marks the choices as used", async () => {
    const placeholder = createAssistantPlaceholder();
    useAssistantStore.setState({ messages: [{ ...placeholder, id: "m1" }] });
    renderWithQuery(<AssistantChoiceChips messageId="m1" choices={choices} choicesUsed={false} />);

    await userEvent.click(screen.getByRole("button", { name: "AI scenes" }));

    const state = useAssistantStore.getState();
    expect(state.messages.find((message) => message.id === "m1")?.choicesUsed).toBe(true);
    expect(state.messages.some((message) => message.role === "user" && message.content === "Use AI scene mode")).toBe(true);
  });

  it("disables every chip once the choices were used", () => {
    renderWithQuery(<AssistantChoiceChips messageId="m1" choices={choices} choicesUsed />);

    expect(screen.getByRole("button", { name: "Standard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI scenes" })).toBeDisabled();
  });
});
