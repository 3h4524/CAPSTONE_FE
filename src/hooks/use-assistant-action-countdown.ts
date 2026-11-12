"use client";

import { useEffect, useState } from "react";

import { ASSISTANT_ACTION_COUNTDOWN_TICK_MS } from "@/constants/assistant";

export const useAssistantActionCountdown = (expiresAt: string, isActive: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  const expiresAtMs = Date.parse(expiresAt);
  const hasExpiry = Number.isFinite(expiresAtMs);
  const remainingMs = hasExpiry ? Math.max(0, expiresAtMs - now) : null;
  const isExpired = remainingMs === 0;

  useEffect(() => {
    if (!isActive || !hasExpiry || isExpired) return;
    const timer = window.setInterval(() => setNow(Date.now()), ASSISTANT_ACTION_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(timer);
  }, [isActive, hasExpiry, isExpired]);

  return { remainingMs, isExpired };
};
