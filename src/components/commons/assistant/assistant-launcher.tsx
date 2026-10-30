"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ASSISTANT_LAUNCHER_SIZE_PX, ASSISTANT_MASCOT_SRC } from "@/constants/assistant";
import { useAssistantLauncherDrag } from "@/hooks/use-assistant-launcher-drag";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantLauncher = () => {
  const pathname = usePathname();
  const toggleOpen = useAssistantStore((state) => state.toggleOpen);
  const { position, handlers, consumeClick } = useAssistantLauncherDrag(pathname);

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
            aria-label="Open assistant"
            variant="outline"
            className="fixed z-40 cursor-grab touch-none overflow-hidden rounded-full p-0 shadow-lg transition-none active:cursor-grabbing"
            style={{ right: position.right, bottom: position.bottom, width: ASSISTANT_LAUNCHER_SIZE_PX, height: ASSISTANT_LAUNCHER_SIZE_PX }}
            onClick={handleClick}
            {...handlers}
          >
            <Image
              src={ASSISTANT_MASCOT_SRC}
              alt=""
              width={ASSISTANT_LAUNCHER_SIZE_PX}
              height={ASSISTANT_LAUNCHER_SIZE_PX}
              unoptimized
              draggable={false}
              className="size-full object-cover [image-rendering:pixelated]"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Drag to move, click to chat</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
