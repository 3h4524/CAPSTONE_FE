export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory =
  | "integration"
  | "ai_generation"
  | "batch_processing"
  | "export_publishing"
  | "billing_subscription"
  | "account_security"
  | "other";

export type SupportTicketSummary = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  satisfactionRating: number | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type SupportTicketAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeMb: number;
  downloadUrl: string;
  downloadUrlExpiresAtUtc: string;
};

export type SupportTicketReply = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "Seller" | "Admin";
  replyText: string;
  isInternalNote: boolean;
  createdAtUtc: string;
  attachments: SupportTicketAttachment[];
};

export type SupportTicketDetail = SupportTicketSummary & {
  description: string;
  requesterId: string;
  requesterName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  resolvedAtUtc: string | null;
  attachments: SupportTicketAttachment[];
  replies: SupportTicketReply[];
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type TicketFilters = {
  pageNumber: number;
  pageSize: number;
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
};

export type CreateTicketInput = {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  attachments: File[];
};

export type ReplyTicketInput = {
  id: string;
  replyText: string;
  attachments: File[];
};
