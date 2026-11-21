"use client";

import { useReducedMotion } from "motion/react";

import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";

export const useRunEffects = () => {
  const effectsEnabled = useWorkflowRunViewStore((state) => state.effectsEnabled);
  const reduceMotion = useReducedMotion();
  return effectsEnabled && !reduceMotion;
};
