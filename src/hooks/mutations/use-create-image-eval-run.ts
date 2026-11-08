"use client";

import { adminImageQualityKeys, createAdminImageEvalRun } from "@/api/admin-image-quality";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { ImageEvalUploadInput } from "@/schemas/image-eval";
import type { ImageEvalRunSummary } from "@/types/admin-image-quality";

export const useCreateImageEvalRun = () => {
  const queryClient = useAppQueryClient();

  return useMutation<ImageEvalRunSummary, ImageEvalUploadInput>({
    mutationFn: createAdminImageEvalRun,
    onSuccess: (run) => {
      queryClient.setQueryData<ImageEvalRunSummary[]>(adminImageQualityKeys.runs(), (runs) => [
        run,
        ...(runs ?? []).filter((item) => item.id !== run.id),
      ]);
      showToast("success", `“${run.name}” was added with ${run.imageCount} scored images.`);
    },
  });
};
