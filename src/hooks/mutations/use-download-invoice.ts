"use client";

import { downloadInvoiceRequest } from "@/api/subscription";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useDownloadInvoice = () =>
  useMutation({
    mutationFn: downloadInvoiceRequest,
    // MSG65/MSG66 verbatim text (not found / generation failed) already surfaces via the
    // default error toast — no inline UI needed for a background download action.
  });
