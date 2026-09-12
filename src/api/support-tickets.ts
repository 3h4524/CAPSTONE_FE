import { api } from "@/api/client";
import type {
  CreateTicketInput,
  PagedResult,
  ReplyTicketInput,
  SupportTicketDetail,
  SupportTicketReply,
  SupportTicketSummary,
  TicketFilters,
} from "@/types/support";

export const supportTicketKeys = {
  all: ["support-tickets"] as const,
  list: (filters: TicketFilters) => [...supportTicketKeys.all, "list", filters] as const,
  detail: (id: string) => [...supportTicketKeys.all, "detail", id] as const,
};

const appendFiles = (form: FormData, attachments: File[]) => {
  attachments.forEach((file) => form.append("attachments", file, file.name));
};

export const listSupportTickets = async (
  filters: TicketFilters
): Promise<PagedResult<SupportTicketSummary>> => {
  const { data } = await api.get<PagedResult<SupportTicketSummary>>("/api/support-tickets", {
    params: filters,
  });
  return data;
};

export const getSupportTicket = async (id: string): Promise<SupportTicketDetail> => {
  const { data } = await api.get<SupportTicketDetail>(`/api/support-tickets/${id}`);
  return data;
};

export const createSupportTicket = async (
  input: CreateTicketInput
): Promise<SupportTicketSummary> => {
  const form = new FormData();
  form.append("subject", input.subject);
  form.append("category", input.category);
  form.append("priority", input.priority);
  form.append("description", input.description);
  appendFiles(form, input.attachments);

  const { data } = await api.post<SupportTicketSummary>("/api/support-tickets", form);
  return data;
};

export const replySupportTicket = async (input: ReplyTicketInput): Promise<SupportTicketReply> => {
  const form = new FormData();
  form.append("replyText", input.replyText);
  appendFiles(form, input.attachments);

  const { data } = await api.post<SupportTicketReply>(
    `/api/support-tickets/${input.id}/replies`,
    form
  );
  return data;
};

export const rateSupportTicket = async ({
  id,
  rating,
}: {
  id: string;
  rating: number;
}): Promise<SupportTicketSummary> => {
  const { data } = await api.put<SupportTicketSummary>(
    `/api/support-tickets/${id}/satisfaction-rating`,
    { rating }
  );
  return data;
};
