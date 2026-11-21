"use client";

import { useEffect, useState } from "react";

import { WORKFLOW_EFFECT_STORAGE_KEY } from "@/constants/run-simulation";

export const useWorkflowEffectEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(WORKFLOW_EFFECT_STORAGE_KEY) === "true");
    } catch {
      setEnabled(false);
    }
  }, []);

  return enabled;
};
