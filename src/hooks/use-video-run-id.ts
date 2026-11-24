"use client";

import { useSearchParams } from "next/navigation";

import { useWorkflowStore } from "@/stores/workflow";

export const useVideoRunId = () => {
  const urlRunId = useSearchParams().get("run");
  const storedRunId = useWorkflowStore((state) => state.videoRunId);
  return urlRunId ?? storedRunId;
};
