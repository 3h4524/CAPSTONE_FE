import { api } from "@/api/client";
import type {
  BillingCycle,
  CheckoutStatus,
  PendingCheckout,
  SubscriptionOverview,
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
