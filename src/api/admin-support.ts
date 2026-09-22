import type {
  PagedResult,
  SupportTicketDetail,
  SupportTicketReply,
  SupportTicketSummary,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/types/support";

import { api } from "./client";

export type AdminTicketFilters = {
  pageIndex: number;
  pageSize: number;
  searchTerm?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
};

export const getAdminSupportTickets = async (
  filters: AdminTicketFilters
): Promise<PagedResult<SupportTicketSummary>> => {
  const params = new URLSearchParams();
  if (filters.pageIndex) params.append("pageIndex", filters.pageIndex.toString());
  if (filters.pageSize) params.append("pageSize", filters.pageSize.toString());
  if (filters.searchTerm) params.append("searchTerm", filters.searchTerm);
  if (filters.status) params.append("status", filters.status);
  if (filters.priority) params.append("priority", filters.priority);
  if (filters.category) params.append("category", filters.category);

  const { data } = await api.get<PagedResult<SupportTicketSummary>>(
    `/api/admin/support-tickets?${params.toString()}`
  );
  return data;
};

export const getAdminSupportTicket = async (id: string): Promise<SupportTicketDetail> => {
  const { data } = await api.get<SupportTicketDetail>(`/api/admin/support-tickets/${id}`);
  return data;
};

export const updateAdminSupportTicketStatus = async (params: {
  id: string;
  status: TicketStatus;
}): Promise<SupportTicketDetail> => {
  const { data } = await api.patch<SupportTicketDetail>(`/api/admin/support-tickets/${params.id}`, {
    status: params.status,
  });
  return data;
};

export const replyAdminSupportTicket = async (params: {
  id: string;
  replyText: string;
  isInternalNote: boolean;
  attachments?: File[];
}): Promise<SupportTicketReply> => {
  const formData = new FormData();
  formData.append("replyText", params.replyText);
  formData.append("isInternalNote", params.isInternalNote.toString());

  if (params.attachments && params.attachments.length > 0) {
    params.attachments.forEach((file) => {
      formData.append("attachments", file);
    });
  }

  const { data } = await api.post<SupportTicketReply>(
    `/api/admin/support-tickets/${params.id}/replies`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
};
