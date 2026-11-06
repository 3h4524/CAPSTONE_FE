import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantMessageList } from "@/components/commons/assistant/assistant-message-list";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { act, fireEvent, screen } from "@testing-library/react";

let reportIntersection: (isIntersecting: boolean) => void = () => undefined;

class ControlledIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    reportIntersection = (isIntersecting) =>
      callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }

  observe() {
    return;
  }

  disconnect() {
    return;
  }
}

const scrollIntoView = vi.fn();
const originalScrollIntoView = Element.prototype.scrollIntoView;

const seedConversation = () => {
  const user = createUserMessage("Hello");
  const placeholder = createAssistantPlaceholder();
  useAssistantStore.setState({ messages: [user, placeholder], streamingMessageId: placeholder.id });
};

describe("AssistantMessageList", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("follows new text while the user is at the bottom", () => {
    seedConversation();
    renderWithQuery(<AssistantMessageList />);
    scrollIntoView.mockClear();

    act(() => useAssistantStore.getState().applyStreamEvent({ type: "delta", data: { text: "Hi" } }));

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("keeps the scroll position and offers a jump button while the user reads earlier messages", () => {
    seedConversation();
    renderWithQuery(<AssistantMessageList />);
    act(() => reportIntersection(false));
    scrollIntoView.mockClear();

    act(() => useAssistantStore.getState().applyStreamEvent({ type: "delta", data: { text: "Hi" } }));

    expect(scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "end", behavior: "smooth" });
  });

  it("scrolls to the bottom when the user sends a new message even after scrolling up", () => {
    seedConversation();
    renderWithQuery(<AssistantMessageList />);
    act(() => reportIntersection(false));
    useAssistantStore.setState({ streamingMessageId: null });
    scrollIntoView.mockClear();

    act(() => useAssistantStore.getState().beginExchange(createUserMessage("Next"), createAssistantPlaceholder()));

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("hides the jump button at the bottom", () => {
    seedConversation();
    renderWithQuery(<AssistantMessageList />);

    act(() => reportIntersection(true));

    expect(screen.queryByRole("button", { name: "Latest" })).not.toBeInTheDocument();
  });
});
