"use client";

import React, { Suspense,useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { AdminTicketFilters } from "@/api/admin-support";
import { AdminShell } from "@/components/admin/admin-shell";
import { TicketDetailPanel } from "@/components/admin/support/ticket-detail-panel";
import { TicketListPanel } from "@/components/admin/support/ticket-list-panel";
import { cn } from "@/utils/cn";

function AdminSupportTicketsContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AdminTicketFilters>({
    pageIndex: 1,
    pageSize: 20,
    status: "open",
  });
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const ticketId = searchParams?.get("ticketId");
    if (ticketId) {
      setSelectedTicketId(ticketId);
    }
  }, [searchParams]);

  const handleFiltersChange = (newFilters: AdminTicketFilters) => {
    setFilters(newFilters);
    // Optional: Reset selected ticket if tab changes, but usually keep it if possible
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
    setIsExpanded(false);
  };

  return (
    <AdminShell pageTitle="support-tickets" fillsPhoneScreen hidesPhoneTabs={selectedTicketId !== null}>
      <div className="border-ink-200 bg-card flex h-[calc(100dvh-150px)] w-full overflow-hidden rounded-lg border shadow-sm max-md:h-auto max-md:min-h-0 max-md:flex-1 max-md:rounded-none max-md:border-0 max-md:shadow-none">
        <div className="divide-ink-200 grid h-full min-h-0 w-full grid-cols-12 divide-x">
          {/* Left Panel: Ticket List. Below md the two panels swap: list first, then the selected ticket. */}
          <div
            className={cn(
              "h-full min-h-0 flex-col overflow-hidden",
              isExpanded ? "hidden" : "col-span-12 md:col-span-4 md:flex",
              !isExpanded && (selectedTicketId ? "hidden" : "flex")
            )}
          >
            <TicketListPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
            />
          </div>

          {/* Right Panel: Ticket Detail (Chat) */}
          <div
            className={cn(
              "h-full min-h-0 flex-col overflow-hidden md:flex",
              isExpanded ? "col-span-12" : "col-span-12 md:col-span-8",
              selectedTicketId || isExpanded ? "flex" : "hidden"
            )}
          >
            <TicketDetailPanel
              ticketId={selectedTicketId}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
              onBack={handleBackToList}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminSupportTicketsPage() {
  return (
    <Suspense fallback={null}>
      <AdminSupportTicketsContent />
    </Suspense>
  );
}
