"use client";

import React, { useState } from "react";

import type { AdminTicketFilters } from "@/api/admin-support";
import { AdminShell } from "@/components/admin/admin-shell";
import { TicketDetailPanel } from "@/components/admin/support/ticket-detail-panel";
import { TicketListPanel } from "@/components/admin/support/ticket-list-panel";

export default function AdminSupportTicketsPage() {
  const [filters, setFilters] = useState<AdminTicketFilters>({
    pageIndex: 1,
    pageSize: 20,
    status: "open",
  });
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const handleFiltersChange = (newFilters: AdminTicketFilters) => {
    setFilters(newFilters);
    // Optional: Reset selected ticket if tab changes, but usually keep it if possible
  };

  return (
    <AdminShell pageTitle="support-tickets">
      <div className="flex h-[calc(100vh-150px)] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid h-full min-h-0 w-full grid-cols-12 divide-x divide-slate-200">
          {/* Left Panel: Ticket List */}
          <div className="col-span-4 hidden h-full min-h-0 flex-col overflow-hidden md:flex">
            <TicketListPanel 
              filters={filters}
              onFiltersChange={handleFiltersChange}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
            />
          </div>

          {/* Right Panel: Ticket Detail (Chat) */}
          <div className="col-span-12 flex h-full min-h-0 flex-col overflow-hidden md:col-span-8">
            <TicketDetailPanel ticketId={selectedTicketId} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
