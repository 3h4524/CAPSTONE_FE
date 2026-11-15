"use client";

import { useEffect, useRef } from "react";

import { ASSISTANT_PANEL_CONTINUE_TTL_MS } from "@/constants/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore } from "@/stores/workflow-command";

export const usePanelContinueCommand = (isReady: boolean, onContinue: () => void) => {
  const request = useWorkflowCommandStore((state) => state.panelContinue);
  const clear = useWorkflowCommandStore((state) => state.clearPanelContinue);
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const handler = useRef(onContinue);

  useEffect(() => {
    handler.current = onContinue;
  });

  useEffect(() => {
    if (!request || !isReady || request.workflowId !== workflowId) return;
    clear(request.id);
    if (Date.now() - request.requestedAt > ASSISTANT_PANEL_CONTINUE_TTL_MS) return;
    handler.current();
  }, [request, isReady, workflowId, clear]);
};
