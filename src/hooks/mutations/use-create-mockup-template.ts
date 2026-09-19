"use client";

import { createMockupTemplate, mockupTemplateKeys, type SaveMockupTemplateInput } from "@/api/mockup-templates";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useCreateMockupTemplate = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: (input: SaveMockupTemplateInput) => createMockupTemplate(input),
    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", `${template.name} was created.`);
    },
  });
};
