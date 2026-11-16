"use client";

import { useTranslation } from "react-i18next";

import { getSubscriptionOverviewRequest } from "@/api/subscription";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const SUBSCRIPTION_OVERVIEW_QUERY_KEY = ["subscription-overview"];

export const useSubscriptionOverview = () => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: [...SUBSCRIPTION_OVERVIEW_QUERY_KEY, normalizeLocale(i18n.language)],
    queryFn: getSubscriptionOverviewRequest,
    // MSG16 verbatim: shown regardless of the real underlying error (network, 500, etc.).
    notifyError: { message: "Failed to load data. Please try again." },
  });
};
