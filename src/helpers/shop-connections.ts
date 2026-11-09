import type { PrintifyConnectionStatus } from "@/api/printify";
import type { ShopConnectionStatus } from "@/api/shop";

export const SHOP_PATH = "/shop";
export const API_KEYS_PATH = "/api-keys";

export type ShopConnectionStatuses = {
  etsy?: ShopConnectionStatus;
  printify?: PrintifyConnectionStatus;
};

export type ConnectionIssue = { message: string; href: string; linkLabel: string };

// What stops a publish step from running for the Seller's current connections. Nothing while a status is
// still loading, or when the shop is only not answering: the step can be retried then, so the run may start.
export const publishConnectionIssue = (nodeType: string, statuses: ShopConnectionStatuses): ConnectionIssue | null => {
  if (nodeType === "publish-printify") {
    switch (statuses.printify) {
      case "not_connected":
        return { message: "Printify is not connected. Add your Printify API key first.", href: API_KEYS_PATH, linkLabel: "Open API Keys" };
      case "key_invalid":
        return { message: "Your Printify API key is not working. Check or replace it.", href: API_KEYS_PATH, linkLabel: "Open API Keys" };
      case "no_store":
        return { message: "Your Printify account has no store. Create one on Printify and link it to Etsy.", href: SHOP_PATH, linkLabel: "Open Shop" };
      default:
        return null;
    }
  }
  if (nodeType === "publish-etsy") {
    switch (statuses.etsy) {
      case "not_connected":
        return { message: "Etsy is not connected. Connect your Etsy shop first.", href: SHOP_PATH, linkLabel: "Open Shop" };
      case "reconnect_required":
        return { message: "Your Etsy connection expired. Connect your Etsy shop again.", href: SHOP_PATH, linkLabel: "Open Shop" };
      default:
        return null;
    }
  }
  return null;
};
