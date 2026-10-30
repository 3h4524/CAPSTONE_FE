"use client";

import { usePathname } from "next/navigation";

import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { AssistantHeader } from "@/components/commons/assistant/assistant-header";
import { AssistantMessageList } from "@/components/commons/assistant/assistant-message-list";
import { Card } from "@/components/ui/card";
import { ASSISTANT_BUBBLE_GAP_PX, ASSISTANT_LAUNCHER_MARGIN_PX, ASSISTANT_LAUNCHER_SIZE_PX } from "@/constants/assistant";
import { isBubbleOpen } from "@/helpers/assistant-display-mode";
import { defaultLauncherPosition } from "@/helpers/assistant-launcher-position";
import { useAssistantStore } from "@/stores/assistant";
import { cn } from "@/utils/cn";

export const AssistantBubble = () => {
  const pathname = usePathname();
  const isOpen = useAssistantStore(isBubbleOpen);
  const isExpanded = useAssistantStore((state) => state.isBubbleExpanded);
  const launcherPosition = useAssistantStore((state) => state.launcherPosition);
  const setOpen = useAssistantStore((state) => state.setOpen);

  if (!isOpen) return null;

  const anchor = launcherPosition ?? defaultLauncherPosition(pathname);
  const bottom = anchor.bottom + ASSISTANT_LAUNCHER_SIZE_PX + ASSISTANT_BUBBLE_GAP_PX;

  return (
    <Card
      role="dialog"
      aria-label="Assistant"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className={cn(
        "fixed z-50 flex flex-col gap-0 overflow-hidden py-0 shadow-2xl",
        isExpanded ? "h-[85vh] w-[720px]" : "h-[560px] w-[380px]"
      )}
      style={{
        right: anchor.right,
        bottom,
        maxHeight: `calc(100vh - ${bottom + ASSISTANT_LAUNCHER_MARGIN_PX}px)`,
        maxWidth: `calc(100vw - ${anchor.right + ASSISTANT_LAUNCHER_MARGIN_PX}px)`,
      }}
    >
      <AssistantHeader variant="bubble" />
      <AssistantMessageList />
      <AssistantComposer />
    </Card>
  );
};
