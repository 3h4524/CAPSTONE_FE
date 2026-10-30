import { beforeEach, describe, expect, it } from "vitest";

import { ASSISTANT_DISPLAY_MODE_STORAGE_KEY } from "@/constants/assistant";
import { isBubbleOpen, isDockedPanelOpen, loadDisplayMode, saveDisplayMode } from "@/helpers/assistant-display-mode";

describe("assistant display mode storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the saved mode", () => {
    saveDisplayMode("bubble");

    expect(loadDisplayMode()).toBe("bubble");
  });

  it("ignores missing or unknown values", () => {
    expect(loadDisplayMode()).toBeNull();

    window.localStorage.setItem(ASSISTANT_DISPLAY_MODE_STORAGE_KEY, "floating");

    expect(loadDisplayMode()).toBeNull();
  });

  it("keeps the chat in the bubble while docking is turned off, even if the panel was saved", () => {
    const savedPanel = { isOpen: true, displayMode: "panel" as const };

    expect(isDockedPanelOpen(savedPanel)).toBe(false);
    expect(isBubbleOpen(savedPanel)).toBe(true);
    expect(isBubbleOpen({ isOpen: false, displayMode: "bubble" })).toBe(false);
  });
});
