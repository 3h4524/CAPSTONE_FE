"use client";

import { searchRagWithDiagnostics } from "@/api/rag";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useSearchRagDiagnostics = () =>
  useMutation({
    mutationFn: searchRagWithDiagnostics,
    suppressErrorToast: true,
  });
