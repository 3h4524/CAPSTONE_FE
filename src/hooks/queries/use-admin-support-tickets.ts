import type {
  AdminTicketFilters} from "@/api/admin-support";
import {
  getAdminSupportTicket,
  getAdminSupportTickets,
} from "@/api/admin-support";
import type { PagedResult, SupportTicketDetail, SupportTicketSummary } from "@/types/support";
import { useQuery } from "@tanstack/react-query";

export const adminSupportTicketsKeys = {
  all: ["admin-support-tickets"] as const,
  lists: () => [...adminSupportTicketsKeys.all, "list"] as const,
  list: (filters: AdminTicketFilters) => [...adminSupportTicketsKeys.lists(), filters] as const,
  details: () => [...adminSupportTicketsKeys.all, "detail"] as const,
  detail: (id: string) => [...adminSupportTicketsKeys.details(), id] as const,
};

export const useAdminSupportTickets = (filters: AdminTicketFilters) => {
  return useQuery<PagedResult<SupportTicketSummary>, Error>({
    queryKey: adminSupportTicketsKeys.list(filters),
    queryFn: () => getAdminSupportTickets(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useAdminSupportTicketDetail = (id?: string) => {
  return useQuery<SupportTicketDetail, Error>({
    queryKey: adminSupportTicketsKeys.detail(id!),
    queryFn: () => getAdminSupportTicket(id!),
    enabled: Boolean(id),
  });
};
