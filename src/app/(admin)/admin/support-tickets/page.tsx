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

  return (
    <AdminShell pageTitle="support-tickets">
      <div className="flex h-[calc(100vh-150px)] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid h-full min-h-0 w-full grid-cols-12 divide-x divide-slate-200">
          {/* Left Panel: Ticket List */}
          <div className={cn("hidden h-full min-h-0 flex-col overflow-hidden", isExpanded ? "hidden" : "col-span-4 md:flex")}>
            <TicketListPanel 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
            />
          </div>

          {/* Right Panel: Ticket Detail (Chat) */}
          <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", isExpanded ? "col-span-12" : "col-span-12 md:col-span-8")}>
            <TicketDetailPanel 
              ticketId={selectedTicketId} 
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
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
