"use client";

import { useEffect, useState } from "react";

import type { TestReportRun } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

const formatStaticDuration = (durationMs: number) => {
  if (durationMs <= 0) return "—";
  if (durationMs < 1000) return `${durationMs} ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
};

const formatElapsed = (seconds: number) => {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

type TestReportRunTookProps = {
  run: TestReportRun;
  className?: string;
};

export const TestReportRunTook = ({ run, className }: TestReportRunTookProps) => {
  const isRunning = run.status === "running";
  const [elapsedSeconds, setElapsedSeconds] = useState(1);

  useEffect(() => {
    if (!isRunning) return;

    const startedMs = new Date(run.startedAtUtc).getTime();
    const tick = () =>
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedMs) / 1000)));

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, run.startedAtUtc]);

  return (
    <span className={cn(isRunning && "font-mono text-sky-600", className)}>
      {isRunning ? formatElapsed(elapsedSeconds) : formatStaticDuration(run.durationMs)}
    </span>
  );
};
