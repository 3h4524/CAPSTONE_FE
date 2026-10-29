"use client";

import { AssistantComposer } from "@/components/commons/assistant/assistant-composer";
import { AssistantHeader } from "@/components/commons/assistant/assistant-header";
import { AssistantMessageList } from "@/components/commons/assistant/assistant-message-list";
import { Sheet, SheetContent, SheetDescription } from "@/components/ui/sheet";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantPanel = () => {
  const isOpen = useAssistantStore((state) => state.isOpen);
  const setOpen = useAssistantStore((state) => state.setOpen);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen} modal={false}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <AssistantHeader />
        <SheetDescription className="sr-only">Ask questions or get help with your workflows.</SheetDescription>
        <AssistantMessageList />
        <AssistantComposer />
      </SheetContent>
    </Sheet>
  );
};
