import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

const statusStyles: Record<string, string> = {
  draft: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  pending: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  waiting_customer: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  queued: "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300",
  processing: "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
  in_progress: "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
  completed: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  approved: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  exported: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  published: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  resolved: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  failed: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
  running: "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
  generating_image: "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300",
  image_review_required: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  partially_completed: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  open: "border-ink-200 bg-ink-100 text-ink-700",
  closed: "border-ink-200 bg-ink-100 text-ink-700",
};

type StatusBadgeProps = {
  status: string;
  children?: ReactNode;
  className?: string;
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const label = children ?? normalizedStatus.replaceAll("_", " ");

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-1 font-medium",
        statusStyles[normalizedStatus] ?? "border-ink-200 bg-ink-100 text-ink-700",
        className
      )}
    >
      {label}
    </Badge>
  );
}
