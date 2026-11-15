import type { TFunction } from "i18next";

export function relativeTime(value: string | null, now: number, t: TFunction): string {
  if (!value) return t("apiKeys.neverUsed");
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return t("apiKeys.neverUsed");
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return t("apiKeys.justNow");
  if (minutes < 60) return t("apiKeys.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("apiKeys.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("apiKeys.yesterday");
  return t("apiKeys.daysAgo", { count: days });
}
