import type { Region } from "@/types/video-workflow";

const precision = (value: number) => Math.round(value * 10_000) / 10_000;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export const MIN_REGION_SIZE = 0.04;

export const clampRegion = (region: Region): Region => {
  const width = clamp(region.width, MIN_REGION_SIZE, 1);
  const height = clamp(region.height, MIN_REGION_SIZE, 1);
  return {
    x: precision(clamp(region.x, 0, 1 - width)),
    y: precision(clamp(region.y, 0, 1 - height)),
    width: precision(width),
    height: precision(height),
  };
};

export const createRegion = (start: { x: number; y: number }, end: { x: number; y: number }): Region =>
  clampRegion({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(MIN_REGION_SIZE, Math.abs(end.x - start.x)),
    height: Math.max(MIN_REGION_SIZE, Math.abs(end.y - start.y)),
  });

export const moveRegion = (region: Region, deltaX: number, deltaY: number): Region =>
  clampRegion({ ...region, x: region.x + deltaX, y: region.y + deltaY });

export const resizeRegion = (region: Region, deltaWidth: number, deltaHeight: number): Region =>
  clampRegion({
    ...region,
    width: Math.min(1 - region.x, region.width + deltaWidth),
    height: Math.min(1 - region.y, region.height + deltaHeight),
  });
