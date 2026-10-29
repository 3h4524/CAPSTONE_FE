"use client";

import { designTemplateKeys, updateDesignTemplate } from "@/api/design-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useUpdateDesignTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDesignTemplate,
    onSuccess: async (template) => {
      queryClient.setQueryData(designTemplateKeys.detail(template.id), template);
      await queryClient.invalidateQueries({
        queryKey: designTemplateKeys.listsByScope("personal"),
      });
    },
  });
};
