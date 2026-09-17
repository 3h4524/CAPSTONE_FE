"use client";

import { downloadInvoiceRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useDownloadInvoice = () =>
  useMutation({
    mutationFn: downloadInvoiceRequest,
    // Not-found and generation errors already surface via the
    // default error toast — no inline UI needed for a background download action.
  });
