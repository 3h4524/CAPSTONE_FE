"use client";

import { useState } from "react";

import type { WorkflowNodeStatus } from "@/types/workflow";

export const useStatusPop = (status: WorkflowNodeStatus) => {
  const [previous, setPrevious] = useState(status);
  const [popping, setPopping] = useState(false);

  if (status !== previous) {
    setPrevious(status);
    setPopping(previous === "running" && status === "success");
  }

  return { popping, endPop: () => setPopping(false) };
};
