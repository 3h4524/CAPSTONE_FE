"use client";

import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ASSISTANT_LAUNCHER_SIZE_PX } from "@/constants/assistant";
import { useAssistantLauncherDrag } from "@/hooks/use-assistant-launcher-drag";
import { useAssistantRunNudge } from "@/hooks/use-assistant-run-nudge";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantLauncher = () => {
  const pathname = usePathname();
  const toggleOpen = useAssistantStore((state) => state.toggleOpen);
  const isReplying = useAssistantStore((state) => state.streamingMessageId !== null);
  const { position, handlers, consumeClick } = useAssistantLauncherDrag(pathname);
  const { nudge } = useAssistantRunNudge();

  const handleClick = () => {
    if (consumeClick()) return;
    toggleOpen();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            aria-label="Open Podi"
            aria-describedby={isReplying ? "assistant-launcher-busy" : undefined}
            variant="outline"
            className="fixed z-40 cursor-grab touch-none overflow-hidden rounded-full p-0 shadow-lg transition-none active:cursor-grabbing"
            style={{ right: position.right, bottom: position.bottom, width: ASSISTANT_LAUNCHER_SIZE_PX, height: ASSISTANT_LAUNCHER_SIZE_PX }}
            onClick={handleClick}
            {...handlers}
          >
            <Bot className="text-primary size-6" aria-hidden="true" />
            {isReplying ? (
              <span id="assistant-launcher-busy" className="bg-primary ring-background absolute top-1.5 right-1.5 size-2.5 animate-pulse rounded-full ring-2">
                <span className="sr-only">Podi is replying</span>
              </span>
            ) : nudge ? (
              <span className="ring-background absolute top-1.5 right-1.5 size-2.5 rounded-full bg-amber-500 ring-2">
                <span className="sr-only">{nudge.label}</span>
              </span>
            ) : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">{nudge ? nudge.label : "Drag to move, click to chat with Podi"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
