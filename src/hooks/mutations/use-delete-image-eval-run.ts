"use client";

import { adminImageQualityKeys, deleteAdminImageEvalRun } from "@/api/admin-image-quality";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { ImageEvalRunSummary } from "@/types/admin-image-quality";

export const useDeleteImageEvalRun = () => {
  const queryClient = useAppQueryClient();

  return useMutation<void, string>({
    mutationFn: deleteAdminImageEvalRun,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ImageEvalRunSummary[]>(adminImageQualityKeys.runs(), (runs) =>
        (runs ?? []).filter((run) => run.id !== id)
      );
      queryClient.removeQueries({ queryKey: adminImageQualityKeys.run(id) });
      showToast("success", "The evaluation run was deleted.");
    },
  });
};
