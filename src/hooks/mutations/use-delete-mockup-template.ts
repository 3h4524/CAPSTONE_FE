"use client";

import { deleteMockupTemplate, mockupTemplateKeys, type MockupTemplateScope } from "@/api/mockup-templates";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useDeleteMockupTemplate = (scope: MockupTemplateScope = "seller") => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMockupTemplate(id, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", "The mock-up template was deleted.");
    },
  });
};
