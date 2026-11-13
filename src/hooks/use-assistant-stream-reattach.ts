"use client";

import { useEffect } from "react";

import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";

export const useAssistantStreamReattach = () => {
  const hasDetachedStream = useAssistantStore((state) => state.activeStream?.isAttached === false);
  const { attachToStreamingReply } = useAssistantChat();

  useEffect(() => {
    if (hasDetachedStream) attachToStreamingReply();
  }, [hasDetachedStream, attachToStreamingReply]);
};
