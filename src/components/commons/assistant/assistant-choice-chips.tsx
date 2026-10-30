"use client";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantChoices } from "@/types/assistant";

type AssistantChoiceChipsProps = {
  messageId: string;
  choices: AssistantChoices;
  choicesUsed: boolean;
};

export const AssistantChoiceChips = ({ messageId, choices, choicesUsed }: AssistantChoiceChipsProps) => {
  const { send, isStreaming } = useAssistantChat();
  const markChoicesUsed = useAssistantStore((state) => state.markChoicesUsed);

  const choose = (value: string) => {
    markChoicesUsed(messageId);
    send(value);
  };

  return (
    <div className="flex flex-col gap-2">
      {choices.question ? <p className="text-sm">{choices.question}</p> : null}
      <div className="flex flex-wrap gap-2">
        {choices.options.map((option) => (
          <AssistantChip
            key={option.value}
            label={option.label}
            disabled={choicesUsed || isStreaming}
            onClick={() => choose(option.value)}
          />
        ))}
      </div>
    </div>
  );
};
