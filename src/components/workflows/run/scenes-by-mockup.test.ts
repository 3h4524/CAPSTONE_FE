import { describe, expect, it } from "vitest";

import { scenesByMockup, usedFirst } from "@/components/workflows/run/run-group-panel";
import type { MockupAsset, RunGroupTarget } from "@/types/video-workflow";

const scene = (sceneIndex: number, mockupId: string | null) => ({ sceneIndex, mockupId, previewUrl: null, warning: null, overridden: false });
const target = (selected: boolean, scenes: RunGroupTarget["scenes"]): Pick<RunGroupTarget, "selected" | "scenes"> => ({ selected, scenes });

describe("scenesByMockup", () => {
  it("lists the 1-based scenes that start from each image", () => {
    const found = scenesByMockup(target(true, [scene(0, "a"), scene(1, "b"), scene(2, "a")]));
    expect(found.get("a")).toEqual([1, 3]);
    expect(found.get("b")).toEqual([2]);
  });

  it("skips a scene left out for the design", () => {
    expect(scenesByMockup(target(true, [scene(0, null), scene(1, "b")])).size).toBe(1);
  });

  it("marks nothing for a design that gets no video", () => {
    expect(scenesByMockup(target(false, [scene(0, "a")])).size).toBe(0);
  });
});

describe("usedFirst", () => {
  const asset = (id: string) => ({ id }) as MockupAsset;

  it("puts the images the video starts from first, in scene order, and keeps the rest as they were", () => {
    const all = [asset("a"), asset("b"), asset("c"), asset("d"), asset("e")];
    const used = new Map([["d", [1]], ["b", [2, 4]], ["e", [3]]]);

    expect(usedFirst(all, used).map((item) => item.id)).toEqual(["d", "b", "e", "a", "c"]);
  });

  it("leaves the order alone when the video uses none of them", () => {
    const all = [asset("a"), asset("b")];
    expect(usedFirst(all, new Map()).map((item) => item.id)).toEqual(["a", "b"]);
  });
});
