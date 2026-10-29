import { beforeEach, describe, expect, it } from "vitest";

import { AssistantLauncher } from "@/components/commons/assistant/assistant-launcher";
import { ASSISTANT_LAUNCHER_STORAGE_KEY } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { renderWithQuery } from "@/test/render-with-query";
import { fireEvent, screen } from "@testing-library/react";

const launcher = () => screen.getByRole("button", { name: "Open assistant" });

const drag = (element: HTMLElement, from: [number, number], to: [number, number]) => {
  fireEvent.pointerDown(element, { clientX: from[0], clientY: from[1], button: 0, pointerId: 1 });
  fireEvent.pointerMove(element, { clientX: to[0], clientY: to[1], pointerId: 1 });
  fireEvent.pointerUp(element, { clientX: to[0], clientY: to[1], pointerId: 1 });
  fireEvent.click(element);
};

describe("AssistantLauncher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    usePathname.mockReturnValue("/dashboard");
    window.innerWidth = 1000;
    window.innerHeight = 800;
  });

  it("opens the panel on a plain click", () => {
    renderWithQuery(<AssistantLauncher />);

    fireEvent.click(launcher());

    expect(useAssistantStore.getState().isOpen).toBe(true);
  });

  it("starts in the bottom-right corner", () => {
    renderWithQuery(<AssistantLauncher />);

    expect(launcher()).toHaveStyle({ right: "16px", bottom: "16px" });
  });

  it("moves with the pointer and does not open the panel after a drag", () => {
    renderWithQuery(<AssistantLauncher />);

    drag(launcher(), [900, 700], [800, 600]);

    expect(launcher()).toHaveStyle({ right: "116px", bottom: "116px" });
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });

  it("treats a tiny movement as a click", () => {
    renderWithQuery(<AssistantLauncher />);

    drag(launcher(), [900, 700], [901, 701]);

    expect(useAssistantStore.getState().isOpen).toBe(true);
    expect(launcher()).toHaveStyle({ right: "16px", bottom: "16px" });
  });

  it("cannot be dragged outside the viewport", () => {
    renderWithQuery(<AssistantLauncher />);

    drag(launcher(), [900, 700], [5000, 5000]);

    expect(launcher()).toHaveStyle({ right: "8px", bottom: "8px" });
  });

  it("remembers the position after a drag", () => {
    renderWithQuery(<AssistantLauncher />);

    drag(launcher(), [900, 700], [800, 600]);

    expect(JSON.parse(window.localStorage.getItem(ASSISTANT_LAUNCHER_STORAGE_KEY) ?? "null")).toEqual({ right: 116, bottom: 116 });
  });

  it("restores a saved position on mount", () => {
    window.localStorage.setItem(ASSISTANT_LAUNCHER_STORAGE_KEY, JSON.stringify({ right: 200, bottom: 120 }));

    renderWithQuery(<AssistantLauncher />);

    expect(launcher()).toHaveStyle({ right: "200px", bottom: "120px" });
  });

  it("moves with Shift+Arrow keys for keyboard users", () => {
    renderWithQuery(<AssistantLauncher />);

    fireEvent.keyDown(launcher(), { key: "ArrowUp", shiftKey: true });

    expect(launcher()).toHaveStyle({ bottom: "32px" });
  });

  it("ignores the secondary mouse button", () => {
    renderWithQuery(<AssistantLauncher />);

    fireEvent.pointerDown(launcher(), { clientX: 900, clientY: 700, button: 2, pointerId: 1 });
    fireEvent.pointerMove(launcher(), { clientX: 800, clientY: 600, pointerId: 1 });

    expect(launcher()).toHaveStyle({ right: "16px", bottom: "16px" });
  });
});
