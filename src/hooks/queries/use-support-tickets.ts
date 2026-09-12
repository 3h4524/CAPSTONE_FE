"use client";

import { listSupportTickets, supportTicketKeys } from "@/api/support-tickets";
import { useQuery } from "@/hooks/queries/use-query";
import type { TicketFilters } from "@/types/support";

export const useSupportTickets = (filters: TicketFilters, enabled = true) =>
  useQuery({
    queryKey: supportTicketKeys.list(filters),
    queryFn: () => listSupportTickets(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
