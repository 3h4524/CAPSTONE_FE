"use client";

import { X } from "lucide-react";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Button } from "@/components/ui/button";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantRunNudge } from "@/hooks/use-assistant-run-nudge";
import type { AssistantRunNudge } from "@/types/assistant";
import { cn } from "@/utils/cn";

const TONE_CLASS: Record<AssistantRunNudge["tone"], string> = {
  action: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  problem: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  done: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
};

export const AssistantRunNudgeBar = () => {
  const { nudge, dismiss } = useAssistantRunNudge();
  const { send, isStreaming } = useAssistantChat();

  if (!nudge) return null;

  const ask = () => {
    dismiss();
    send(nudge.prompt);
  };

  return (
    <div role="status" className={cn("mx-3 mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", TONE_CLASS[nudge.tone])}>
      <p className="min-w-0 flex-1 font-medium">{nudge.label}</p>
      <AssistantChip label="What now?" variant="outline" disabled={isStreaming} onClick={ask} />
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss" className="size-6" onClick={dismiss}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
};
