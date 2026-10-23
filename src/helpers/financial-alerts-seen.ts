import type { FinancialAlertDto } from "@/types/revenue";

/** What an admin has seen: for each alert rule, the count it showed at the time (null for a rate alert). */
export type SeenAlerts = Record<string, number | null>;

/** Alerts that need action; only these count toward the unread badge. */
export const isUrgentAlert = (alert: FinancialAlertDto) => alert.type === "danger" || alert.type === "warning";

/**
 * Whether an alert is new to the admin: its rule was not raised when they last looked, or it now
 * counts more than it did then (3 unpaid renewals growing to 5). A shrinking count is not news.
 */
export function isUnseenAlert(alert: FinancialAlertDto, seen: SeenAlerts): boolean {
  if (!(alert.id in seen)) return true;
  const seenCount = seen[alert.id];
  return alert.count != null && (seenCount == null || alert.count > seenCount);
}

export const countUnseenUrgent = (alerts: FinancialAlertDto[], seen: SeenAlerts) =>
  alerts.filter((a) => isUrgentAlert(a) && isUnseenAlert(a, seen)).length;

/**
 * Records the alerts as they are now. Rules no longer raised are dropped, so a rule that clears
 * and later fires again is new again.
 */
export const markAlertsSeen = (alerts: FinancialAlertDto[]): SeenAlerts =>
  Object.fromEntries(alerts.map((a) => [a.id, a.count ?? null]));

// Read state lives in this browser, per admin, like the support ticket read markers.
const storageKey = (userId: string) => `apcs:financial-alerts-seen:${userId}`;

export function loadSeenAlerts(userId: string): SeenAlerts {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as SeenAlerts) : {};
  } catch {
    return {};
  }
}

export function saveSeenAlerts(userId: string, seen: SeenAlerts): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    // Storage can be full or blocked (private mode); the badge then simply comes back next visit.
  }
}
