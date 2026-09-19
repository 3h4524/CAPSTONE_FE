"use client";

import { mockupTemplateKeys, type SaveMockupTemplateInput,updateMockupTemplate } from "@/api/mockup-templates";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export type UpdateMockupTemplateVariables = SaveMockupTemplateInput & { id: string };

export const useUpdateMockupTemplate = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMockupTemplateVariables) => updateMockupTemplate(id, input),
    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", `${template.name} was saved.`);
    },
  });
};
