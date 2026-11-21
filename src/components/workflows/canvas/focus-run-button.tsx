"use client";

import { Focus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useRunFocus } from "@/hooks/use-run-focus";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";

export const FocusRunButton = () => {
  const { t } = useTranslation("common");
  const { active } = useRunFocus();
  const panelsRevealed = useWorkflowRunViewStore((state) => state.panelsRevealed);
  const setPanelsRevealed = useWorkflowRunViewStore((state) => state.setPanelsRevealed);
  if (!active || !panelsRevealed) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="bg-card animate-in fade-in absolute top-3 right-3 z-10 shadow-md"
      onClick={() => setPanelsRevealed(false)}
    >
      <Focus aria-hidden="true" />
      <span className="hidden sm:inline">{t("workflowEditor.runView.focusRun")}</span>
    </Button>
  );
};
