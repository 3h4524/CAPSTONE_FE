import { api } from "@/api/client";
import type { FeatureCatalogItem } from "@/types/feature-catalog";
import type {
  BillingCycle,
  CheckoutStatus,
  DowngradeResult,
  Entitlements,
  PendingCheckout,
  SubscriptionOverview,
  TrialResult,
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

// A PayOS checkout for the next cycle of the current paid plan, polled like a Buy checkout.
export const renewRequest = async (): Promise<PendingCheckout> => {
  const { data } = await api.post<PendingCheckout>("/api/subscriptions/renew");
  return data;
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

export const startTrialRequest = async (): Promise<TrialResult> => {
  const { data } = await api.post<TrialResult>("/api/subscriptions/trial");
  return data;
};

export const getEntitlementsRequest = async (): Promise<Entitlements> => {
  const { data } = await api.get<Entitlements>("/api/subscriptions/entitlements");
  return data;
};

export const getFeatureCatalogRequest = async (): Promise<FeatureCatalogItem[]> => {
  const { data } = await api.get<FeatureCatalogItem[]>("/api/subscriptions/features");
  return data;
};

export type DownloadInvoicePayload = {
  invoiceId: string;
  invoiceNumber: string;
};

// Named by invoiceNumber client-side rather than parsing Content-Disposition, which the backend
// would otherwise need to expose via Access-Control-Expose-Headers for cross-origin reads.
// Opens an invoice's PDF in a new tab. The tab is opened before the download, while the click
// still counts as the Seller's own action, so the browser does not block it as a pop-up.
export const viewInvoiceRequest = async ({ invoiceId }: Pick<DownloadInvoicePayload, "invoiceId">): Promise<void> => {
  const tab = window.open("", "_blank");
  try {
    const { data } = await api.get<Blob>(`/api/subscriptions/invoices/${invoiceId}/download`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    // Long enough for the tab to load the PDF before the address is released.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
};

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
