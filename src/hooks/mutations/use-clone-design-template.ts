"use client";

import { cloneDesignTemplate, designTemplateKeys } from "@/api/design-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useCloneDesignTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cloneDesignTemplate,
    onSuccess: async (template) => {
      queryClient.setQueryData(designTemplateKeys.detail(template.id), template);
      await queryClient.invalidateQueries({
        queryKey: designTemplateKeys.listsByScope("personal"),
      });
    },
  });
};
