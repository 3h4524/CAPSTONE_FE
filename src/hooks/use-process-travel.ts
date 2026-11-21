"use client";

import { useState } from "react";

export type ProcessTravel = "idle" | "travelling" | "arrived";

export const useProcessTravel = (passed: boolean, animate: boolean) => {
  const [previousPassed, setPreviousPassed] = useState(passed);
  const [travel, setTravel] = useState<ProcessTravel>(passed ? "arrived" : "idle");

  if (passed !== previousPassed) {
    setPreviousPassed(passed);
    setTravel(passed ? (animate ? "travelling" : "arrived") : "idle");
  }

  return { travel, arrive: () => setTravel("arrived") };
};
