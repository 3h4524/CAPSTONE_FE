import React, { useEffect, useState } from "react";
import { Headphones, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AdminTicketFilters } from "@/api/admin-support";
import { TicketFilterSheet } from "@/components/admin/support/ticket-filter-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdminSupportTickets } from "@/hooks/queries/use-admin-support-tickets";
import { i18n } from "@/i18n/client";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/support";
import { cn } from "@/utils/cn";

type TicketListPanelProps = {
  filters: AdminTicketFilters;
  onFiltersChange: (newFilters: AdminTicketFilters) => void;
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
};

const TABS: { value: TicketStatus | "all" }[] = [
  { value: "open" },
  { value: "in_progress" },
  { value: "resolved" },
  { value: "closed" },
];

const CATEGORY_LABEL_KEYS: Record<TicketCategory, string> = {
  integration: "admin.support.categories.integration",
  ai_generation: "admin.support.categories.ai_generation",
  batch_processing: "admin.support.categories.batch_processing",
  export_publishing: "admin.support.categories.export_publishing",
  billing_subscription: "admin.support.categories.billing_subscription",
  account_security: "admin.support.categories.account_security",
  other: "admin.support.categories.other",
};

const PRIORITY_LABEL_KEYS: Record<TicketPriority, string> = {
  low: "admin.support.priorities.low",
  normal: "admin.support.priorities.normal",
  high: "admin.support.priorities.high",
  urgent: "admin.support.priorities.urgent",
};

const STATUS_LABEL_KEYS: Record<TicketStatus, string> = {
  open: "admin.support.statuses.open",
  in_progress: "admin.support.statuses.in_progress",
  waiting_customer: "admin.support.statuses.waiting_customer",
  resolved: "admin.support.statuses.resolved",
  closed: "admin.support.statuses.closed",
};

