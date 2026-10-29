"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { ASSISTANT_STARTER_CHIPS } from "@/constants/assistant";
import { useAssistantChat } from "@/hooks/use-assistant-chat";

export const AssistantStarterChips = () => {
  const pathname = usePathname();
  const { send, isStreaming } = useAssistantChat();
  const chips = ASSISTANT_STARTER_CHIPS.find((group) => group.match(pathname))?.chips ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">Ask me anything, or try one of these.</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <AssistantChip key={chip} label={chip} disabled={isStreaming} onClick={() => send(chip)} />
        ))}
      </div>
    </div>
  );
};
