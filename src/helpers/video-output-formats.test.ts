import { describe, expect, it } from "vitest";

import { getVideoOutputFormat, VIDEO_OUTPUT_FORMATS } from "@/helpers/video-output-formats";

describe("video output formats", () => {
  // The order of Design Image's aspect ratios, so the two controls read the same.
  it("offers every ratio MiniMax makes videos in, square first", () => {
    expect(VIDEO_OUTPUT_FORMATS.map((format) => format.aspectRatio)).toEqual(["1:1", "16:9", "9:16", "4:3", "3:4"]);
  });

  it.each(VIDEO_OUTPUT_FORMATS)("sizes $value in its own ratio, with even sides", (format) => {
    const [width, height] = format.aspectRatio.split(":").map(Number);
    expect(format.width * height!).toBe(format.height * width!);
    expect(format.width % 2).toBe(0);
    expect(format.height % 2).toBe(0);
  });

  it("falls back to square, the default, for a format it does not know", () => {
    expect(getVideoOutputFormat("cinema").value).toBe("square");
    expect(getVideoOutputFormat(undefined).value).toBe("square");
    expect(getVideoOutputFormat("classic_landscape").aspectRatio).toBe("4:3");
  });
});
