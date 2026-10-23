import type { TransactionStatus } from "@/types/revenue";

export const TRANSACTION_STATUSES: TransactionStatus[] = [
  "paid",
  "pending",
  "overdue",
  "refunded",
  "cancelled",
  "draft",
];

export const TRANSACTION_STATUS_STYLE: Record<TransactionStatus, { label: string; className: string }> = {
  paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  },
  overdue: {
    label: "Overdue",
    className: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900",
  },
  refunded: {
    label: "Refunded",
    className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  },
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  },
};

/** Falls back to a neutral pill for a status this client does not know yet. */
export function getTransactionStatusStyle(status: string) {
  return (
    TRANSACTION_STATUS_STYLE[status as TransactionStatus] ?? {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className: TRANSACTION_STATUS_STYLE.draft.className,
    }
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a transaction date as "30 Oct 2026 11:20". Only the payment date is stored, so the time
 * comes from the invoice's creation (checkout) timestamp and is shown only when it falls on that day.
 */
export function formatTransactionDate(paymentDate: string | null, createdAt?: string | null): string {
  if (!paymentDate) return "—";
  const [y, m, d] = paymentDate.split("-").map(Number);
  const day = `${pad(d)} ${MONTHS[m - 1]} ${y}`;

  if (!createdAt) return day;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return day;
  const sameDay = created.getFullYear() === y && created.getMonth() === m - 1 && created.getDate() === d;
  return sameDay ? `${day} ${pad(created.getHours())}:${pad(created.getMinutes())}` : day;
}

/** Formats a YYYY-MM-DD filter date as "Oct 01, 2026". */
export function formatRangeDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${MONTHS[m - 1]} ${pad(d)}, ${y}`;
}

/**
 * Page buttons for a pager: always the first and last page and up to one neighbour on each side of
 * the current one, with "…" for the gaps, e.g. 1 2 3 … 31.
 */
export function getPageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 0) return [];
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 1, total - 2].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items: Array<number | "…"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push("…");
    items.push(p);
  });
  return items;
}
