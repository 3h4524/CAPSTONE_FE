import { beforeEach, describe, expect, it } from "vitest";

import { AssistantPanel } from "@/components/commons/assistant/assistant-panel";
import { ASSISTANT_PANEL_DEFAULT_WIDTH_PX } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { renderWithQuery } from "@/test/render-with-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";

describe("AssistantPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAssistantStore.setState({ ...useAssistantStore.getInitialState(), isOpen: true }, true);
    window.innerWidth = 1600;
  });

  it("publishes its width so the page can make room for it", async () => {
    renderWithQuery(<AssistantPanel />);

    await waitFor(() => expect(useAssistantStore.getState().panelWidth).toBe(ASSISTANT_PANEL_DEFAULT_WIDTH_PX));
  });

  it("can be resized from the keyboard and the new width is published", async () => {
    renderWithQuery(<AssistantPanel />);
    const handle = await screen.findByRole("separator", { name: "Resize the assistant" });

    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });

    await waitFor(() => expect(useAssistantStore.getState().panelWidth).toBeGreaterThan(ASSISTANT_PANEL_DEFAULT_WIDTH_PX));
  });

  it("restores the width saved by an earlier visit", async () => {
    window.localStorage.setItem("apcs.assistant.panel-width", "560");

    renderWithQuery(<AssistantPanel />);

    await waitFor(() => expect(useAssistantStore.getState().panelWidth).toBe(560));
  });

  it("offers a switch to the bubble and hides itself in bubble mode", async () => {
    renderWithQuery(<AssistantPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Switch to bubble" }));

    expect(useAssistantStore.getState().displayMode).toBe("bubble");
    await waitFor(() => expect(screen.queryByRole("separator", { name: "Resize the assistant" })).not.toBeInTheDocument());
  });

  it("does not render when closed", () => {
    useAssistantStore.setState({ isOpen: false });

    renderWithQuery(<AssistantPanel />);

    expect(screen.queryByRole("separator", { name: "Resize the assistant" })).not.toBeInTheDocument();
  });
});
