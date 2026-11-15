import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import type { TicketPriority, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

const priorityStyles: Record<TicketPriority, string> = {
  low: "border-transparent bg-ink-100 text-[#344862] dark:text-[#a2b5cd]",
  normal: "border-transparent bg-ink-100 text-[#9a6208] dark:text-[#edc482]",
  high: "border-transparent bg-ink-200 text-[#c32028] dark:text-[#eb8489]",
  urgent: "border-transparent bg-ink-300 text-[#a30f1a] dark:text-[#ed828a]",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useTranslation("common");

  return (
    <StatusBadge status={status} className={cn("min-h-6 rounded-md px-2 text-[11px] font-semibold shadow-none")}>{t(`support.statuses.${status}`)}</StatusBadge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useTranslation("common");

  return (
    <Badge variant="outline" className={cn("min-h-6 rounded-md px-2 text-[11px] font-semibold shadow-none", priorityStyles[priority])}>
      {t(`support.priorities.${priority}`)}
    </Badge>
  );
}
