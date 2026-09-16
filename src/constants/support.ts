import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/support";

export const SUPPORT_CATEGORIES: ReadonlyArray<{ value: TicketCategory; label: string }> = [
  { value: "integration", label: "Integration" },
  { value: "ai_generation", label: "AI generation" },
  { value: "batch_processing", label: "Batch processing" },
  { value: "export_publishing", label: "Export & publishing" },
  { value: "billing_subscription", label: "Billing & subscription" },
  { value: "account_security", label: "Account & security" },
  { value: "other", label: "Other" },
];

export const SUPPORT_PRIORITIES: ReadonlyArray<{ value: TicketPriority; label: string }> = [
  { value: "low", label: "Low — general question or minor issue" },
  { value: "normal", label: "Medium — feature not working as expected" },
  { value: "high", label: "High — work is significantly blocked" },
  { value: "urgent", label: "Urgent — outage, security, or payment blocked" },
];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_customer: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const CATEGORY_LABELS = Object.fromEntries(
  SUPPORT_CATEGORIES.map((category) => [category.value, category.label])
) as Record<TicketCategory, string>;

export const SUPPORT_FILE_RULES = {
  maximumCount: 5,
  maximumFileBytes: 10 * 1024 * 1024,
  maximumTotalBytes: 25 * 1024 * 1024,
  extensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt", ".log"],
} as const;
