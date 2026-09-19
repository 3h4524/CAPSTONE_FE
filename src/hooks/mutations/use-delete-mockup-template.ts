"use client";

import { deleteMockupTemplate, mockupTemplateKeys } from "@/api/mockup-templates";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useDeleteMockupTemplate = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMockupTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", "The mock-up template was deleted.");
    },
  });
};
