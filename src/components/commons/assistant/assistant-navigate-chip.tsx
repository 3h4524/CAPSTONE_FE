"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { ASSISTANT_NAVIGATION_PATTERNS } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantNavigatePayload } from "@/types/assistant";

const MOBILE_BREAKPOINT_PX = 640;

type AssistantNavigateChipProps = {
  payload: AssistantNavigatePayload;
};

export const AssistantNavigateChip = ({ payload }: AssistantNavigateChipProps) => {
  const router = useRouter();
  const setOpen = useAssistantStore((state) => state.setOpen);

  if (!ASSISTANT_NAVIGATION_PATTERNS.some((pattern) => pattern.test(payload.path))) return null;

  const navigate = () => {
    router.push(payload.path);
    if (window.innerWidth < MOBILE_BREAKPOINT_PX) setOpen(false);
  };

  return <AssistantChip label={payload.label} icon={<ArrowUpRight aria-hidden="true" />} onClick={navigate} />;
};
