"use client";

import { getPrintifyConnection } from "@/api/printify";
import { getMyShop } from "@/api/shop";
import { printifyKey } from "@/components/shop/printify-card";
import type { ShopConnectionStatuses } from "@/helpers/shop-connections";
import { useQuery } from "@/hooks/queries/use-query";
import { useAuthStore } from "@/stores/auth";

// The Seller's Etsy and Printify connections, read only for the shops a workflow publishes to. Under the
// keys the Shop page uses, so connecting there refreshes the workflow too.
export const useShopConnections = ({ etsy, printify }: { etsy: boolean; printify: boolean }): ShopConnectionStatuses => {
  const userId = useAuthStore((state) => state.user?.id);
  const shop = useQuery({
    queryKey: ["my-shop", userId],
    queryFn: getMyShop,
    enabled: etsy && Boolean(userId),
    staleTime: 60_000,
    suppressErrorToast: true,
  });
  const printifyConnection = useQuery({
    queryKey: printifyKey(userId),
    queryFn: () => getPrintifyConnection(),
    enabled: printify && Boolean(userId),
    staleTime: 60_000,
    suppressErrorToast: true,
  });
  return {
    etsy: etsy ? shop.data?.status : undefined,
    printify: printify ? printifyConnection.data?.status : undefined,
  };
};