export const TicketListPanel = ({
  filters,
  onFiltersChange,
  selectedTicketId,
  onSelectTicket,
}: TicketListPanelProps) => {
  const { t } = useTranslation("common");
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
        const storedTime = localStorage.getItem(`read_ticket_admin_${selectedTicket.id}`);
        if (storedTime !== selectedTicket.updatedAtUtc) {
          localStorage.setItem(`read_ticket_admin_${selectedTicket.id}`, selectedTicket.updatedAtUtc);
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
        return "bg-ink-400";
      default:
        return "bg-ink-400";
    }
  };

  return (
    <div className="border-ink-200 bg-card flex min-h-0 flex-1 flex-col border-r">
      {/* Header & Tabs */}
      <div className="border-ink-200 border-b px-4 pt-4 pb-0">
        <h2 className="text-ink-900 mb-4 flex items-center gap-2 text-xl font-bold max-md:mb-3 md:hidden">
          <Headphones className="size-5" />
          {t("admin.support.supportTickets")}
        </h2>

        {/* Search & Filter */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="text-ink-400 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onFiltersChange({ ...filters, searchTerm, pageIndex: 1 });
                }
              }}
              placeholder={t("admin.support.searchPlaceholder")}
              className="border-ink-200 bg-ink-50 focus-visible:ring-ink-300 h-9 pl-9 text-[13px] shadow-none focus-visible:ring-1 max-md:text-base"
            />
          </div>
          <TicketFilterSheet filters={filters} onFiltersChange={onFiltersChange} />
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
                  "flex items-center gap-1.5 border-b-2 pb-3 text-[13px] font-semibold whitespace-nowrap transition-colors max-md:min-h-10 max-md:pt-2",
                  isActive
                    ? "text-ink-900 border-blue-600"
                    : "text-ink-500 hover:border-ink-300 hover:text-ink-700 border-transparent"
                )}
              >
                {tab.value === "all" ? t("admin.support.statuses.all") : t(STATUS_LABEL_KEYS[tab.value])}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="size-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">
            {t("admin.support.ticketsLoadFailed")}
          </div>
        ) : !data?.items.length ? (
          <div className="text-ink-500 p-8 text-center text-sm">
            {t("admin.support.noTicketsForFilters")}
          </div>
        ) : (
          <div className="divide-ink-100/60 divide-y">
            {data.items.map((ticket) => {
              const isSelected = selectedTicketId === ticket.id;
              const isReadLocally = isSelected || (typeof window !== "undefined" && localStorage.getItem(`read_ticket_admin_${ticket.id}`) === ticket.updatedAtUtc) || localReadState[ticket.id] === ticket.updatedAtUtc;
              const hasUnread = ticket.hasUnreadMessages && !isReadLocally;
              return (
                <button
                  key={ticket.id}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem(`read_ticket_admin_${ticket.id}`, ticket.updatedAtUtc);
                      setLocalReadState(prev => ({ ...prev, [ticket.id]: ticket.updatedAtUtc }));
                    }
                    onSelectTicket(ticket.id);
                  }}
                  className={cn(
                    "hover:bg-ink-50 w-full border-l-2 p-4 text-left transition-colors",
                    isSelected ? "bg-ink-50 border-l-blue-600" : "bg-card border-l-transparent"
                  )}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("line-clamp-1 text-[14px]", hasUnread || isSelected ? "text-ink-900 font-bold" : "text-ink-700 font-semibold")}>
                        {ticket.subject}
                      </span>
                      {hasUnread && (
                        <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] leading-none font-bold text-rose-600 uppercase shadow-sm dark:bg-rose-500/15 dark:text-rose-400">
                          {t("admin.support.unreadNew")}
                        </span>
                      )}
                    </div>
                    <span className={cn("shrink-0 text-[12px] font-medium", hasUnread ? "text-ink-700 font-bold" : "text-ink-500")}>
                      {formatRelativeDate(ticket.updatedAtUtc || ticket.createdAtUtc)}
                    </span>
                  </div>
                  
                  {ticket.lastMessageSnippet && (
                    <p className={cn("mb-2 truncate text-left text-[13px]", hasUnread ? "text-ink-800 font-medium" : "text-ink-500")}>
                      {ticket.lastMessageSnippet}
                    </p>
                  )}
                  
                  <div className="text-ink-500 mb-2 text-[12px]">
                    #{ticket.ticketNumber} • <span>{t(CATEGORY_LABEL_KEYS[ticket.category])}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center gap-1.5 text-[12px] font-medium", ticket.priority === "urgent" ? "text-rose-600 dark:text-rose-400" : "text-ink-600")}>
                        <div className={cn("size-2 rounded-full", getPriorityDot(ticket.priority))} />
                        <span>{t(PRIORITY_LABEL_KEYS[ticket.priority])}</span>
                      </div>
                    </div>
                    {ticket.assignedToName ? (
                      <div className="text-ink-500 flex items-center gap-1.5 text-[11px] font-medium">
                        <div className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          {ticket.assignedToName.charAt(0).toUpperCase()}
                        </div>
                        <span className="max-w-[100px] truncate">{ticket.assignedToName}</span>
                      </div>
                    ) : (
                      <div className="border-ink-300 bg-ink-50 text-ink-500 rounded-md border border-dashed px-2 py-0.5 text-[11px] font-medium">
                        {t("admin.support.unassigned")}
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
        <div className="border-ink-200 flex items-center justify-between border-t p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.pageIndex <= 1}
            onClick={() => onFiltersChange({ ...filters, pageIndex: filters.pageIndex - 1 })}
          >
            {t("admin.support.previous")}
          </Button>
          <span className="text-ink-500 text-xs">
            {t("admin.support.pageOf", { page: filters.pageIndex, total: data.totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.pageIndex >= data.totalPages}
            onClick={() => onFiltersChange({ ...filters, pageIndex: filters.pageIndex + 1 })}
          >
            {t("admin.support.next")}
          </Button>
        </div>
      )}
    </div>
  );
};

function formatRelativeDate(value: string) {
  const t = i18n.t.bind(i18n);
  const date = new Date(value);
  const differenceMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (differenceMinutes < 1) return t("admin.support.justNow");
  if (differenceMinutes < 60) return t("admin.support.minAgo", { count: differenceMinutes });
  if (differenceMinutes < 1_440) return t("admin.support.hrAgo", { count: Math.floor(differenceMinutes / 60) });
  if (differenceMinutes < 2_880) return t("admin.support.yesterday");
  return new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(date);
}
