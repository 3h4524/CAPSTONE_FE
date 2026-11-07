import { IMAGE_QUALITY_LIVE_RANGES } from "@/constants/image-quality";
import {
  formatImageQualityNumber,
  formatImageQualityPercent,
  formatImageQualitySeconds,
  formatImageQualityUsd,
} from "@/helpers/image-quality-format";
import type {
  ImageQualityLiveCard,
  ImageQualityLiveFilter,
  ImageQualityLiveHighlights,
  ImageQualityLiveRange,
  ImageQualityLiveVersion,
} from "@/types/admin-image-quality";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const getImageQualityLiveFilter = (
  range: ImageQualityLiveRange,
  now: Date
): ImageQualityLiveFilter => {
  const days = IMAGE_QUALITY_LIVE_RANGES.find((item) => item.value === range)?.days ?? null;
  return days === null
    ? {}
    : { fromUtc: new Date(now.getTime() - days * MILLISECONDS_PER_DAY).toISOString() };
};

export const isImageQualityLiveRange = (value: string): value is ImageQualityLiveRange =>
  IMAGE_QUALITY_LIVE_RANGES.some((item) => item.value === value);

export const getImageQualityAttempts = (version: ImageQualityLiveVersion): number =>
  version.images + version.failedAttempts + version.blockedAttempts;

const getNewestVersion = (
  versions: ReadonlyArray<ImageQualityLiveVersion>
): ImageQualityLiveVersion | null =>
  versions.reduce<ImageQualityLiveVersion | null>(
    (newest, version) =>
      newest === null || (version.sinceUtc ?? "") >= (newest.sinceUtc ?? "") ? version : newest,
    null
  );

const getOldestSameProvider = (
  versions: ReadonlyArray<ImageQualityLiveVersion>,
  current: ImageQualityLiveVersion
): ImageQualityLiveVersion | null =>
  versions
    .filter((version) => version.provider === current.provider && version.key !== current.key)
    .reduce<ImageQualityLiveVersion | null>(
      (oldest, version) =>
        oldest === null || (version.sinceUtc ?? "") < (oldest.sinceUtc ?? "") ? version : oldest,
      null
    );

export const getImageQualityLiveHighlights = (
  versions: ReadonlyArray<ImageQualityLiveVersion>
): ImageQualityLiveHighlights | null => {
  const current = getNewestVersion(versions);
  if (!current) {
    return null;
  }
  const baseline = getOldestSameProvider(versions, current);

  const describe = (
    label: string,
    format: (version: ImageQualityLiveVersion) => string,
    note: string
  ): ImageQualityLiveCard => ({
    label,
    value: format(current),
    baseline: baseline ? format(baseline) : null,
    note,
  });

  return {
    current,
    baseline,
    cards: [
      describe(
        "Failed or blocked",
        (version) => formatImageQualityPercent(version.failureRate),
        "Share of attempts that saved no image"
      ),
      describe(
        "Regenerate requests",
        (version) => formatImageQualityNumber(version.regenerateRate, 2),
        "Per product that got designs"
      ),
      describe(
        "Time per image",
        (version) => formatImageQualitySeconds(version.averageGenerationSeconds),
        "Average, saved images only"
      ),
      describe(
        "Cost per image",
        (version) => formatImageQualityUsd(version.averageCostUsd),
        "Average provider cost"
      ),
    ],
  };
};
