import { describe, expect, it } from "vitest";

import { getShotImageGeometry, getTransitionFrameStyle, type StandardVideoScene } from "./index";

const scene: StandardVideoScene = {
  mockupId: "approved-keyframe",
  sceneOrder: 0,
  durationFrames: 90,
  crop: { x: 0.2, y: 0.1, width: 0.6, height: 0.75 },
  endCrop: { x: 0.2, y: 0.1, width: 0.6, height: 0.75 },
  motion: "zoom",
  transition: "flash",
  text: "",
};

describe("video composition", () => {
  it("maps the normalized crop viewport directly onto the output canvas", () => {
    const geometry = getShotImageGeometry(
      scene,
      { url: "portrait-keyframe", width: 768, height: 1376 },
      0,
      { width: 1080, height: 1920 }
    );

    expect(geometry).toEqual({
      mode: "crop",
      width: 1800,
      height: 2560,
      left: -360,
      top: -256,
    });
  });

  it("puts the flash peak on the scene boundary and fades it before the overlap ends", () => {
    const boundary = getTransitionFrameStyle("flash", 0, 12, "incoming");
    const middle = getTransitionFrameStyle("flash", 6, 12, "incoming");
    const end = getTransitionFrameStyle("flash", 11, 12, "incoming");

    expect(boundary.flashOpacity).toBeCloseTo(0.88);
    expect(middle.flashOpacity).toBeLessThan(0.2);
    expect(end.flashOpacity).toBe(0);
  });
});
