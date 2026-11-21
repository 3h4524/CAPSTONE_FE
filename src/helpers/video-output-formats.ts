export const VIDEO_OUTPUT_FORMATS = [
  { value: "square", label: "Square", dimensions: "1080 × 1080", aspectRatio: "1:1", width: 1080, height: 1080 },
  { value: "landscape", label: "Landscape", dimensions: "1920 × 1080", aspectRatio: "16:9", width: 1920, height: 1080 },
  { value: "portrait", label: "Portrait", dimensions: "1080 × 1920", aspectRatio: "9:16", width: 1080, height: 1920 },
  { value: "classic_landscape", label: "Classic landscape", dimensions: "1440 × 1080", aspectRatio: "4:3", width: 1440, height: 1080 },
  { value: "classic_portrait", label: "Classic portrait", dimensions: "1080 × 1440", aspectRatio: "3:4", width: 1080, height: 1440 },
] as const;

export type VideoOutputFormat = typeof VIDEO_OUTPUT_FORMATS[number]["value"];

export const getVideoOutputFormats = (_mode: unknown) => VIDEO_OUTPUT_FORMATS;

export const getVideoOutputFormat = (value: unknown, mode?: unknown) =>
  getVideoOutputFormats(mode).find(format => format.value === value) ?? VIDEO_OUTPUT_FORMATS[0];
