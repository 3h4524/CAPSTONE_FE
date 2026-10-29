import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/constants/support";
import type { TicketPriority, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

const priorityStyles: Record<TicketPriority, string> = {
  low: "border-transparent bg-[#f3f6fb] text-[#344862]",
  normal: "border-transparent bg-[#fff3dd] text-[#9a6208]",
  high: "border-transparent bg-[#fde8e8] text-[#c32028]",
  urgent: "border-transparent bg-[#f9d9dc] text-[#a30f1a]",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <StatusBadge status={status} className={cn("min-h-6 rounded-md px-2 text-[11px] font-semibold shadow-none")}>{STATUS_LABELS[status]}</StatusBadge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={cn("min-h-6 rounded-md px-2 text-[11px] font-semibold shadow-none", priorityStyles[priority])}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
