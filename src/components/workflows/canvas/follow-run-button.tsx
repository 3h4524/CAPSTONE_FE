"use client";

import { LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useListingLive } from "@/hooks/use-listing-live";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";

export const FollowRunButton = () => {
  const { t } = useTranslation("common");
  const effects = useRunEffects();
  const listingLive = useListingLive();
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const followPaused = useWorkflowRunViewStore((state) => state.followPaused);
  const setFollowPaused = useWorkflowRunViewStore((state) => state.setFollowPaused);
  if (!effects || !followPaused || !(isRunning || listingLive)) return null;

  return (
    <Button
      type="button"
      size="sm"
      className="animate-in fade-in slide-in-from-bottom-2 absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg"
      onClick={() => setFollowPaused(false)}
    >
      <LocateFixed aria-hidden="true" />
      {t("workflowEditor.runView.followRun")}
    </Button>
  );
};
