import React, { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Filter, Headphones, Search } from "lucide-react";

import type { AdminTicketFilters } from "@/api/admin-support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminSupportTickets } from "@/hooks/queries/use-admin-support-tickets";
import type { TicketPriority, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

type TicketListPanelProps = {
  filters: AdminTicketFilters;
  onFiltersChange: (newFilters: AdminTicketFilters) => void;
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
};

const TABS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export const TicketListPanel = ({
  filters,
  onFiltersChange,
  selectedTicketId,
  onSelectTicket,
}: TicketListPanelProps) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.searchTerm) {
        onFiltersChange({ ...filters, searchTerm, pageIndex: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filters, onFiltersChange]);

  const { data, isLoading, isError } = useAdminSupportTickets(filters);

  const getPriorityDot = (priority: TicketPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-500";
      case "high":
        return "bg-amber-500";
      case "normal":
        return "bg-blue-500";
      case "low":
        return "bg-slate-400";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-slate-200 bg-white">
      {/* Header & Tabs */}
      <div className="border-b border-slate-200 px-4 pt-4 pb-0">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
          <Headphones className="size-5" />
          Support Tickets
        </h2>

        {/* Search & Filter */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tickets..."
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-slate-300"
            />
          </div>
          <Button variant="outline" size="icon" className="size-9 shrink-0 text-slate-500 shadow-none">
            <Filter className="size-4" />
          </Button>
        </div>

        {/* Tabs (Underline style) */}
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const isActive =
              (tab.value === "all" && !filters.status) || filters.status === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    status: tab.value === "all" ? undefined : (tab.value as TicketStatus),
                    pageIndex: 1,
                  })
                }
                className={cn(
                  "flex items-center gap-1.5 border-b-2 pb-3 text-[13px] font-semibold transition-colors",
                  isActive
                    ? "border-blue-600 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="size-6 text-indigo-600" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load tickets. Please try again.
          </div>
        ) : !data?.items.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No tickets found for the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100/60">
            {data.items.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              return (
                <button
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                  className={cn(
                    "w-full border-l-[3px] p-4 text-left transition-colors hover:bg-slate-50",
                    isSelected ? "border-l-blue-600 bg-blue-50/50" : "border-l-transparent"
                  )}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="line-clamp-1 text-[14px] font-bold text-slate-900">
                      {ticket.subject}
                    </span>
                    <span className={cn("shrink-0 text-[12px] font-medium", isSelected ? "text-blue-600" : "text-slate-500")}>
                      {formatDistanceToNow(new Date(ticket.createdAtUtc), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="mb-2 text-[12px] text-slate-500">
                    #{ticket.ticketNumber} • <span className="capitalize">{ticket.category.replace("_", " ")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn("flex items-center gap-1.5 text-[12px] font-medium", ticket.priority === "urgent" ? "text-rose-600" : "text-blue-600")}>
                      <div className={cn("size-2 rounded-full", getPriorityDot(ticket.priority))} />
                      <span className="capitalize">{ticket.priority}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination (Simple) */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.pageIndex <= 1}
            onClick={() => onFiltersChange({ ...filters, pageIndex: filters.pageIndex - 1 })}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {filters.pageIndex} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.pageIndex >= data.totalPages}
            onClick={() => onFiltersChange({ ...filters, pageIndex: filters.pageIndex + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
