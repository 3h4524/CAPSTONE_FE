"use client";

import { useListingLive } from "@/hooks/use-listing-live";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";

const NEEDS_PERSON = ["waiting_for_input", "waiting_for_review", "failed"];

export const useRunFocus = () => {
  const effects = useRunEffects();
  const listingLive = useListingLive();
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const needsPerson = useWorkflowStore((state) => state.nodes.some((node) => NEEDS_PERSON.includes(node.data.status)));
  const panelsRevealed = useWorkflowRunViewStore((state) => state.panelsRevealed);
  const active = effects && (isRunning || listingLive);
  return { active, focused: active && !needsPerson && !panelsRevealed, canStop: isRunning };
};
