import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ASSISTANT_LAUNCHER_PHONE_BOTTOM_PX, ASSISTANT_LAUNCHER_STORAGE_KEY } from "@/constants/assistant";
import {
  clampLauncherPosition,
  defaultLauncherPosition,
  keepClearOfBottomTabs,
  loadLauncherPosition,
  saveLauncherPosition,
} from "@/helpers/assistant-launcher-position";

const viewport = { width: 1000, height: 800 };

describe("defaultLauncherPosition", () => {
  describe("on a phone", () => {
    const desktopWidth = window.innerWidth;

    beforeEach(() => {
      window.innerWidth = 375;
    });

    afterEach(() => {
      window.innerWidth = desktopWidth;
    });

    it("sits above the bottom tabs on Seller pages", () => {
      expect(defaultLauncherPosition("/dashboard").bottom).toBe(ASSISTANT_LAUNCHER_PHONE_BOTTOM_PX);
    });

    it("lifts a launcher dragged onto the bottom tabs", () => {
      expect(keepClearOfBottomTabs({ right: 8, bottom: 8 }, "/batches").bottom).toBe(ASSISTANT_LAUNCHER_PHONE_BOTTOM_PX);
    });

    it("leaves a launcher dragged higher up where it is", () => {
      expect(keepClearOfBottomTabs({ right: 8, bottom: 300 }, "/batches").bottom).toBe(300);
    });

    it("stays low on admin pages, which have no bottom tabs", () => {
      expect(defaultLauncherPosition("/admin/users").bottom).toBeLessThan(ASSISTANT_LAUNCHER_PHONE_BOTTOM_PX);
    });
  });

  it("sits above the minimap on the workflow editor", () => {
    expect(defaultLauncherPosition("/workflows").bottom).toBeGreaterThan(defaultLauncherPosition("/dashboard").bottom);
  });
});

describe("clampLauncherPosition", () => {
  it("keeps a position that already fits", () => {
    expect(clampLauncherPosition({ right: 100, bottom: 200 }, viewport)).toEqual({ right: 100, bottom: 200 });
  });

  it("pulls a position back inside the viewport", () => {
    const clamped = clampLauncherPosition({ right: -50, bottom: 5000 }, viewport);

    expect(clamped.right).toBe(8);
    expect(clamped.bottom).toBe(800 - 48 - 8);
  });

  it("never returns a negative offset on a tiny viewport", () => {
    const clamped = clampLauncherPosition({ right: 500, bottom: 500 }, { width: 20, height: 20 });

    expect(clamped.right).toBeGreaterThanOrEqual(8);
    expect(clamped.bottom).toBeGreaterThanOrEqual(8);
  });
});

describe("saved launcher position", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips through localStorage", () => {
    saveLauncherPosition({ right: 120, bottom: 64 });

    expect(loadLauncherPosition()).toEqual({ right: 120, bottom: 64 });
  });

  it.each(["not json", "null", '{"right":"x","bottom":1}', '{"right":1}', "[1,2]"])("ignores invalid stored value %s", (raw) => {
    window.localStorage.setItem(ASSISTANT_LAUNCHER_STORAGE_KEY, raw);

    expect(loadLauncherPosition()).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(loadLauncherPosition()).toBeNull();
  });
});
