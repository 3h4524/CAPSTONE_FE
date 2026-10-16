export const VIDEO_OUTPUT_FORMATS = [
  { value: "square", label: "Square", dimensions: "1080 × 1080", aspectRatio: "1:1", width: 1080, height: 1080 },
  { value: "portrait", label: "Portrait", dimensions: "1080 × 1920", aspectRatio: "9:16", width: 1080, height: 1920 },
  { value: "tall", label: "Tall portrait", dimensions: "1080 × 2160", aspectRatio: "1:2", width: 1080, height: 2160 },
  { value: "landscape", label: "Landscape", dimensions: "1920 × 1080", aspectRatio: "16:9", width: 1920, height: 1080 },
] as const;

export type VideoOutputFormat = typeof VIDEO_OUTPUT_FORMATS[number]["value"];

export const getVideoOutputFormat = (value: unknown) =>
  VIDEO_OUTPUT_FORMATS.find(format => format.value === value) ?? VIDEO_OUTPUT_FORMATS[2];
