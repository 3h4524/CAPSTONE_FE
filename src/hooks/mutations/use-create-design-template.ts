"use client";

import { createDesignTemplate, designTemplateKeys } from "@/api/design-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useQueryClient } from "@tanstack/react-query";

export const useCreateDesignTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDesignTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: designTemplateKeys.listsByScope("personal"),
      }),
  });
};
