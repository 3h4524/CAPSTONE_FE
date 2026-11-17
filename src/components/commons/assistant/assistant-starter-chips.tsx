"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { getAssistantStarterChips } from "@/helpers/assistant-starter-chips";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useWorkflowStore } from "@/stores/workflow";

export const AssistantStarterChips = () => {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const { send, isStreaming } = useAssistantChat();
  const chips = useWorkflowStore(useShallow((state) => getAssistantStarterChips(pathname, state)));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t("commons.assistant.starterIntro")}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <AssistantChip key={chip} label={chip} disabled={isStreaming} onClick={() => send(chip)} />
        ))}
      </div>
    </div>
  );
};
