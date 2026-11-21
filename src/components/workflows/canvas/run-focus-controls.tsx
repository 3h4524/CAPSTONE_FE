"use client";

import { PanelsTopLeft, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useRunFocus } from "@/hooks/use-run-focus";
import { useRunSimulation } from "@/hooks/use-run-simulation";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore } from "@/stores/workflow-command";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";
import { uuid } from "@/utils/uuid";

export const RunFocusControls = () => {
  const { t } = useTranslation("common");
  const { active, focused, canStop } = useRunFocus();
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const requestCommand = useWorkflowCommandStore((state) => state.request);
  const setPanelsRevealed = useWorkflowRunViewStore((state) => state.setPanelsRevealed);
  const { active: simulating, stop: stopSimulation } = useRunSimulation();
  if (!active || !focused) return null;

  const stop = () => {
    if (simulating) stopSimulation();
    else if (workflowId) requestCommand({ id: uuid(), workflowId, kind: "stop" });
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 absolute top-3 right-3 z-10 flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-card shadow-md"
        onClick={() => setPanelsRevealed(true)}
      >
        <PanelsTopLeft aria-hidden="true" />
        <span className="hidden sm:inline">{t("workflowEditor.runView.showPanels")}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-card shadow-md"
        disabled={!canStop || !workflowId}
        onClick={stop}
      >
        <Square aria-hidden="true" />
        {t("workflowEditor.runView.stop")}
      </Button>
    </div>
  );
};
