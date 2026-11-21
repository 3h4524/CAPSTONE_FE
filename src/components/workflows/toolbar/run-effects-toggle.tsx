"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { loadRunEffectsEnabled, saveRunEffectsEnabled } from "@/helpers/workflow-run-effects";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";

export const RunEffectsToggle = () => {
  const { t } = useTranslation("common");
  const effectsEnabled = useWorkflowRunViewStore((state) => state.effectsEnabled);
  const setEffectsEnabled = useWorkflowRunViewStore((state) => state.setEffectsEnabled);
  const reduceMotion = Boolean(useReducedMotion());

  useEffect(() => {
    const stored = loadRunEffectsEnabled();
    if (stored !== null) setEffectsEnabled(stored);
  }, [setEffectsEnabled]);

  const toggleEffects = (next: boolean) => {
    setEffectsEnabled(next);
    saveRunEffectsEnabled(next);
  };

  return (
    <Label
      htmlFor="workflow-run-effects"
      title={reduceMotion ? t("workflowEditor.runView.reducedMotion") : t("workflowEditor.runView.effectsHint")}
      className="hover:bg-muted flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-medium"
    >
      <span>{t("workflowEditor.runView.effects")}</span>
      <Switch
        id="workflow-run-effects"
        size="sm"
        checked={effectsEnabled && !reduceMotion}
        disabled={reduceMotion}
        onCheckedChange={toggleEffects}
      />
    </Label>
  );
};
