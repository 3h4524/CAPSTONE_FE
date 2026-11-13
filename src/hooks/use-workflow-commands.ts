"use client";

import { useEffect, useRef } from "react";

import { showWorkflowActionToast } from "@/helpers/toast";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore,type WorkflowCommand } from "@/stores/workflow-command";

type WorkflowCommandHandlers = {
  save: (options?: { onSaved?: () => void }) => void;
  run: () => void;
  continueRun: (command: WorkflowCommand) => void;
};

export const useWorkflowCommands = (
  activeWorkflowId: string | null,
  isEditorReady: boolean,
  isBusy: boolean,
  handlers: WorkflowCommandHandlers
) => {
  const command = useWorkflowCommandStore((state) => state.command);
  const clear = useWorkflowCommandStore((state) => state.clear);
  const latest = useRef(handlers);
  const busy = useRef(isBusy);

  useEffect(() => {
    latest.current = handlers;
    busy.current = isBusy;
  });

  useEffect(() => {
    if (!command || !isEditorReady || command.workflowId !== activeWorkflowId) return;
    clear(command.id);
    if (command.kind === "continue") {
      latest.current.continueRun(command);
      return;
    }
    if (busy.current) {
      showWorkflowActionToast("warning", "The workflow is busy. Try again when the current step finishes.");
      return;
    }
    if (command.kind === "save") {
      latest.current.save();
      return;
    }
    if (useWorkflowStore.getState().isDirty) {
      latest.current.save({ onSaved: () => latest.current.run() });
      return;
    }
    latest.current.run();
  }, [command, isEditorReady, activeWorkflowId, clear]);
};
