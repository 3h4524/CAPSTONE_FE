"use client";

import { getModelPhotoOptions, modelPhotoKeys, type ModelPhotoScope } from "@/api/model-photos";
import { useQuery } from "@/hooks/queries/use-query";

/**
 * Whether a mock-up can be put on a model photo without AI. The server decides; until it has answered, and if it
 * cannot, only the AI way is offered.
 */
export const usePrintWithoutAi = (scope: ModelPhotoScope = "seller") => {
  const { data } = useQuery({
    queryKey: modelPhotoKeys.options(scope),
    queryFn: () => getModelPhotoOptions(scope),
    staleTime: 30 * 60_000,
    suppressErrorToast: true,
  });
  return data?.printWithoutAi === true;
};
