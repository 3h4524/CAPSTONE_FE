import { beforeEach, describe, expect, it } from "vitest";

import { useSidebarStore } from "@/stores/sidebar";

const initialState = useSidebarStore.getState();

describe("useSidebarStore", () => {
  beforeEach(() => {
    useSidebarStore.setState(initialState, true);
  });

  it("starts expanded", () => {
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });

  it("toggleCollapsed flips the flag", () => {
    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().isCollapsed).toBe(true);

    useSidebarStore.getState().toggleCollapsed();
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });

  it("setCollapsed applies an explicit value", () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().isCollapsed).toBe(true);

    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().isCollapsed).toBe(false);
  });
});