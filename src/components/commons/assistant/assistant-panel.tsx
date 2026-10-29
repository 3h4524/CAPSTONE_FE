"use client";

import { type CSSProperties, useEffect } from "react";

import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { AssistantHeader } from "@/components/commons/assistant/assistant-header";
import { AssistantMessageList } from "@/components/commons/assistant/assistant-message-list";
import { Sheet, SheetContent, SheetDescription } from "@/components/ui/sheet";
import {
  ASSISTANT_PANEL_DEFAULT_WIDTH_PX,
  ASSISTANT_PANEL_MAX_WIDTH_PX,
  ASSISTANT_PANEL_MIN_WIDTH_PX,
  ASSISTANT_PANEL_RESERVED_WIDTH_PX,
  ASSISTANT_PANEL_STORAGE_KEY,
} from "@/constants/assistant";
import { useResizableWidth } from "@/hooks/use-resizable-width";
import { useAssistantStore } from "@/stores/assistant";
import { cn } from "@/utils/cn";

export const AssistantPanel = () => {
  const isOpen = useAssistantStore((state) => state.isOpen);
  const setOpen = useAssistantStore((state) => state.setOpen);
  const setPanelWidth = useAssistantStore((state) => state.setPanelWidth);
  const { width, isDragging, separatorProps } = useResizableWidth({
    storageKey: ASSISTANT_PANEL_STORAGE_KEY,
    defaultWidth: ASSISTANT_PANEL_DEFAULT_WIDTH_PX,
    minWidth: ASSISTANT_PANEL_MIN_WIDTH_PX,
    maxWidth: ASSISTANT_PANEL_MAX_WIDTH_PX,
    reservedWidth: ASSISTANT_PANEL_RESERVED_WIDTH_PX,
  });

  useEffect(() => {
    setPanelWidth(width);
  }, [width, setPanelWidth]);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen} modal={false}>
      <SheetContent
        side="right"
        style={{ "--assistant-width": `${width}px` } as CSSProperties}
        className={cn("flex w-full flex-col gap-0 p-0 sm:w-(--assistant-width) sm:max-w-none", isDragging && "select-none")}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div
          {...separatorProps}
          aria-label="Resize the assistant"
          title="Drag to resize, double-click to reset"
          className={cn(
            "group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-none sm:block",
            "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:transition-colors",
            "hover:after:bg-primary/40 focus-visible:after:bg-primary/60",
            isDragging && "after:bg-primary"
          )}
        />
        <AssistantHeader />
        <SheetDescription className="sr-only">Ask questions or get help with your workflows.</SheetDescription>
        <AssistantMessageList />
        <AssistantComposer />
      </SheetContent>
    </Sheet>
  );
};
