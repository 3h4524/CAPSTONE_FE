import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

const statusStyles: Record<string, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  waiting_customer: "border-amber-200 bg-amber-50 text-amber-800",
  queued: "border-blue-200 bg-blue-50 text-blue-800",
  processing: "border-indigo-200 bg-indigo-50 text-indigo-800",
  in_progress: "border-indigo-200 bg-indigo-50 text-indigo-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  exported: "border-emerald-200 bg-emerald-50 text-emerald-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  open: "border-slate-200 bg-slate-100 text-slate-700",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
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
        statusStyles[normalizedStatus] ?? "border-slate-200 bg-slate-100 text-slate-700",
        className
      )}
    >
      {label}
    </Badge>
  );
}
