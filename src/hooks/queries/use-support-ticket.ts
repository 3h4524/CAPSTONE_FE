"use client";

import { getSupportTicket, supportTicketKeys } from "@/api/support-tickets";
import { useQuery } from "@/hooks/queries/use-query";



export const useSupportTicket = (id: string | null) =>
  useQuery({
    queryKey: supportTicketKeys.detail(id ?? "closed"),
    queryFn: () => getSupportTicket(id as string),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
