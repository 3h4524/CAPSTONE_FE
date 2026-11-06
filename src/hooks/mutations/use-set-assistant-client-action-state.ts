"use client";

import { setAssistantClientActionState } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useSetAssistantClientActionState = () =>
  useMutation({ mutationFn: setAssistantClientActionState, suppressErrorToast: true });
