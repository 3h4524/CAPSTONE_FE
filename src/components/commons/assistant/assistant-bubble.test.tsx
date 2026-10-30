import { beforeEach, describe, expect, it } from "vitest";

import { AssistantBubble } from "@/components/commons/assistant/assistant-bubble";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { fireEvent, screen } from "@testing-library/react";

describe("AssistantBubble", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAssistantStore.setState({ ...useAssistantStore.getInitialState(), isOpen: true, displayMode: "bubble" }, true);
  });

  it("shows the chat in a floating bubble when bubble mode is on", () => {
    renderWithQuery(<AssistantBubble />);

    expect(screen.getByRole("dialog", { name: "Assistant" })).toHaveClass("w-[380px]");
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders nothing in panel mode or when closed", () => {
    useAssistantStore.setState({ displayMode: "panel" });
    const { unmount } = renderWithQuery(<AssistantBubble />);
    expect(screen.queryByRole("dialog", { name: "Assistant" })).not.toBeInTheDocument();
    unmount();

    useAssistantStore.setState({ displayMode: "bubble", isOpen: false });
    renderWithQuery(<AssistantBubble />);
    expect(screen.queryByRole("dialog", { name: "Assistant" })).not.toBeInTheDocument();
  });

  it("expands and shrinks", () => {
    renderWithQuery(<AssistantBubble />);

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("dialog", { name: "Assistant" })).toHaveClass("w-[720px]");

    fireEvent.click(screen.getByRole("button", { name: "Make smaller" }));
    expect(screen.getByRole("dialog", { name: "Assistant" })).toHaveClass("w-[380px]");
  });

  it("is the default display and offers no docking", () => {
    expect(useAssistantStore.getInitialState().displayMode).toBe("bubble");

    renderWithQuery(<AssistantBubble />);

    expect(screen.queryByRole("button", { name: "Dock to the side" })).not.toBeInTheDocument();
  });

  it("closes from its own close button and with Escape", () => {
    const { unmount } = renderWithQuery(<AssistantBubble />);
    fireEvent.click(screen.getByRole("button", { name: "Close assistant" }));
    expect(useAssistantStore.getState().isOpen).toBe(false);
    unmount();

    useAssistantStore.setState({ isOpen: true });
    renderWithQuery(<AssistantBubble />);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Assistant" }), { key: "Escape" });
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });
});
