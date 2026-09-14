export function relativeTime(value: string | null, now: number, empty = "Never"): string {
  if (!value) return empty;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return empty;
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
