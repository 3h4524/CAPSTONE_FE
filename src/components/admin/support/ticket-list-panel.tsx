import React, { useEffect, useState } from "react";
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
  { label: "Closed", value: "closed" },
];

export const TicketListPanel = ({
  filters,
  onFiltersChange,
  selectedTicketId,
  onSelectTicket,
}: TicketListPanelProps) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");
  const [localReadState, setLocalReadState] = useState<Record<string, string>>({});

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

  // Auto-mark selected ticket as read when new data comes in
  useEffect(() => {
    if (selectedTicketId && data) {
      const selectedTicket = data.items.find(t => t.id === selectedTicketId);
      if (selectedTicket && typeof window !== "undefined") {
        const storedTime = localStorage.getItem(`read_ticket_${selectedTicket.id}`);
        if (storedTime !== selectedTicket.updatedAtUtc) {
          localStorage.setItem(`read_ticket_${selectedTicket.id}`, selectedTicket.updatedAtUtc);
          setLocalReadState(prev => ({ ...prev, [selectedTicket.id]: selectedTicket.updatedAtUtc }));
        }
      }
    }
  }, [selectedTicketId, data]);

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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onFiltersChange({ ...filters, searchTerm, pageIndex: 1 });
                }
              }}
              placeholder="Search tickets..."
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-slate-300"
            />
          </div>
          <Button variant="outline" size="icon" className="size-9 shrink-0 text-slate-500 shadow-none">
            <Filter className="size-4" />
          </Button>
        </div>

        {/* Tabs (Underline style) */}
        <div className="scrollbar-hide flex gap-4 overflow-x-auto">
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
                  "flex items-center gap-1.5 border-b-2 pb-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
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
              const isReadLocally = isSelected || (typeof window !== "undefined" && localStorage.getItem(`read_ticket_${ticket.id}`) === ticket.updatedAtUtc) || localReadState[ticket.id] === ticket.updatedAtUtc;
              const hasUnread = ticket.hasUnreadMessages && !isReadLocally;
              return (
                <button
                  key={ticket.id}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`read_ticket_${ticket.id}`, ticket.updatedAtUtc);
                      setLocalReadState(prev => ({ ...prev, [ticket.id]: ticket.updatedAtUtc }));
                    }
                    onSelectTicket(ticket.id);
                  }}
                  className={cn(
                    "w-full border-l-2 p-4 text-left transition-colors hover:bg-slate-50",
                    isSelected ? "border-l-blue-600 bg-slate-50" : "border-l-transparent bg-white"
                  )}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("line-clamp-1 text-[14px]", hasUnread || isSelected ? "font-bold text-slate-900" : "font-semibold text-slate-700")}>
                        {ticket.subject}
                      </span>
                      {hasUnread && (
                        <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-rose-600 uppercase shadow-sm">
                          New
                        </span>
                      )}
                    </div>
                    <span className={cn("shrink-0 text-[12px] font-medium", hasUnread ? "font-bold text-slate-700" : "text-slate-500")}>
                      {formatRelativeDate(ticket.updatedAtUtc || ticket.createdAtUtc)}
                    </span>
                  </div>
                  
                  {ticket.lastMessageSnippet && (
                    <p className={cn("mb-2 truncate text-left text-[13px]", hasUnread ? "font-medium text-slate-800" : "text-slate-500")}>
                      {ticket.lastMessageSnippet}
                    </p>
                  )}
                  
                  <div className="mb-2 text-[12px] text-slate-500">
                    #{ticket.ticketNumber} • <span className="capitalize">{ticket.category.replace("_", " ")}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center gap-1.5 text-[12px] font-medium", ticket.priority === "urgent" ? "text-rose-600" : "text-slate-600")}>
                        <div className={cn("size-2 rounded-full", getPriorityDot(ticket.priority))} />
                        <span className="capitalize">{ticket.priority}</span>
                      </div>
                    </div>
                    {ticket.assignedToName ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <div className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                          {ticket.assignedToName.charAt(0).toUpperCase()}
                        </div>
                        <span className="max-w-[100px] truncate">{ticket.assignedToName}</span>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Unassigned
                      </div>
                    )}
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

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return "Just now";
  if (differenceMinutes < 60) return `${differenceMinutes} min ago`;
  if (differenceMinutes < 1_440) return `${Math.floor(differenceMinutes / 60)} hr ago`;
  if (differenceMinutes < 2_880) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
