import { api } from "@/api/client";
import type {
  BillingCycle,
  CheckoutStatus,
  DowngradeResult,
  PendingCheckout,
  SubscriptionOverview,
  UpgradeResult,
} from "@/types/subscription";

export const getSubscriptionOverviewRequest = async (): Promise<SubscriptionOverview> => {
  const { data } = await api.get<SubscriptionOverview>("/api/subscriptions/overview");
  return data;
};

export type CheckoutPayload = {
  planId: string;
  billingCycle: BillingCycle;
};

export const checkoutRequest = async (payload: CheckoutPayload): Promise<PendingCheckout> => {
  const { data } = await api.post<PendingCheckout>("/api/subscriptions/checkout", payload);
  return data;
};

export const getCheckoutStatusRequest = async (invoiceId: string): Promise<CheckoutStatus> => {
  const { data } = await api.get<CheckoutStatus>(
    `/api/subscriptions/checkout/${invoiceId}/status`
  );
  return data;
};

export const cancelCheckoutRequest = async (invoiceId: string): Promise<void> => {
  await api.post(`/api/subscriptions/checkout/${invoiceId}/cancel`);
};

export const upgradeRequest = async (planId: string): Promise<UpgradeResult> => {
  const { data } = await api.post<UpgradeResult>("/api/subscriptions/upgrade", { planId });
  return data;
};

export const downgradeRequest = async (planId: string): Promise<DowngradeResult> => {
  const { data } = await api.post<DowngradeResult>("/api/subscriptions/downgrade", { planId });
  return data;
};

export const cancelScheduledDowngradeRequest = async (): Promise<void> => {
  await api.post("/api/subscriptions/downgrade/cancel");
};

export type DownloadInvoicePayload = {
  invoiceId: string;
  invoiceNumber: string;
};

// Named by invoiceNumber client-side rather than parsing Content-Disposition, which the backend
// would otherwise need to expose via Access-Control-Expose-Headers for cross-origin reads.
export const downloadInvoiceRequest = async ({
  invoiceId,
  invoiceNumber,
}: DownloadInvoicePayload): Promise<void> => {
  const { data } = await api.get<Blob>(`/api/subscriptions/invoices/${invoiceId}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
