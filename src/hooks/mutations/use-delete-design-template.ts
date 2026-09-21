"use client";

import { deleteDesignTemplate, designTemplateKeys } from "@/api/design-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useDeleteDesignTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDesignTemplate,
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: designTemplateKeys.detail(id) });
      await queryClient.invalidateQueries({
        queryKey: designTemplateKeys.listsByScope("personal"),
      });
    },
  });
};
