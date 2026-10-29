"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAssistantStore } from "@/stores/assistant";
import { cn } from "@/utils/cn";

export const AssistantLauncher = () => {
  const pathname = usePathname();
  const toggleOpen = useAssistantStore((state) => state.toggleOpen);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            aria-label="Open assistant"
            className={cn("fixed right-4 z-40 size-12 rounded-full shadow-lg", pathname === "/workflows" ? "bottom-44" : "bottom-4")}
            onClick={toggleOpen}
          >
            <Sparkles aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Ask the assistant</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
